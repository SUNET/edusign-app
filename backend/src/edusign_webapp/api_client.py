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
from urllib.parse import urljoin

import requests
from flask import session


class APIClient(object):
    def __init__(self, base_url: str, profile: str):
        self.base_url = base_url
        self.profile = profile

    def prepare_document(self, document: dict) -> str:
        request_data = {
            "pdfDocument": document['blob'],
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
        api_url = urljoin(self.base_url, f'prepare/{self.profile}')

        response = requests.post(api_url, data=request_data)
        response_data = response.json()

        return response_data['updatedPdfDocumentReference']
