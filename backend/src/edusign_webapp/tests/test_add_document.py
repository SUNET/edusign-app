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

from edusign_webapp import run
from edusign_webapp.marshal import ResponseSchema


def test_add_document(client, monkeypatch):

    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
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

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with run.app.test_request_context():
        with client.session_transaction() as sess:

            csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
            user_key = sess['user_key']

    doc_data = {
        'csrf_token': csrf_token,
        'payload': {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'},
    }

    from flask.sessions import SecureCookieSession

    def mock_getitem(self, key):
        if key == 'user_key':
            return user_key
        self.accessed = True
        return super(SecureCookieSession, self).__getitem__(key)

    monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

    response = client.post(
        '/sign/add-doc',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert resp_data['payload']['ref'] == 'ba26478f-f8e0-43db-991c-08af7c65ed58'


def test_add_document_error_preparing(client, monkeypatch):

    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        raise Exception("Mocking an error posting to the API")

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with run.app.test_request_context():
        with client.session_transaction() as sess:

            csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
            user_key = sess['user_key']

    doc_data = {
        'csrf_token': csrf_token,
        'payload': {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'},
    }

    from flask.sessions import SecureCookieSession

    def mock_getitem(self, key):
        if key == 'user_key':
            return user_key
        self.accessed = True
        return super(SecureCookieSession, self).__getitem__(key)

    monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

    response = client.post(
        '/sign/add-doc',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert resp_data['message'] == 'Communication error with the prepare endpoint of the eduSign API'


def _add_document_missing_data(client, monkeypatch, data, csrf_token=None):

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    if csrf_token is None:
        with run.app.test_request_context():
            with client.session_transaction() as sess:

                csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
                user_key = sess['user_key']
    else:
        user_key = 'dummy key'

    doc_data = {
        'csrf_token': csrf_token,
        'payload': data,
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
        '/sign/add-doc',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    return json.loads(response.data)


def test_add_document_missing_doc_name(client, monkeypatch):
    data = {'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "name: Missing data for required field"


def test_add_document_empty_doc_name(client, monkeypatch):
    data = {'name': '', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "name: Missing value for required field"


def test_add_document_missing_doc_size(client, monkeypatch):
    data = {'name': 'test.pdf', 'type': 'application/pdf', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "size: Missing data for required field"


def test_add_document_bad_doc_size(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 'not an int', 'type': 'application/pdf', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "size: Not a valid integer"


def test_add_document_missing_doc_type(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 100, 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "type: Missing data for required field"


def test_add_document_bad_doc_type(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 100, 'type': 'text/plain', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "type: Invalid document type"


def test_add_document_missing_doc(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf'}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "blob: Missing data for required field"


def test_add_document_empty_doc(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': ''}
    resp_data = _add_document_missing_data(client, monkeypatch, data)

    assert resp_data['error']
    assert resp_data['message'] == "blob: Missing value for required field"


def test_add_document_missing_csrf(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data, csrf_token='rm')

    assert resp_data['error']
    assert resp_data['message'] == "csrf_token: Missing data for required field"


def test_add_document_wrong_csrf(client, monkeypatch):
    data = {'name': 'test.pdf', 'size': 100, 'type': 'application/pdf', 'blob': 'dummy,dummy'}
    resp_data = _add_document_missing_data(client, monkeypatch, data, csrf_token='wrong csrf token')

    assert resp_data['error']
    assert resp_data['message'] == "csrf_token: CSRF token failed to validate"
