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
import uuid

from edusign_webapp import run
from edusign_webapp.marshal import ResponseSchema


def test_create_sign_request(client, monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        return {
            'binding': 'POST/XML/1.0',
            'destinationUrl': 'https://sig.idsec.se/sigservice-dev/request',
            'relayState': '31dc573b-ab7d-496c-845e-cae8792ba063',
            'signRequest': 'DUMMY SIGN REQUEST',
            'state': {'id': '31dc573b-ab7d-496c-845e-cae8792ba063'},
        }

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {
                'documents': [
                    {
                        'key': str(uuid.uuid4()),
                        'name': 'test.pdf',
                        'type': 'application/pdf',
                        'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                        'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
                    }
                ]
            },
        }

        response = client.post(
            '/sign/create-sign-request',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'

        resp_data = json.loads(response.data)

        assert resp_data['payload']['documents'][0]['name'] == 'test.pdf'
        assert resp_data['payload']['relay_state'] == '31dc573b-ab7d-496c-845e-cae8792ba063'


def test_create_sign_request_post_raises(client, monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        raise Exception("Mock error POSTing to the API")

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {
                'documents': [
                    {
                        'key': str(uuid.uuid4()),
                        'name': 'test.pdf',
                        'type': 'application/pdf',
                        'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                        'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
                    }
                ]
            },
        }

        response = client.post(
            '/sign/create-sign-request',
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


def _create_sign_request(client, monkeypatch, data_payload, csrf_token=None):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    if csrf_token is None:
        with client.session_transaction() as sess:
            csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
            user_key = sess['user_key']

            from flask.sessions import SecureCookieSession

            def mock_getitem(self, key):
                if key == 'user_key':
                    return user_key
                self.accessed = True
                return super(SecureCookieSession, self).__getitem__(key)

            monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

            doc_data = {
                'csrf_token': csrf_token,
                'payload': data_payload,
            }

            if csrf_token == 'rm':
                del doc_data['csrf_token']

            response = client.post(
                '/sign/create-sign-request',
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
            user_key = 'dummy-key'

            from flask.sessions import SecureCookieSession

            def mock_getitem(self, key):
                if key == 'user_key':
                    return user_key
                self.accessed = True
                return super(SecureCookieSession, self).__getitem__(key)

            monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

            doc_data = {
                'csrf_token': csrf_token,
                'payload': data_payload,
            }

            if csrf_token == 'rm':
                del doc_data['csrf_token']

            response = client.post(
                '/sign/create-sign-request',
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://test.localhost',
                    'X-Forwarded-Host': 'test.localhost',
                },
                json=doc_data,
            )

            assert response.status == '200 OK'

            return json.loads(response.data)


def test_create_sign_request_doc_no_name(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'type': 'application/pdf',
                'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_no_ref(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_invalid_ref_1(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': '6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_invalid_ref_2(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': 'invalid ref',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_invalid_sign_req_1(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': '{"page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_invalid_sign_req_2(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_invalid_sign_req_3(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': 'invalid sign requirement',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_no_csrf(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload, csrf_token='rm')

    assert resp_data['error']
    assert resp_data['message'] == "There was an error. Please try again, or contact the site administrator."


def test_create_sign_request_doc_wrong_csrf(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload, csrf_token='wrong csrf token')

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_expired(client, monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        return {
            'status': 400,
            'message': 'not found in cache',
        }

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {
                'documents': [
                    {
                        'key': str(uuid.uuid4()),
                        'name': 'test.pdf',
                        'type': 'application/pdf',
                        'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                        'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
                    }
                ]
            },
        }

        response = client.post(
            '/sign/create-sign-request',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'

        resp_data = json.loads(response.data)

        assert resp_data['error']
        assert resp_data['message'] == 'expired cache'


def test_create_sign_request_doc_no_key(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'ref': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_doc_invalid_key(client, monkeypatch):
    data_payload = {
        'documents': [
            {
                'key': 'invalid key',
                'ref': str(uuid.uuid4()),
                'name': 'test.pdf',
                'type': 'application/pdf',
                'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
            }
        ]
    }
    resp_data = _create_sign_request(client, monkeypatch, data_payload)

    assert resp_data['error']
    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def test_create_sign_request_bad_api_response(client, monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        return {'errorCode': 'dummy code', 'message': 'dummy message'}

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {
                'documents': [
                    {
                        'key': str(uuid.uuid4()),
                        'name': 'test.pdf',
                        'type': 'application/pdf',
                        'ref': 'd2a05a27-6913-47ed-82f5-fd0e89ee5f07',
                        'sign_requirement': '{"fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"}, "page": 2, "scale": -74, "signerName": {"formatting": null, "signerAttributes": [{"name": "urn:oid:2.5.4.42"}, {"name": "urn:oid:2.5.4.4"}, {"name": "urn:oid:0.9.2342.19200300.100.1.3"}]}, "templateImageRef": "eduSign-image", "xposition": 37, "yposition": 165}',
                    }
                ]
            },
        }

        response = client.post(
            '/sign/create-sign-request',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'

        resp_data = json.loads(response.data)

        assert resp_data['message'] == 'dummy message'
        assert resp_data['error']
