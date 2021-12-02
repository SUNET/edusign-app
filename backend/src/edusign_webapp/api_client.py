# -*- coding: utf-8 -*-
#
# Copyright (c) 2020 SUNET
# All rights reserved.
#
#   Redistribution and use in source and binary forms, with or
#   without modification, are permitted provided that the following
#   conditions are met:
#
#     1. Redistributions of source code must retain the above copyright
#        notice, this list of conditions and the following disclaimer.
#     2. Redistributions in binary form must reproduce the above
#        copyright notice, this list of conditions and the following
#        disclaimer in the documentation and/or other materials provided
#        with the distribution.
#     3. Neither the name of the SUNET nor the names of its
#        contributors may be used to endorse or promote products derived
#        from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
# FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
# BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
# LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
#
"""
Client for the Signature Service Integration REST-Service [1].
==============================================================

The service has 2 sides: a REST API, and a sign service.

In what follows we will call "service" to both the REST API and the signature
service, "client" to our backend service that sends requests to the API, and
"user" or "browser" to the user agent that sends requests to our backend
service and is eventually directed to the signature service.

To use the service, it is necessary to have Basic Auth credentials for a
particular profile policy in the service.

There are 4 basic steps to complete a signature procedure:

+ The client sends a document to the API to be prepared for signature.

+ The client sends a request to the API to create and obtain a signature
  request for one or more previously prepared documents.

+ The user POSTs the signature request obtained in the previous step to the
  signature service, and is taken to an IdP where they provide credentials to
  sign the document(s). This will end in the user POSTing a form with a sign
  response to a callback in the client.

+ The client grabs the sign response provided by the service to the user and
  POSTed by the user to the client, and uses it to retrieve the signed
  documents from the API.

See comments on the code below for details.

1.- https://github.com/idsec-solutions/signservice-integration-rest/blob/master/docs/sample-flow.md
"""
import json
import uuid
from pprint import pformat
from urllib.parse import urljoin

import requests
from flask import current_app, session, url_for
from requests.auth import HTTPBasicAuth


def pretty_print_req(req: requests.PreparedRequest) -> str:
    """
    Pretty print `requests.PreparedRequest`, used for logging

    :param req: The request to print
    :return: Pretty printed reepresentation of the request
    """
    return '{}\n{}\r\n{}\r\n\r\n{}'.format(
        '-----------START-----------',
        str(req.method) + ' ' + str(req.url),
        '\r\n'.join('{}: {}'.format(k, v) for k, v in req.headers.items()),
        str(req.body),
    )


