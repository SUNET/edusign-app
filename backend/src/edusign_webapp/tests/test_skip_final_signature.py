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


def _test_skip_final_signature(client, monkeypatch, sample_doc_1):
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

        from edusign_webapp.api_client import APIClient

        def mock_validate(self, to_validate):
            for doc in to_validate:
                doc['validated'] = True
                doc['doc']['signedContent'] = doc['doc']['blob']

            return to_validate

        monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)

        doc_data = {
            'csrf_token': csrf_token,
            'payload': {
                'document': sample_doc_1,
                'owner': 'tester@example.org',
                'text': 'Dummy invitation text',
                'sendsigned': True,
                'skipfinal': False,
                'ordered': False,
                'allowbankid': False,
                'loa': 'low',
                'invites': [
                    {'name': 'invite0', 'email': 'invite0@example.org', 'lang': 'en', 'ssn': ''},
                    {'name': 'invite1', 'email': 'invite1@example.org', 'lang': 'en', 'ssn': ''},
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

        skip_final_data = {
            'csrf_token': csrf_token,
            'payload': {
                'key': sample_doc_1['key'],
            },
        }

        response = client.post(
            '/sign/skip-final-signature',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=skip_final_data,
        )

        return json.loads(response.data)


def test_skip_final_signature(client, monkeypatch, sample_doc_1):
    resp_data = _test_skip_final_signature(client, monkeypatch, sample_doc_1)

    assert resp_data['payload']['documents'][0]['id'] == sample_doc_1['key']


def _test_skip_final_signature_with_problem(client, monkeypatch, sample_doc_1, mock_get_signed):
    from edusign_webapp.doc_store import DocStore

    monkeypatch.setattr(DocStore, 'get_signed_document', mock_get_signed)

    return _test_skip_final_signature(client, monkeypatch, sample_doc_1)


def test_get_partially_signed_raises_getting(client, monkeypatch, sample_doc_1):
    def mock_get_signed(*args, **kwargs):
        raise Exception()

    resp_data = _test_skip_final_signature_with_problem(client, monkeypatch, sample_doc_1, mock_get_signed)

    assert resp_data['message'] == 'Cannot find the document being signed'


def test_get_partially_signed_raises_removing(client, monkeypatch, sample_doc_1):
    def mock_get_signed(*args, **kwargs):
        raise Exception()

    from edusign_webapp.doc_store import DocStore

    monkeypatch.setattr(DocStore, 'remove_document', mock_get_signed)

    resp_data = _test_skip_final_signature(client, monkeypatch, sample_doc_1)

    assert resp_data['message'] == 'Success'


def test_get_partially_signed_doesnt(client, monkeypatch, sample_doc_1):
    def mock_get_signed(*args, **kwargs):
        return False

    resp_data = _test_skip_final_signature_with_problem(client, monkeypatch, sample_doc_1, mock_get_signed)

    assert resp_data['message'] == 'Cannot find the document being signed'

_seed_flags = [True, 'none', False, False, False, 'Invitation text']


def _seed_and_post_skip(client, monkeypatch, sample_doc_1, sample_owner_1):
    """Seed a doc owned by someone else, then POST skip-final-signature as the session user."""
    response1 = client.get('/sign/')
    assert response1.status == '200 OK'

    app = client.application
    with app.app_context():
        invites = [{'name': 'invite0', 'email': 'invite0@example.org', 'ssn': '', 'lang': 'en'}]
        app.extensions['doc_store'].add_document(sample_doc_1, sample_owner_1, invites, *_seed_flags)

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

    from flask.sessions import SecureCookieSession

    def mock_getitem(self, k):
        if k == 'user_key':
            return user_key
        self.accessed = True
        return super(SecureCookieSession, self).__getitem__(k)

    monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

    response = client.post(
        '/sign/skip-final-signature',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json={'csrf_token': csrf_token, 'payload': {'key': sample_doc_1['key']}},
    )
    return json.loads(response.data)


def test_skip_final_signature_denied_for_non_owner(client, monkeypatch, sample_doc_1, sample_owner_1):
    import uuid

    resp_data = _seed_and_post_skip(client, monkeypatch, sample_doc_1, sample_owner_1)

    assert resp_data['message'] == 'Cannot find the document being signed'
    # the document must not have been removed
    with client.application.app_context():
        owner = client.application.extensions['doc_store'].get_owner_data(uuid.UUID(sample_doc_1['key']))
    assert owner.get('email') == sample_owner_1['email']
