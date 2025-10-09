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
    False,  # allowbankid
    'Invitation text',  # invitation_text
]

headers = {
    'Md-Organizationname': 'eduID Sweden',
    'Md-Registrationauthority': 'http://www.swamid.se/',
    'Edupersonprincipalname-20': 'invite0@example.org',
    'Mail-20': 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aW52aXRlMEBleGFtcGxlLm9yZzwvbnMxOkF0dHJpYnV0ZVZhbHVlPg==',
    'Displayname-20': 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aW52aXRlMDwvbnMxOkF0dHJpYnV0ZVZhbHVlPg=='
}


def _test_get_invitations_loa(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1, headers, invitation_flags
):
    _, doc_store = doc_store_local_sqlite
    app, client = app_and_client

    client.environ_base.update(environ_base)

    with app.test_request_context(headers=headers):
        with client.session_transaction():

            doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)

            from edusign_webapp.utils import add_attributes_to_session, get_invitations

            add_attributes_to_session()
            return get_invitations()


def test_get_invitations_none_no_loa(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    if 'Edupersonassurance-20' in headers:
        del headers['Edupersonassurance-20']
    invitation_flags[1] = 'none'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'unconfirmed'


def test_get_invitations_low_no_loa(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    if 'Edupersonassurance-20' in headers:
        del headers['Edupersonassurance-20']
    invitation_flags[1] = 'low'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def test_get_invitations_low_al1(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL1
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDE8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'low'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'unconfirmed'


def test_get_invitations_low_many(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL1 and more
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDE8L25zMTpBdHRyaWJ1dGVWYWx1ZT4=;PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cHM6Ly9yZWZlZHMub3JnL2Fzc3VyYW5jZTwvbnMxOkF0dHJpYnV0ZVZhbHVlPg==;PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cHM6Ly9yZWZlZHMub3JnL2Fzc3VyYW5jZS9JRC91bmlxdWU8L25zMTpBdHRyaWJ1dGVWYWx1ZT4=;PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cHM6Ly9yZWZlZHMub3JnL2Fzc3VyYW5jZS9JRC9lcHBuLXVuaXF1ZS1uby1yZWFzc2lnbjwvbnMxOkF0dHJpYnV0ZVZhbHVlPg==;PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cHM6Ly9yZWZlZHMub3JnL2Fzc3VyYW5jZS9JQVAvbG93PC9uczE6QXR0cmlidXRlVmFsdWU+'
    invitation_flags[1] = 'low'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'unconfirmed'


def test_get_invitations_medium_al1(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL1
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDE8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'medium'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def test_get_invitations_medium_al2(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL2
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDI8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'medium'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'unconfirmed'


def test_get_invitations_medium_al3(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL3
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDM8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'medium'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def test_get_invitations_high_al3(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL3
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDM8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'high'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'unconfirmed'


def test_get_invitations_high_no_loa(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    if 'Edupersonassurance-20' in headers:
        del headers['Edupersonassurance-20']
    invitation_flags[1] = 'high'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def test_get_invitations_high_al1(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL1
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDE8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'high'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def test_get_invitations_high_al2(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    # SWAMID AL2
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDI8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    invitation_flags[1] = 'high'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def test_get_invitations_medium_no_loa(
    environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    if 'Edupersonassurance-20' in headers:
        del headers['Edupersonassurance-20']
    invitation_flags[1] = 'medium'
    invitations = _test_get_invitations_loa(environ_base, app_and_client, doc_store_local_sqlite, sample_doc_1,
                                            sample_owner_1, sample_invites_1, headers, invitation_flags)

    assert invitations['pending_multisign'][0]['state'] == 'failed-loa'


def _test_sign_personal(
    environ_base, app_and_client, sample_doc_1, headers
):
    app, client = app_and_client

    client.environ_base.update(environ_base)

    with app.test_request_context(headers=headers):
        with client.session_transaction():

            from edusign_webapp.utils import add_attributes_to_session

            add_attributes_to_session()
            return app.extensions['api_client']._get_sign_request_data([sample_doc_1])


def test_sign_personal_no_loa(
    environ_base, app_and_client, sample_doc_1
):
    if 'Edupersonassurance-20' in headers:
        del headers['Edupersonassurance-20']
    sign_request_data = _test_sign_personal(environ_base, app_and_client, sample_doc_1, headers)

    for attr in sign_request_data['authnRequirements']['requestedSignerAttributes']:
        assert attr['name'] != 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11'


def test_sign_personal_al1(
    environ_base, app_and_client, sample_doc_1
):
    # SWAMID AL1
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDE8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    sign_request_data = _test_sign_personal(environ_base, app_and_client, sample_doc_1, headers)

    for attr in sign_request_data['authnRequirements']['requestedSignerAttributes']:
        assert attr['name'] != 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11'


def test_sign_personal_al2(
    environ_base, app_and_client, sample_doc_1
):
    # SWAMID AL2
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDI8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    sign_request_data = _test_sign_personal(environ_base, app_and_client, sample_doc_1, headers)

    for attr in sign_request_data['authnRequirements']['requestedSignerAttributes']:
        assert attr['name'] != 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11'


def test_sign_personal_al3(
    environ_base, app_and_client, sample_doc_1
):
    # SWAMID AL3
    headers['Edupersonassurance-20'] = 'PG5zMTpBdHRyaWJ1dGVWYWx1ZSB4bWxuczpuczE9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIHhtbG5zOnhzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeHNpOnR5cGU9InhzOnN0cmluZyI+aHR0cDovL3d3dy5zd2FtaWQuc2UvcG9saWN5L2Fzc3VyYW5jZS9hbDM8L25zMTpBdHRyaWJ1dGVWYWx1ZT4='
    sign_request_data = _test_sign_personal(environ_base, app_and_client, sample_doc_1, headers)

    for attr in sign_request_data['authnRequirements']['requestedSignerAttributes']:
        assert attr['name'] != 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11'
