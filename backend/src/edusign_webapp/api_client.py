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
from pprint import pformat
from urllib.parse import urljoin
from uuid import uuid4

import requests
from flask import current_app, json, session, url_for
from requests.auth import HTTPBasicAuth


def pretty_print_req(req):
    """"""
    return '{}\n{}\r\n{}\r\n\r\n{}'.format(
        '-----------START-----------',
        req.method + ' ' + req.url,
        '\r\n'.join('{}: {}'.format(k, v) for k, v in req.headers.items()),
        req.body,
    )


class APIClient(object):

    class ExpiredCache(Exception):
        pass

    def __init__(self, config: dict):
        self.api_base_url = config['EDUSIGN_API_BASE_URL']
        self.profile = config['EDUSIGN_API_PROFILE']
        self.basic_auth = HTTPBasicAuth(config['EDUSIGN_API_USERNAME'], config['EDUSIGN_API_PASSWORD'])
        self.config = config

    def _post(self, url, request_data):
        requests_session = requests.Session()
        req = requests.Request('POST', url, json=request_data, auth=self.basic_auth)
        prepped = requests_session.prepare_request(req)

        current_app.logger.debug(f"Request sent to the API's {url} method: {pretty_print_req(prepped)}")

        settings = requests_session.merge_environment_settings(prepped.url, {}, None, None, None)
        return requests_session.send(prepped, **settings)

    def prepare_document(self, document: dict) -> dict:
        """"""
        idp = session['idp']
        if self.config['ENVIRONMENT'] == 'development':
            idp = self.config['DEBUG_IDP']

        doc_data = document['blob'].split(',')[1]
        request_data = {
            "pdfDocument": doc_data,
            "signaturePagePreferences": {
                "visiblePdfSignatureUserInformation": {
                    "signerName": {"signerAttributes": [
                        {"name": "urn:oid:2.5.4.42"},
                        {"name": "urn:oid:2.5.4.4"},
                        {"name": "urn:oid:0.9.2342.19200300.100.1.3"},
                    ]},
                    "fieldValues": {"idp": idp},
                },
                "failWhenSignPageFull": True,
                "insertPageAt": 0,
                "returnDocumentReference": True,
            },
        }
        api_url = urljoin(self.api_base_url, f'prepare/{self.profile}')

        response = self._post(api_url, request_data)

        response_data = response.json()
        current_app.logger.debug(f"Data returned from the API's prepare endpoint: {pformat(response_data)}")

        return response_data

    def _try_creating_sign_request(self, documents: list) -> tuple:
        idp = session['idp']
        authn_context = session['authn_context']
        if self.config['ENVIRONMENT'] == 'development':
            idp = self.config['DEBUG_IDP']
            authn_context = self.config['DEBUG_AUTHN_CONTEXT']

        correlation_id = str(uuid4())
        # base_url = f"{config['PREFERRED_URL_SCHEME']}://{config['SERVER_NAME']}"
        # entity_id = urljoin(base_url, config['ENTITY_ID_URL'])
        return_url = url_for('edusign.sign_service_callback', _external=True, _scheme='https')

        request_data = {
            "correlationId": correlation_id,
            "signRequesterID": self.config['SIGN_REQUESTER_ID'],
            "returnUrl": return_url,
            "authnRequirements": {
                "authnServiceID": idp,
                "authnContextClassRefs": [authn_context],
                "requestedSignerAttributes": [
                    {"name": "urn:oid:2.5.4.42", "value": session['given_name']},
                    {"name": "urn:oid:2.5.4.4", "value": session['surname']},
                    {"name": "urn:oid:0.9.2342.19200300.100.1.3", "value": session['email']},
                ],
            },
            "tbsDocuments": [],
        }
        documents_with_id = []
        for document in documents:
            document_id = str(uuid4())
            documents_with_id.append({'name': document['name'], 'id': document_id})
            request_data['tbsDocuments'].append(
                {
                    "id": document_id,
                    "contentReference": document['ref'],
                    "mimeType": document['type'],
                    "visiblePdfSignatureRequirement": json.loads(document['sign_requirement']),
                }
            )
        api_url = urljoin(self.api_base_url, f'create/{self.profile}')

        return self._post(api_url, request_data), documents_with_id

    def create_sign_request(self, documents: list) -> tuple:

        response, documents_with_id = self._try_creating_sign_request(documents)
        response_data = response.json()

        if 'status' in response_data and response_data['status'] == 400 and 'message' in response_data and 'not found in cache' in response_data['message']:

            raise self.ExpiredCache()

        current_app.logger.debug(f"Data returned from the API's create endpoint: {pformat(response_data)}")

        return response_data, documents_with_id

    def process_sign_request(self, sign_response, relay_state):

        request_data = {"signResponse": sign_response, "relayState": relay_state, "state": {"id": relay_state}}
        api_url = urljoin(self.api_base_url, 'process')

        response = self._post(api_url, request_data)

        response_data = response.json()
        current_app.logger.debug(f"Data returned from the API's process endpoint: {pformat(response_data)}")

        return response_data
