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


def test_recreate_sign_request(client, monkeypatch, sample_doc_1):
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
                }
            },
        }

        response = client.post(
            '/sign/recreate-sign-request',
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


def _recreate_sign_request_post_raises(client, monkeypatch, sample_doc_1, raise_on_prepare=True):
    from edusign_webapp.api_client import APIClient

    def mock_post(self, url, *args, **kwargs):
        if 'prepare' in url:
            if raise_on_prepare:
                raise Exception("Mock error in the API")
            else:
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

        raise Exception("Mock error in the API")

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
                }
            },
        }

        response = client.post(
            '/sign/recreate-sign-request',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'

        return json.loads(response.data)


def test_recreate_sign_request_post_raises_on_prepare(client, monkeypatch, sample_doc_1):
    resp_data = _recreate_sign_request_post_raises(client, monkeypatch, sample_doc_1, raise_on_prepare=True)

    assert (
        resp_data['payload']['failed'][0]['message']
        == 'There was an error. Please try again, or contact the site administrator.'
    )


def test_recreate_sign_request_post_raises_on_create(client, monkeypatch, sample_doc_1):
    resp_data = _recreate_sign_request_post_raises(client, monkeypatch, sample_doc_1, raise_on_prepare=False)

    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def _recreate_sign_request(client, monkeypatch, payload_data, csrf_token=None):
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
                'payload': payload_data,
            }
            if csrf_token == 'rm':
                del doc_data['csrf_token']

            response = client.post(
                '/sign/recreate-sign-request',
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
            user_key = "dummy key"

            from flask.sessions import SecureCookieSession

            def mock_getitem(self, key):
                if key == 'user_key':
                    return user_key
                self.accessed = True
                return super(SecureCookieSession, self).__getitem__(key)

            monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

            doc_data = {
                'csrf_token': csrf_token,
                'payload': payload_data,
            }
            if csrf_token == 'rm':
                del doc_data['csrf_token']

            response = client.post(
                '/sign/recreate-sign-request',
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://test.localhost',
                    'X-Forwarded-Host': 'test.localhost',
                },
                json=doc_data,
            )

            assert response.status == '200 OK'

            return json.loads(response.data)


def test_recreate_sign_request_no_name(client, monkeypatch, sample_doc_1):
    payload_data = {
        'documents': {
            'local': [
                {'size': 100, 'type': 'application/pdf', 'blob': sample_doc_1['blob'], 'key': sample_doc_1['key']}
            ],
            'owned': [],
            'invited': [],
        }
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_empty_name(client, monkeypatch):
    payload_data = {
        'documents': [
            {'name': '', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy', 'key': str(uuid.uuid4())}
        ]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_no_size(client, monkeypatch):
    payload_data = {
        'documents': [{'name': 'test.pdf', 'type': 'application/pdf', 'blob': 'dummy,dummy', 'key': str(uuid.uuid4())}]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_invalid_size(client, monkeypatch):
    payload_data = {
        'documents': [
            {
                'name': 'test.pdf',
                'size': 'invalid size',
                'type': 'application/pdf',
                'blob': 'dummy,dummy',
                'key': str(uuid.uuid4()),
            }
        ]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_no_type(client, monkeypatch):
    payload_data = {'documents': [{'name': 'test.pdf', 'size': 100, 'blob': 'dummy,dummy', 'key': str(uuid.uuid4())}]}
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_empty_type(client, monkeypatch):
    payload_data = {
        'documents': [{'name': 'test.pdf', 'size': 100, 'type': '', 'blob': 'dummy,dummy', 'key': str(uuid.uuid4())}]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_invalid_type(client, monkeypatch):
    payload_data = {
        'documents': [
            {'name': 'test.pdf', 'size': 100, 'type': 'text/plain', 'blob': 'dummy,dummy', 'key': str(uuid.uuid4())}
        ]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_no_blob(client, monkeypatch):
    payload_data = {
        'documents': [{'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'key': str(uuid.uuid4())}]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_empty_blob(client, monkeypatch):
    payload_data = {
        'documents': [
            {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': '', 'key': str(uuid.uuid4())}
        ]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_no_csrf(client, monkeypatch, sample_doc_1, csrf_token='rm'):
    payload_data = {
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
        }
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data, csrf_token='rm')

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_wrong_csrf(client, monkeypatch, sample_doc_1, csrf_token='rm'):
    payload_data = {
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
        }
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data, csrf_token='wrong token')

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_no_key(client, monkeypatch):
    payload_data = {'documents': [{'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'}]}
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_invalid_key(client, monkeypatch):
    payload_data = {
        'documents': [
            {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy', 'key': 'invalid key'}
        ]
    }
    resp_data = _recreate_sign_request(client, monkeypatch, payload_data)

    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_recreate_sign_request_bad_api_response(client, monkeypatch, sample_doc_1):
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

        return {'errorCode': 'dummy', 'message': 'dummy message'}

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
                }
            },
        }

        response = client.post(
            '/sign/recreate-sign-request',
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
        assert resp_data['message'] == 'dummy message'