class APIClient(object):
    """
    Class holding methods to communicate with the Signature Service Integration REST-Service.

    The `edusign_webapp.run.EduSignApp` Flask app has a property `api_client` that is an
    instance of this class.
    """

    class ExpiredCache(Exception):
        """
        When the client sends a document to the API to be prepared, the API will keep it
        in its cache for a configurable amount of time (15 minutes by default). Afterwards
        it will be removed.
        If the client tries to create a sign request referencing a document that has been
        removed from the cache, it will obtain an error response. So it uses this exception
        to signal such condition, to indicate that it is necessary to prepare the document
        again before trying to continue with the signing process.
        """
        pass

    def __init__(self, config: dict):
        """
        Initialize the client object with configuration gathered by flask.
        We need 3 parameters here:

        + The base URL of the signature service / API
        + The profile in the API to use - for which we have credentials (HTTP Basic Auth)
        + The HTTP Basic Auth credentials.

        :param config: Dict containing the configuration parameters provided to Flask.
        """
        self.api_base_url = config['EDUSIGN_API_BASE_URL']
        self.profile = config['EDUSIGN_API_PROFILE']
        self.basic_auth = HTTPBasicAuth(config['EDUSIGN_API_USERNAME'], config['EDUSIGN_API_PASSWORD'])
        self.config = config

    def _post(self, url: str, request_data: dict) -> requests.Response:
        """
        Method to POST to the eduSign API, used by all methods of the class
        that POST to it.

        :param url: URL to send the POST to
        :param request_data: Dict holding the data to POST.
        :return: Flask representation of the HTTP response from the API.
        """
        requests_session = requests.Session()
        req = requests.Request('POST', url, json=request_data, auth=self.basic_auth)
        prepped = requests_session.prepare_request(req)

        current_app.logger.debug(f"Request sent to the API's {url} method: {pretty_print_req(prepped)}")

        settings = requests_session.merge_environment_settings(prepped.url, {}, None, None, None)
        response = requests_session.send(prepped, **settings)
        current_app.logger.debug(f"Response from the API's {url} method: {response}")
        return response.json()

    def prepare_document(self, document: dict) -> requests.Response:
        """
        Send request to the `prepare` endpoint of the API.
        This API method will prepare a PDF document
        with a PDF signature page containing a visible PDF signature image,
        and keep it cached for 15min by default.

        The main pieces of data we have to send to this endpoint are:

        + pdfDocument: The PDF document as base64 data.

        + signaturePagePreferences.visiblePdfSignatureUserInformation.signerName.signerAttributes:
          The list of attributes to be used in the signature, given as `{name: <attr name>}` objects.
          These are attributes released by the SAML IdP, and their name must be in uri format.

        + signaturePagePreferences.visiblePdfSignatureUserInformation.fieldValues.idp:
          The value of this field will appear in the signature image as the "Authenticated by" entity.
          We here try to provide the organization name as provided by Shibboleth, and in case it is not
          found, the entityID of the IdP chosen by the user. Note that the client (the flask app)
          will try to identify the user via seamlessaccess.org, and it will record the IdP chosen by
          the user to use it here.

        There are other parameters to control the insertion of the signature image in the document,
        which we've just valued as suggested in [1].

        :param document: Dict holding the PDF (data and metadata) to prepare for signing.
        :return: Flask representation of the HTTP response from the API.
        """
        idp = session['idp']
        if self.config['ENVIRONMENT'] == 'development':
            # This is only to test the app in a development environment.
            idp = self.config['DEBUG_IDP']

        if session.get('organizationName', None) is not None:
            idp = session['organizationName']

        attrs = [{'name': attr} for attr in self.config['SIGNER_ATTRIBUTES'].keys()]
        current_app.logger.debug(f"signerAttributes sent to the prepare endpoint: {attrs}")

        doc_data = document['blob']
        current_app.logger.debug(f"Document to send to the prepare endpoint: {doc_data}")
        if ',' in doc_data:
            doc_data = doc_data.split(',')[1]

        current_app.logger.debug(f"Document sent to the prepare endpoint: {doc_data}")
        request_data = {
            "pdfDocument": doc_data,
            "signaturePagePreferences": {
                "visiblePdfSignatureUserInformation": {
                    "signerName": {"signerAttributes": attrs},
                    "fieldValues": {"idp": idp},
                },
                "failWhenSignPageFull": True,
                "insertPageAt": 0,
                "returnDocumentReference": True,
            },
        }
        api_url = urljoin(self.api_base_url, f'prepare/{self.profile}')

        response = self._post(api_url, request_data)

        current_app.logger.debug(f"Data returned from the API's prepare endpoint: {pformat(response)}")

        return response

    def _try_creating_sign_request(self, documents: list, add_blob=False) -> tuple:
        """
        :param documents: List with (already prepared) documents to include in the sign request.
        :return: Pair of  Flask representation of the HTTP response from the API,
                 and list of mappings linking the documents' names with the generated ids.
        """
        idp = session['idp']
        authn_context = session['authn_context']
        if self.config['ENVIRONMENT'] == 'development':
            idp = self.config['DEBUG_IDP']
            authn_context = self.config['DEBUG_AUTHN_CONTEXT']

        correlation_id = str(uuid.uuid4())
        return_url = url_for('edusign.sign_service_callback', _external=True, _scheme='https')
        attrs = [{'name': attr, 'value': session[name]} for attr, name in self.config['SIGNER_ATTRIBUTES'].items()]

        request_data = {
            "correlationId": correlation_id,
            "signRequesterID": self.config['SIGN_REQUESTER_ID'],
            "returnUrl": return_url,
            "authnRequirements": {
                "authnServiceID": idp,
                "authnContextClassRefs": [authn_context],
                "requestedSignerAttributes": attrs,
            },
            "tbsDocuments": [],
        }
        documents_with_id = []
        for document in documents:
            doc_with_id = {'name': document['name'], 'key': str(document['key'])}
            if add_blob:
                doc_with_id['blob'] = document['blob']
                doc_with_id['size'] = document['size']
                doc_with_id['size'] = document['size']
                doc_with_id['type'] = document['type']
            documents_with_id.append(doc_with_id)
            request_data['tbsDocuments'].append(
                {
                    "id": str(document['key']),
                    "contentReference": document['ref'],
                    "mimeType": document['type'],
                    "visiblePdfSignatureRequirement": json.loads(document['sign_requirement']),
                }
            )
        api_url = urljoin(self.api_base_url, f'create/{self.profile}')

        return self._post(api_url, request_data), documents_with_id

    def create_sign_request(self, documents: list, add_blob=False) -> tuple:
        """
        Send request to the `create` endpoint of the API.
        This API method will create and return the DSS SignRequest message
        that is to be sent to the signature service.

        :param documents: List with (already prepared) documents to include in the sign request.
        :raises ExpiredCache: When the response from the API indicates that the documents to sign have dissapeared from the API's cache.
        :return: Pair of  Flask representation of the HTTP response from the API,
                 and list of mappings linking the documents' names with the generated ids.
        """
        response_data, documents_with_id = self._try_creating_sign_request(documents, add_blob=add_blob)

        if (
            'status' in response_data
            and response_data['status'] == 400
            and 'message' in response_data
            and 'not found in cache' in response_data['message']
        ):

            raise self.ExpiredCache()

        current_app.logger.debug(f"Data returned from the API's create endpoint: {pformat(response_data)}")

        return response_data, documents_with_id

    def process_sign_request(self, sign_response: dict, relay_state: str) -> requests.Response:
        """
        Send request to the `process` endpoint of the API.
        This API method will process the DSS SignRequest in order to get the signed document.

        :param sign_response: signResponse data as returned from the `create` endpoint of the eduSign API.
        :param relay_state: Relay state as returned from the `create` endpoint of the eduSign API.
        :return: Flask representation of the HTTP response from the API.
        """
        request_data = {"signResponse": sign_response, "relayState": relay_state, "state": {"id": relay_state}}
        api_url = urljoin(self.api_base_url, 'process')

        response = self._post(api_url, request_data)

        current_app.logger.debug(f"Data returned from the API's process endpoint: {pformat(response)}")

        return response
