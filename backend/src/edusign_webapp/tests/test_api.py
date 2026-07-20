# -*- coding: utf-8 -*-
#
# Copyright (c) 2026 SUNET
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
import json
from base64 import b64encode

from flask import session

from edusign_webapp.api import add_to_session


def _personal_data(authn_attr_name='urn:oid:1.3.6.1.4.1.5923.1.1.1.6', authn_attr_value='api-user@example.org'):
    return {
        'display_name': 'Api Tester',
        'mail': ['api-user@example.org'],
        'assurance': ['http://www.swamid.se/policy/assurance/al1'],
        'organization': 'Test Org',
        'registration_authority': 'http://www.swamid.se/',
        'saml_attr_schema': '20',
        'authn_attr_name': authn_attr_name,
        'authn_attr_value': authn_attr_value,
    }


def _authn_personal_data(**kwargs):
    data = _personal_data(**kwargs)
    data.update(
        {
            'idp': 'https://idp',
            'authn_context': 'dummy',
            'return_url': 'https://return.example.org',
        }
    )
    return data


def _mock_process_and_validate(monkeypatch):
    from edusign_webapp.api_client import APIClient

    signed_content = b64encode(b'Dummy signed content').decode('utf8')

    def mock_post(*args, **kwargs):
        return {
            'correlationId': '2a08e13e-8719-4b53-8586-662037f153ec',
            'id': '09d91b6f-199c-4388-a4e5-230807dd4ac4',
            'signedDocuments': [
                {
                    'id': '6e46692d-7d34-4954-b760-96ee6ce48f61',
                    'mimeType': 'application/pdf',
                    'signedContent': signed_content,
                }
            ],
            'signerAssertionInformation': {
                'assertion': 'Dummy signer assertion',
                'assertionReference': 'id-9bts2Fze4U1amT7GF',
                'authnContextRef': 'https://www.swamid.se/specs/id-fido-u2f-ce-transports',
                'authnInstant': 1611062701000,
                'authnServiceID': 'https://login.idp.eduid.se/idp.xml',
                'authnType': 'saml',
                'signerAttributes': [
                    {
                        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.6',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'api-user@example.org',
                    },
                ],
            },
        }

    def mock_validate(self, to_validate):
        for doc in to_validate:
            doc['validated'] = True
            if 'blob' in doc['doc']:
                doc['doc']['signedContent'] = doc['doc']['blob']

        return to_validate

    monkeypatch.setattr(APIClient, '_post', mock_post)
    monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)


def _mock_prepare_and_create(monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_post(self, url, *args, **kwargs):
        if 'prepare' in url:
            return {
                'policy': 'edusign-test',
                'updatedPdfDocumentReference': 'ba26478f-f8e0-43db-991c-08af7c65ed58',
                'visiblePdfSignatureRequirement': {
                    'fieldValues': {'idp': 'https://login.idp.eduid.se/idp.xml'},
                    'page': 2,
                    'scale': -74,
                    'signerName': {
                        'formatting': None,
                        'signerAttributes': [
                            {'name': 'urn:oid:2.5.4.42'},
                            {'name': 'urn:oid:2.5.4.4'},
                            {'name': 'urn:oid:0.9.2342.19200300.100.1.3'},
                        ],
                    },
                    'templateImageRef': 'eduSign-image',
                    'xposition': 37,
                    'yposition': 165,
                },
            }

        return {
            'binding': 'POST/XML/1.0',
            'destinationUrl': 'https://sig.idsec.se/sigservice-dev/request',
            'relayState': '31dc573b-ab7d-496c-845e-cae8792ba063',
            'signRequest': 'DUMMY SIGN REQUEST',
            'state': {'id': '31dc573b-ab7d-496c-845e-cae8792ba063'},
        }

    monkeypatch.setattr(APIClient, '_post', mock_post)


def test_api_get_signed(client, monkeypatch):
    _mock_process_and_validate(monkeypatch)

    sign_response = b64encode(b'Dummy Sign Response').decode('utf8')

    response = client.post(
        '/api/v1/get-signed',
        json={
            'api_key': 'dummy',
            'personal_data': _personal_data(),
            'payload': {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'},
        },
    )

    assert response.status == '200 OK'
    assert b64encode(b'Dummy signed content') in response.data


def test_api_get_signed_wrong_api_key(client, monkeypatch):
    _mock_process_and_validate(monkeypatch)

    sign_response = b64encode(b'Dummy Sign Response').decode('utf8')

    response = client.post(
        '/api/v1/get-signed',
        json={
            'api_key': 'wrong',
            'personal_data': _personal_data(),
            'payload': {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'},
        },
    )

    assert response.status == '401 UNAUTHORIZED'


def test_api_get_signed_missing_api_key(client, monkeypatch):
    _mock_process_and_validate(monkeypatch)

    response = client.post(
        '/api/v1/get-signed',
        json={
            'personal_data': _personal_data(),
            'payload': {'sign_response': 'dummy', 'relay_state': 'dummy'},
        },
    )

    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert resp_data['error']


def test_api_create_sign_request(client, monkeypatch, sample_doc_1):
    _mock_prepare_and_create(monkeypatch)

    response = client.post(
        '/api/v1/create-sign-request',
        json={
            'api_key': 'dummy',
            'personal_data': _authn_personal_data(
                authn_attr_name='urn:oid:1.2.752.29.4.13', authn_attr_value='8112189876'
            ),
            'payload': {
                'documents': {
                    'local': [
                        {
                            'name': 'test.pdf',
                            'size': 100,
                            'type': 'application/pdf',
                            'blob': sample_doc_1['blob'],
                            'key': sample_doc_1['key'],
                        }
                    ],
                    'owned': [],
                    'invited': [],
                },
                'invite_key': '',
            },
        },
    )

    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert resp_data['payload']['relay_state'] == '31dc573b-ab7d-496c-845e-cae8792ba063'
    assert resp_data['payload']['sign_request'] == 'DUMMY SIGN REQUEST'


def test_add_to_session_eppn_variants(app):
    _, app = app

    with app.test_request_context():
        add_to_session(_personal_data())
        assert session['eppn'] == 'api-user@example.org'
        assert session['api_call']

    with app.test_request_context():
        add_to_session(_personal_data(authn_attr_name='urn:oid:0.9.2342.19200300.100.1.3'))
        # value contains '@', used directly as eppn
        assert session['eppn'] == 'api-user@example.org'

    with app.test_request_context():
        add_to_session(_personal_data(authn_attr_name='urn:oid:1.2.752.29.4.13', authn_attr_value='8112189876'))
        # no '@': organization (without spaces) is appended
        assert session['eppn'] == '8112189876@TestOrg'

    with app.test_request_context():
        add_to_session(_authn_personal_data())
        assert session['idp'] == 'https://idp'
        assert session['authn_context'] == 'dummy'
        assert session['api_return_url'] == 'https://return.example.org'
