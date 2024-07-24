# -*- coding: utf-8 -*-
#
# Copyright (c) 2021 SUNET
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
from base64 import b64encode


def _test_multisign_sevice_callback(client, monkeypatch, data, mock_locked=True):
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
                        'name': 'urn:oid:2.16.840.1.113730.3.1.241',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'Testing Tester',
                    },
                    {
                        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.6',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'dummy-dummy@example.org',
                    },
                    {
                        'name': 'urn:oid:2.5.4.42',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'Testing',
                    },
                    {
                        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.13',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'dummy@example.org',
                    },
                    {
                        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'http://www.swamid.se/policy/assurance/al1',
                    },
                    {
                        'name': 'urn:oid:2.5.4.3',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'Testing Tester',
                    },
                    {
                        'name': 'urn:oid:2.5.4.4',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'Tester',
                    },
                    {
                        'name': 'urn:oid:0.9.2342.19200300.100.1.3',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'dummy@example.org',
                    },
                ],
            },
        }

    monkeypatch.setattr(APIClient, '_post', mock_post)

    return client.post(
        '/sign/callback',
        data=data,
    )


def test_multisign_sevice_callback(client, monkeypatch):
    sign_response = b64encode(b'Dummy Sign Response')

    data = {
        'Binding': 'POST/XML/1.0',
        'RelayState': '09d91b6f-199c-4388-a4e5-230807dd4ac4',
        'EidSignResponse': sign_response.decode('utf8'),
    }
    response = _test_multisign_sevice_callback(client, monkeypatch, data)

    assert response.status == '200 OK'

    assert b"<title>eduSign</title>" in response.data
    assert sign_response in response.data


def test_multisign_sevice_callback_no_relay_state(client, monkeypatch):
    sign_response = b64encode(b'Dummy Sign Response')

    data = {
        'Binding': 'POST/XML/1.0',
        'EidSignResponse': sign_response.decode('utf8'),
    }
    response = _test_multisign_sevice_callback(client, monkeypatch, data)

    assert response.status == '400 BAD REQUEST'


def test_multisign_sevice_callback_no_sign_response(client, monkeypatch):
    data = {
        'Binding': 'POST/XML/1.0',
        'RelayState': '09d91b6f-199c-4388-a4e5-230807dd4ac4',
    }
    response = _test_multisign_sevice_callback(client, monkeypatch, data)

    assert response.status == '400 BAD REQUEST'
