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


def _test_remove_multi_sign_request(client, monkeypatch, sample_doc_1):
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
                'document': sample_doc_1,
                'owner': 'tester@example.org',
                'text': 'Dummy invitation text',
                'sendsigned': True,
                'skipfinal': False,
                'loa': 'low',
                'ordered': False,
                'invites': [
                    {'name': 'invite0', 'email': 'invite0@example.org', 'lang': 'en'},
                    {'name': 'invite1', 'email': 'invite1@example.org', 'lang': 'en'},
                ],
            },
        }

        response = client.post(
            '/sign/create-multi-sign',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'

        rm_data = {
            'csrf_token': csrf_token,
            'payload': {
                'key': sample_doc_1['key'],
            },
        }

        response = client.post(
            '/sign/remove-multi-sign',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=rm_data,
        )

        return json.loads(response.data)


def test_remove_multi_sign_request(client, monkeypatch, sample_doc_1):
    resp_data = _test_remove_multi_sign_request(client, monkeypatch, sample_doc_1)

    assert resp_data['message'] == 'Success removing invitation to sign'


def _test_remove_multi_sign_request_with_problem(client, monkeypatch, sample_doc_1, mock_remove):
    from edusign_webapp.doc_store import DocStore

    monkeypatch.setattr(DocStore, 'remove_document', mock_remove)

    return _test_remove_multi_sign_request(client, monkeypatch, sample_doc_1)


def test_remove_multi_sign_request_raises(client, monkeypatch, sample_doc_1):
    def mock_remove(*args, **kwargs):
        raise Exception()

    resp_data = _test_remove_multi_sign_request_with_problem(client, monkeypatch, sample_doc_1, mock_remove)

    assert resp_data['message'] == 'Problem removing the invitation, please try again'


def test_remove_multi_sign_request_doesnt(client, monkeypatch, sample_doc_1):
    def mock_remove(*args, **kwargs):
        return False

    resp_data = _test_remove_multi_sign_request_with_problem(client, monkeypatch, sample_doc_1, mock_remove)

    assert resp_data['message'] == 'Problem removing the invitation, please try again'
