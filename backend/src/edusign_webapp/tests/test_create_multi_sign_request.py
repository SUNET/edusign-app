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

from edusign_webapp.marshal import ResponseSchema


def _test_create_multi_sign_request(app, environ_base, monkeypatch, sample_doc_1, doc_data, mock_add_document=None):

    _, app = app

    client = app.test_client()
    client.environ_base.update(environ_base)

    if mock_add_document is not None:
        from edusign_webapp.doc_store import DocStore
        monkeypatch.setattr(DocStore, 'add_document', mock_add_document)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with app.test_request_context():
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

    doc_data['csrf_token'] = csrf_token

    return client.post(
        '/sign/create-multi-sign',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )


def test_create_multi_sign_request(app, environ_base, monkeypatch, sample_doc_1):

    doc_data = {
        'payload': {
            'document': sample_doc_1,
            'owner': 'tester@example.org',
            'invites': [
                {'name': 'invite0', 'email': 'invite0@example.org'},
                {'name': 'invite1', 'email': 'invite1@example.org'},
            ],
        },
    }

    response = _test_create_multi_sign_request(app, environ_base, monkeypatch, sample_doc_1, doc_data)

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert resp_data['message'] == 'Success creating multi signature request'


def test_create_multi_sign_request_raises(app, environ_base, monkeypatch, sample_doc_1):

    doc_data = {
        'payload': {
            'document': sample_doc_1,
            'owner': 'tester@example.org',
            'invites': [
                {'name': 'invite0', 'email': 'invite0@example.org'},
                {'name': 'invite1', 'email': 'invite1@example.org'},
            ],
        },
    }

    def mock_add_document(*args):
        raise Exception()

    response = _test_create_multi_sign_request(app, environ_base, monkeypatch, sample_doc_1, doc_data, mock_add_document=mock_add_document)

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert resp_data['message'] == 'Problem storing the document to be multi signed'


def test_create_multi_sign_wrong_owner(app, environ_base, monkeypatch, sample_doc_1):

    doc_data = {
        'payload': {
            'document': sample_doc_1,
            'owner': 'non-tester@example.org',
            'invites': [
                {'name': 'invite0', 'email': 'invite0@example.org'},
                {'name': 'invite1', 'email': 'invite1@example.org'},
            ],
        },
    }

    def mock_add_document(*args):
        raise Exception()

    response = _test_create_multi_sign_request(app, environ_base, monkeypatch, sample_doc_1, doc_data, mock_add_document=mock_add_document)

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert "You cannot invite as" in resp_data['message']
