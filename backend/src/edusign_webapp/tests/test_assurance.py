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


def _test_assurance(
    app_and_client, monkeypatch, sample_doc_1, mock_get_loa
):
    app, client = app_and_client

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    with client.session_transaction():

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'eduPersonAssurance':
                return []
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        monkeypatch.setattr(app.extensions['doc_store'], 'get_loa', mock_get_loa)

        sign_request_data = app.extensions['api_client']._get_sign_request_data([sample_doc_1])

        return sign_request_data['authnRequirements']['requestedSignerAttributes']


def test_assurance_none(
    app_and_client, monkeypatch, sample_doc_1
):

    mock_get_loa = lambda x: 'none'

    requested_attrs = _test_assurance(
        app_and_client, monkeypatch, sample_doc_1, mock_get_loa
    )
    for attr in requested_attrs:
        assert attr['name'] != 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11'


def test_assurance_al1(
    app_and_client, monkeypatch, sample_doc_1
):

    mock_get_loa = lambda x: 'low'

    requested_attrs = _test_assurance(
        app_and_client, monkeypatch, sample_doc_1, mock_get_loa
    )
    for attr in requested_attrs:
        if attr['name'] == 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11':
            assert attr['value'] == 'http://www.swamid.se/policy/assurance/al1'


def test_assurance_al2(
    app_and_client, monkeypatch, sample_doc_1
):

    mock_get_loa = lambda x: 'medium'

    requested_attrs = _test_assurance(
        app_and_client, monkeypatch, sample_doc_1, mock_get_loa
    )
    for attr in requested_attrs:
        if attr['name'] == 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11':
            assert attr['value'] == 'http://www.swamid.se/policy/assurance/al2'


def test_assurance_al3(
    app_and_client, monkeypatch, sample_doc_1
):

    mock_get_loa = lambda x: 'high'

    requested_attrs = _test_assurance(
        app_and_client, monkeypatch, sample_doc_1, mock_get_loa
    )
    for attr in requested_attrs:
        if attr['name'] == 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11':
            assert attr['value'] == 'http://www.swamid.se/policy/assurance/al3'


invitation_flags = [
    True,  # sendsigned
    'none',  # loa
    False,  # skipfinal
    False,  # ordered
    'Invitation text',  # invitation_text
]

headers = {
    'Edupersonprincipalname-20': 'invite0@example.org',
    'Mail-20': 'invite0@example.org',
    'Displayname-20': 'invite0'
}


def test_get_invitations_no_loa(
    monkeypatch, environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    _, doc_store = doc_store_local_sqlite
    app, client = app_and_client

    client.environ_base.update(environ_base)

    with app.test_request_context(headers=headers):

            from flask.sessions import SecureCookieSession

            def mock_getitem(self, key):
                if key == 'eduPersonAssurance':
                    return []
                elif key == 'mail':
                    return 'invite0@example.org'
                self.accessed = True
                return super(SecureCookieSession, self).__getitem__(key)

            monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

            doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)

            from edusign_webapp.utils import add_attributes_to_session, get_invitations

            add_attributes_to_session()
            invitations = get_invitations()

            assert invitations == []
