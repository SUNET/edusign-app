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
import json
from base64 import b64encode

from edusign_webapp import run
from edusign_webapp.marshal import ResponseSchema


def _test_get_signed_documents(client, monkeypatch, process_data=None):
    from edusign_webapp.api_client import APIClient

    signed_content = b64encode(b'Dummy signed content').decode('ascii')

    def mock_post(*args, **kwargs):
        if process_data is not None:
            return process_data

        signed_content = b64encode(b'Dummy signed content').decode('utf8')

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
                        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.9',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'affiliate@example.org',
                    },
                    {
                        'name': 'urn:oid:2.5.4.6',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'se',
                    },
                    {
                        'name': 'urn:oid:0.9.2342.19200300.100.1.43',
                        'nameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
                        'type': 'saml',
                        'value': 'Sweden',
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

    def mock_validate(self, to_validate):
        for doc in to_validate:
            doc['validated'] = True
            if 'blob' in doc['doc']:
                doc['doc']['signedContent'] = doc['doc']['blob']

        return to_validate

    monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        sign_response = b64encode(b'Dummy Sign Response').decode('utf8')

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'},
        }

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        return client.post(
            '/sign/get-signed',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )


def test_get_signed_documents(client, monkeypatch):
    response = _test_get_signed_documents(client, monkeypatch)

    assert response.status == '200 OK'

    signed_content = b64encode(b'Dummy signed content')

    assert signed_content in response.data


def test_get_signed_documents_process_error(client, monkeypatch):
    process_data = {'errorCode': 'error.dss', 'message': 'dummy message'}

    response = _test_get_signed_documents(client, monkeypatch, process_data=process_data)

    assert response.status == '200 OK'

    assert b'dummy message' in response.data


def test_get_signed_documents_post_raises(client, monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        raise Exception("ho ho ho")

    monkeypatch.setattr(APIClient, '_post', mock_post)

    def mock_validate(self, to_validate):
        for doc in to_validate:
            doc['validated'] = True
            doc['doc']['signedContent'] = doc['doc']['blob']

        return to_validate

    monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        sign_response = b64encode(b'Dummy Sign Response').decode('utf8')

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'},
        }

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        response = client.post(
            '/sign/get-signed',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'

        resp_data = json.loads(response.data)

        assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def _get_signed_documents(client, monkeypatch, data_payload, csrf_token=None):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    from edusign_webapp.api_client import APIClient

    def mock_validate(self, to_validate):
        for doc in to_validate:
            doc['validated'] = True
            doc['doc']['signedContent'] = doc['doc']['blob']

        return to_validate

    monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)

    if csrf_token is None:
        with client.session_transaction() as sess:
            csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
            user_key = sess['user_key']

            doc_data = {
                'csrf_token': csrf_token,
                'payload': data_payload,
            }
            if csrf_token == 'rm':
                del doc_data['csrf_token']

            from flask.sessions import SecureCookieSession

            def mock_getitem(self, key):
                if key == 'user_key':
                    return user_key
                self.accessed = True
                return super(SecureCookieSession, self).__getitem__(key)

            monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

            response = client.post(
                '/sign/get-signed',
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://test.localhost',
                    'X-Forwarded-Host': 'test.localhost',
                },
                json=doc_data,
            )

            assert response.status == '200 OK'

            return json.loads(response.data)

    else:
        with client.session_transaction():
            user_key = 'dummy key'

            doc_data = {
                'csrf_token': csrf_token,
                'payload': data_payload,
            }
            if csrf_token == 'rm':
                del doc_data['csrf_token']

            from flask.sessions import SecureCookieSession

            def mock_getitem(self, key):
                if key == 'user_key':
                    return user_key
                self.accessed = True
                return super(SecureCookieSession, self).__getitem__(key)

            monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

            response = client.post(
                '/sign/get-signed',
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://test.localhost',
                    'X-Forwarded-Host': 'test.localhost',
                },
                json=doc_data,
            )

            assert response.status == '200 OK'

            return json.loads(response.data)


def test_get_signed_documents_no_sign_response(client, monkeypatch):
    data = {'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'}
    resp_data = _get_signed_documents(client, monkeypatch, data)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )


def test_get_signed_documents_empty_sign_response(client, monkeypatch):
    data = {'sign_response': '', 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'}
    resp_data = _get_signed_documents(client, monkeypatch, data)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )


def test_get_signed_documents_no_relay_state(client, monkeypatch):
    sign_response = b64encode(b'Dummy Sign Response').decode('utf8')
    data = {'sign_response': sign_response}
    resp_data = _get_signed_documents(client, monkeypatch, data)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )


def test_get_signed_documents_empty_relay_state(client, monkeypatch):
    sign_response = b64encode(b'Dummy Sign Response').decode('utf8')
    data = {'sign_response': sign_response, 'relay_state': ''}
    resp_data = _get_signed_documents(client, monkeypatch, data)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )


def test_get_signed_documents_no_csrf(client, monkeypatch):
    sign_response = b64encode(b'Dummy Sign Response').decode('utf8')
    data = {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'}
    resp_data = _get_signed_documents(client, monkeypatch, data, csrf_token='rm')

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )


def test_get_signed_documents_wrong_csrf(client, monkeypatch):
    sign_response = b64encode(b'Dummy Sign Response').decode('utf8')
    data = {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'}
    resp_data = _get_signed_documents(client, monkeypatch, data, csrf_token='wrong csrf token')

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )
