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
from flask import current_app, session, url_for
from flask_babel import gettext
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
    def __init__(self, config: dict):
        self.api_base_url = config['EDUSIGN_API_BASE_URL']
        self.profile = config['EDUSIGN_API_PROFILE']
        self.basic_auth = HTTPBasicAuth(config['EDUSIGN_API_USERNAME'], config['EDUSIGN_API_PASSWORD'])

    def _post(self, url, request_data):
        requests_session = requests.Session()
        req = requests.Request('POST', url, json=request_data, auth=self.basic_auth)
        prepped = requests_session.prepare_request(req)

        current_app.logger.debug(f"Request sent to the API's prepare method: {pretty_print_req(prepped)}")

        settings = requests_session.merge_environment_settings(prepped.url, {}, None, None, None)
        return requests_session.send(prepped, **settings)

    def prepare_document(self, document: dict) -> dict:
        doc_data = document['blob'].split(',')[1]
        request_data = {
            "pdfDocument": doc_data,
            "signaturePagePreferences": {
                "visiblePdfSignatureUserInformation": {
                    "signerName": {"signerAttributes": [{"name": "urn:oid:2.16.840.1.113730.3.1.241"}]},
                    "fieldValues": {"idp": session['idp']},
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

    def create_sign_request(self, document: dict, visible_req: dict) -> dict:
        config = current_app.config
        correlation_id = uuid4()
        document_id = uuid4()
        base_url = f"{config['PREFERRED_URL_SCHEME']}://{config['SERVER_NAME']}"
        entity_id = urljoin(base_url, config['ENTITY_ID_URL'])
        return_url = url_for('edusign.sign_service_callback', _external=True)

        request_data = {
            "correlationId": correlation_id,
            "signRequesterID": entity_id,
            "returnUrl": return_url,
            "authnRequirements": {
                "authnServiceID": session['idp'],
                "authnContextClassRefs": [session['authn_context']],
                "requestedSignerAttributes": [
                    {"name": "urn:oid:2.5.4.42", "value": session['given_name']},
                    {"name": "urn:oid:2.5.4.4", "value": session['surname']},
                    {"name": "urn:oid:0.9.2342.19200300.100.1.3", "value": session['email']},
                ],
            },
            "tbsDocuments": [
                {
                    "id": document_id,
                    "contentReference": document['ref'],
                    "mimeType": document['type'],
                    "visiblePdfSignatureRequirement": visible_req,
                }
            ],
            "signMessageParameters": {
                "signMessage": gettext("Hi %(name)s, this is the eduSign service", name=session['given_name']),
                "performEncryption": True,
                "mimeType": "text",
                "mustShow": True,
            },
        }
        api_url = urljoin(self.api_base_url, f'create/{self.profile}')

        response = self._post(api_url, request_data)

        response_data = response.json()
        current_app.logger.debug(f"Data returned from the API's create endpoint: {pformat(response_data)}")

        return response_data
