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
profile policy in the service.

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

1.- https://github.com/idsec-solutions/signservice-integration-rest/blob/master/docs/sample-flow.md
"""
import asyncio
import json
import uuid
from base64 import b64decode, b64encode
from pprint import pformat
from urllib.parse import urljoin

import requests
from flask import current_app, request, session, url_for
from requests.auth import HTTPBasicAuth

from edusign_webapp.utils import get_authn_context, get_required_assurance


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

    Instances of `edusign_webapp.run.EduSignApp` Flask app has a property `api_client` that is an
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

    class UnknownDocType(Exception):
        """
        Trying to sign a document with an unsupported MIME type
        """

        pass

    def __init__(self, config: dict):
        """
        :param config: Dict containing the configuration parameters provided to Flask.
        """
        self.config = config

    def initialize_credentials(self):
        """
        Initialize the client object with configuration gathered by flask.
        We need 3 things here:

        + The base URL of the signature service / API
        + The profile in the API to use - for which we have credentials (HTTP Basic Auth)
        + The HTTP Basic Auth credentials.
        """
        attr_schema = session['saml-attr-schema']
        self.api_base_url = self.config['EDUSIGN_API_BASE_URL']
        self.profile = self.config[f'EDUSIGN_API_PROFILE_{attr_schema}']
        self.basic_auth = HTTPBasicAuth(
            self.config[f'EDUSIGN_API_USERNAME_{attr_schema}'], self.config[f'EDUSIGN_API_PASSWORD_{attr_schema}']
        )

    def _post(self, url: str, request_data: dict) -> dict:
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
        current_app.logger.debug(f"Response from the API's {url} method: {response.json()}")
        return response.json()

    def prepare_document(self, document: dict) -> dict:
        """
        Send request to the `prepare` endpoint of the API.
        This API method will prepare a PDF document
        with a PDF signature page containing a visible PDF signature image,
        and keep it cached for 15min by default.

        The main pieces of data we have to send to this endpoint are:

        * pdfDocument: The PDF document as base64 data.

        * signaturePagePreferences.visiblePdfSignatureUserInformation.signerName.signerAttributes:
          The list of attributes to be used in the signature, given as `{name: <attr name>}` objects.
          These are attributes released by the SAML IdP, and their name must be in uri format.

        * signaturePagePreferences.visiblePdfSignatureUserInformation.fieldValues.idp:
          The value of this field will appear in the signature image as the "Authenticated by" entity.
          We here try to provide the organization name as provided by Shibboleth, and in case it is not
          found, the entityID of the IdP chosen by the user. Note that the client (the flask app)
          will try to identify the user via seamlessaccess.org, and it will record the IdP chosen by
          the user to use it here.

        There are other parameters to control the insertion of the signature image in the document,
        which we've just valued as suggested in [1].

        The structure of the JSON to send would be something like:

        .. code:
            {
                "pdfDocument": "JVBERi0xLj...lJUVPRgo=",
                "signaturePagePreferences": {
                    "visiblePdfSignatureUserInformation": {
                        "signerName": {"signerAttributes": [ {"name" : "urn:oid:2.16.840.1.113730.3.1.241"} ]},
                        "fieldValues": {"idp": "Snake Oil Co"},
                    },
                    "failWhenSignPageFull": true,
                    "insertPageAt": 0,
                    "returnDocumentReference": true,
                },
            }

        :param document: Dict holding the PDF (data and metadata) to prepare for signing.
        :return: Flask representation of the HTTP response from the API.
        """
        self.initialize_credentials()
        idp = session['idp']
        attr_schema = session['saml-attr-schema']

        if session.get('organizationName', None) is not None:
            idp = session['organizationName']

        attrs = [{'name': attr} for attr in self.config[f'SIGNER_ATTRIBUTES_{attr_schema}'].keys()]
        current_app.logger.debug(f"signerAttributes sent to the prepare endpoint: {attrs}")

        doc_data = document['blob']
        if ',' in doc_data:
            doc_data = doc_data.split(',')[1]

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

        if current_app.logger.level == 'DEBUG':
            tolog = response.copy()
            for doc in tolog['signedDocuments']:
                doc['signedContent'] = doc['signedContent'][:20] + '...'
            current_app.logger.debug(f"Data returned from the API's prepare endpoint: {pformat(tolog)}")

        return response

    def _try_creating_sign_request(self, documents: list, add_blob=False) -> tuple:
        """
        Send request to the `create` endpoint of the API.
        This API method is used to create a sign request that can then be POSTed
        to the signature service, to initiate the actual signing process.

        It will include references to all the already prepared documents that
        need to be signed, kept in the API's cache.

        The main pieces of data we have to send to this endpoint are:

        + correlationId: A unique identifier for this request to create a sign request.

        + signRequesterID: is the SAML entityID of the SAML SP that authenticated the user,
          and who is the requesting entity of the signature operation. It has to coincide with
          whatever has been configured in the signature service.

        + returnUrl: The URL of the callback endpoint in the client, to which the user
          will be redirected after completing the signature process at the sign service.

        + authnRequirements.authnServiceID: entityID of the IdP that will perform the authentication
          for signature.

        + authnRequirements.authnContextClassRefs: The AuthnContextClassRef URI(s) that we request
          that the user is authenticated under.

        + authnRequirements.requestedSignerAttributes: A list of SAML attributes and values.
          It is necessary to provide values for all atributes previously sent as signerAttributes
          to the `prepare` endpoint.

        + tbsDocuments: A list in which each item carries metadata about one the documents to be signed.
          The metadata is as follows:

        + tbsDocuments.N.id: A unique identifier for the document issued by the client.

        + tbsDocuments.N.contentReference: This value was in the response from the API to the call
          to the `prepare` endpoint, as `updatedPdfDocumentReference`.

        + tbsDocuments.N.mimeType: application/pdf

        + tbsDocuments.N.visiblePdfSignatureRequirement: This was also in the response from the API
          to the call to the `prepare` endpoint.

        So the structure of the JSON to send would be something like:

        {
            "correlationId": "11111111-1111-1111-1111-111111111111",
            "signRequesterID": "https://example.org/shibboleth",
            "returnUrl": "https://example.org/callback",
            "authnRequirements": {
                "authnServiceID": "https://idp.example.org/shibboleth",
                "authnContextClassRefs": [ "http://id.elegnamnden.se/loa/1.0/loa3" ],
                "requestedSignerAttributes": [
                    {
                        "name": "urn:oid:2.16.840.1.113730.3.1.241",
                        "value": "John Doe",
                    }
                ],
            },
            "tbsDocuments": [],
        }

        And each itme in `tbsDocuments` would have the structure:

        {
            "id": "22222222-2222-2222-2222-222222222222",
            "contentReference": "33333333-3333-3333-3333-333333333333",
            "mimeType": "application/pdf",
            "visiblePdfSignatureRequirement": { "..." },
        }

        :param documents: List with (already prepared) documents to include in the sign request.
        :return: Pair of  Flask representation of the HTTP response from the API,
                 and list of mappings linking the documents' names with the generated ids.
        """
        idp = session['idp']
        attr_schema = session['saml-attr-schema']
        authn_context = get_authn_context(documents)
        assurance = get_required_assurance(documents)
        correlation_id = str(uuid.uuid4())
        attr_names = self.config[f'SIGNER_ATTRIBUTES_{attr_schema}'].items()
        attrs = [{'name': saml_name, 'value': session[friendly_name]} for saml_name, friendly_name in attr_names]
        used_attr_names = tuple(saml_name for saml_name, _ in attr_names)
        if 'api_call' in session and session['api_call']:
            more_attr_names = []
            more_attrs = []
            if session['authn_attr_name'] not in used_attr_names:
                more_attr_names.append(session['authn_attr_name'])
                more_attrs = [{'name': session['authn_attr_name'], 'value': session['authn_attr_value']}]
                used_attr_names += tuple([session['authn_attr_name']])
        else:
            more_attr_names = [
                attr_names
                for attr_names in self.config[f'AUTHN_ATTRIBUTES_{attr_schema}'].items()
                if attr_names[0] not in used_attr_names
            ]
            more_attrs = [
                {'name': saml_name, 'value': session[friendly_name]} for saml_name, friendly_name in more_attr_names
            ]
            more_used_attr_names = tuple(saml_name for saml_name, _ in more_attr_names)
            used_attr_names += more_used_attr_names
        attrs.extend(more_attrs)
        assurances = self.config['AVAILABLE_LOAS'].get(
            session['registrationAuthority'], self.config['AVAILABLE_LOAS']['default']
        )
        levels = {'low': 0, 'medium': 1, 'high': 2}
        loa = assurances[levels[assurance]]
        if attr_schema == '11':
            assurance_attr_name = 'urn:mace:dir:attribute-def:eduPersonAssurance'
        else:
            assurance_attr_name = 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11'
        if assurance_attr_name not in used_attr_names:
            attrs.append({'name': assurance_attr_name, 'value': loa})

        if 'api_return_url' in session and session['api_return_url']:
            return_url = session['api_return_url']
        else:
            scheme = self.config['PREFERRED_URL_SCHEME']
            return_url = url_for('edusign.sign_service_callback', _external=True, _scheme=scheme)

            if request.path.startswith('/sign2'):
                return_url = url_for('edusign2.sign_service_callback', _external=True, _scheme=scheme)

        request_data = {
            "correlationId": correlation_id,
            "signRequesterID": self.config['SIGN_REQUESTER_ID'],
            "returnUrl": return_url,
            "authnRequirements": {
                "authnServiceID": idp,
                "authnContextClassRefs": authn_context,
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
            if document['type'] == 'application/pdf':
                data = {
                    "id": str(document['key']),
                    "contentReference": document['ref'],
                    "mimeType": document['type'],
                    "visiblePdfSignatureRequirement": json.loads(document['sign_requirement']),
                }
            elif document['type'].endswith('/xml'):
                content = document['blob']
                if ',' in content:
                    content = content.split(',')[1]
                data = {
                    "id": str(document['key']),
                    "content": content,
                    "mimeType": 'application/xml',
                }
            else:
                raise self.UnknownDocType(document['type'])

            request_data['tbsDocuments'].append(data)
        api_url = urljoin(self.api_base_url, f'create/{self.profile}')

        return self._post(api_url, request_data), documents_with_id

    def create_sign_request(self, documents: list, add_blob=False) -> tuple:
        """
        Use the `_try_creating_sign_request` method to create a sign request
        at the `create` endpoint of the API.

        It is possible that the documents referenced in the requests have been cleared from
        the API's cache; in that case, the response from the API will have an error code
        indicating that condition. This method will then raise an `ExpiredCache` eception,
        and it is the responsability of the calling method to restart the process: Send the
        documents again to be prepared, and then try again to create a sign request.

        If successful, this method will return the response with the sign request, to be POSTed
        from the user agent to initiate the actual signing of the document.

        :param documents: List with (already prepared) documents to include in the sign request.
        :raises ExpiredCache: When the response from the API indicates that the documents to sign
                              have dissapeared from the API's cache.
        :return: Data (with the sign request) contained in the response from the API,
                 and a list of mappings linking the documents' names with the generated ids (sent to
                 the API as tbsDocuments.N.id).
        """
        self.initialize_credentials()
        response_data, documents_with_id = self._try_creating_sign_request(documents, add_blob=add_blob)

        if (
            'status' in response_data
            and response_data['status'] == 400
            and 'message' in response_data
            and 'not found in cache' in response_data['message']
        ):
            raise self.ExpiredCache()

        if current_app.logger.level == 'DEBUG':
            tolog = response_data.copy()
            tolog['signRequest'] = tolog['signRequest'][:20] + '...'
            current_app.logger.debug(f"Data returned from the API's create endpoint: {pformat(tolog)}")

        return response_data, documents_with_id

    def process_sign_request(self, sign_response: dict, relay_state: str) -> dict:
        """
        This method is meant to be called after the user has completed the sgnature process, through the
        sign service and the IdP. At this point, the documents are signed and kept in the API's cache.
        So here we send a request to the `proccess` endpoint of the API to retrieve them.

        The main pieces of data we have to send to this endpoint are:

        + signResponse
        + realyState
        + state

        The values for these are all present in the POST that the user agent sends to the callback in the client app
        (whose URL we sent to the `create` endpoint as `returnUrl`), after returning from the sign service and IdP.

        The reponse to this call will contain, in addition to some more metadata, the signed documents, in a list
        `signedDocuments`, where each document includes:

        + id: the id of the document, sent to the `create` endpoint as tbsDocuments.N.id;
        + signedContent: The signed document encoded as base64;
        + mimeType: "application/pdf"

        Send request to the `process` endpoint of the API.
        This API method will process the DSS SignRequest in order to get the signed document.

        :param sign_response: signResponse data as returned from the `create` endpoint of the eduSign API.
        :param relay_state: Relay state as returned from the `create` endpoint of the eduSign API.
        :return: Data (containing the signed documents in successful requests) received in the HTTP response
                 from the API.
        """
        self.initialize_credentials()
        request_data = {"signResponse": sign_response, "relayState": relay_state, "state": {"id": relay_state}}
        api_url = urljoin(self.api_base_url, 'process')

        response = self._post(api_url, request_data)

        if current_app.logger.level == 'DEBUG':
            tolog = response.copy()
            for doc in tolog['signedDocuments']:
                doc['signedContent'] = doc['signedContent'][:20] + '...'
            current_app.logger.debug(f"Data returned from the API's process endpoint: {pformat(tolog)}")

        return response

    def validate_signatures(self, to_validate: list) -> list:
        """
        This method is called once a bunch of documents have been signed,
        in order to add proof of validation to them.

        :param to_validate: list in which each entry is a dict that corresponds to a signed document to validate, with keys:
            * key: key for the document
            * owner: owner of document
            * doc: document contents
            * sendsigned: sendsigned flag

        :return: a list like the to_validate param, in which the document contents may have been substituted
            by the one with validation proof, and with an additional boolean key validated indicating whether the contents
            have been substituted with a validated signature.
        """
        url = current_app.config['VALIDATOR_API_BASE_URL'] + 'issue-svt'

        def _validate(doc):
            try:
                content = b64decode(doc['doc']['blob'])
            except KeyError:
                content = b64decode(doc['doc']['signedContent'])
            resp = requests.post(url, data=content, headers={'Content-Type': doc['doc']['type']})
            if resp.status_code == 200:
                vpdf = resp.content
                doc['doc']['signedContent'] = b64encode(vpdf).decode('utf8')
                doc['validated'] = True
            else:
                if 'signedContent' not in doc['doc']:
                    doc['doc']['signedContent'] = doc['doc']['blob']
                doc['validated'] = False

            return doc

        async def validate(doc):
            return _validate(doc)

        loop = asyncio.new_event_loop()
        tasks = [loop.create_task(validate(doc)) for doc in to_validate]

        if len(tasks) > 0:
            loop.run_until_complete(asyncio.wait(tasks))
        loop.close()

        return [task.result() for task in tasks]
