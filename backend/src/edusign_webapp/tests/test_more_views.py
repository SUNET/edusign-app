# -*- coding: utf-8 -*-
#
# Copyright (c) 2026 SUNET
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
"""
Tests for the simpler views: landing pages, logout, callbacks,
admin and metrics views, form filling, and document locking.
"""

import json
import uuid
from base64 import b64encode

from edusign_webapp.marshal import ResponseSchema

invitation_flags = [
    True,  # sendsigned
    'none',  # loa
    False,  # skipfinal
    False,  # ordered
    False,  # allowbankid
    'Invitation text',  # invitation_text
]


def _csrf_post(client, monkeypatch, url, payload):
    response1 = client.get('/sign/')
    assert response1.status == '200 OK'

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        # read the real stored value, bypassing any previously patched
        # SecureCookieSession.__getitem__ from an earlier call to this helper
        user_key = dict.__getitem__(sess, 'user_key')

    from flask.sessions import SecureCookieSession

    def mock_getitem(self, key):
        if key == 'user_key':
            return user_key
        self.accessed = True
        return super(SecureCookieSession, self).__getitem__(key)

    monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

    return client.post(
        url,
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json={'csrf_token': csrf_token, 'payload': payload},
    )


def _add_document_as_tester_invite(client, doc, owner, tester_email='tester@example.org'):
    """Add a document to the doc store with the session user among the invited."""
    invites = [{'name': 'Tëster Kid', 'email': tester_email, 'ssn': '', 'lang': 'en'}]
    app = client.application
    with app.app_context():
        invitations = app.extensions['doc_store'].add_document(doc, owner, invites, *invitation_flags)
    return invitations


def test_home(client):
    response = client.get('/')
    assert response.status == '200 OK'


def test_home_eid(client):
    response = client.get(f'/home-eid/{uuid.uuid4()}')
    assert response.status == '200 OK'
    assert b'Shibboleth.sso/Login/BankID' in response.data
    assert b'Shibboleth.sso/Login/Freja' in response.data


def test_faq(client):
    response = client.get('/faq')
    assert response.status == '200 OK'


def test_logout(client):
    response = client.get('/sign/logout')
    assert response.status == '302 FOUND'
    assert response.location in ('/', 'http://test.localhost/')


def test_metadata(client):
    response = client.get('/metadata.xml')
    assert response.status == '200 OK'
    assert b'EntityDescriptor' in response.data


def test_index_missing_attributes(app):
    _, app = app
    client = app.test_client()
    response = client.get('/sign/')
    assert response.status == '200 OK'
    assert b'Missing information' in response.data


def test_index_missing_attributes_bankid_org(app):
    _, app = app
    client = app.test_client()
    client.environ_base.update({'HTTP_MD_ORGANIZATIONNAME': 'BankID TEST'})
    response = client.get('/sign/')
    assert response.status == '302 FOUND'


def test_index_missing_display_name(app, environ_base):
    from copy import deepcopy

    _, app = app
    environ = deepcopy(environ_base)
    del environ['HTTP_DISPLAYNAME_20']
    client = app.test_client()
    client.environ_base.update(environ)
    response = client.get('/sign/')
    assert response.status == '200 OK'
    assert b'Missing displayName' in response.data


def test_index_non_whitelisted(app, environ_base):
    from copy import deepcopy

    _, app = app
    environ = deepcopy(environ_base)
    environ['HTTP_EDUPERSONPRINCIPALNAME_20'] = 'dummy-eppn@other.org'
    client = app.test_client()
    client.environ_base.update(environ)
    response = client.get('/sign/')
    assert response.status == '200 OK'


def test_index_using_bankid_redirects_home(client):
    with client.session_transaction() as sess:
        sess['using-bankid'] = True

    response = client.get('/sign/')
    assert response.status == '302 FOUND'


def test_admin_cleanup_empty(client):
    response = client.post('/admin/cleanup')
    assert response.status == '200 OK'
    assert b'Removed 0 documents out of 0' in response.data


def test_admin_cleanup(client, sample_doc_1, sample_owner_1):
    _add_document_as_tester_invite(client, sample_doc_1, sample_owner_1)
    client.application.config['MAX_DOCUMENT_AGE'] = 0

    response = client.post('/admin/cleanup')
    assert response.status == '200 OK'
    assert b'Removed 1 documents out of 1' in response.data


def test_admin_id_service_usage(client):
    response = client.get('/admin/get-id-service-usage')
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert resp_data['payload']['orgs'] == []


def test_metrics(client, sample_doc_1, sample_owner_1):
    _add_document_as_tester_invite(client, sample_doc_1, sample_owner_1)

    response = client.get('/sign/metrics')
    assert response.status == '200 OK'
    assert b'Number of documents: 1' in response.data


def test_callback_get_redirects(client):
    response = client.get('/sign/callback')
    assert response.status == '302 FOUND'


def test_callback_post(client):
    response = client.post(
        '/sign/callback',
        data={
            'EidSignResponse': b64encode(b'Dummy Sign Response').decode('ascii'),
            'RelayState': str(uuid.uuid4()),
        },
    )
    assert response.status == '200 OK'
    assert b'sign-response' in response.data


def test_callback_post_missing_data(client):
    response = client.post('/sign/callback', data={})
    assert response.status == '400 BAD REQUEST'


def test_callback_post_invalid_data(client):
    response = client.post(
        '/sign/callback',
        data={'EidSignResponse': 'ñot-b64!!', 'RelayState': str(uuid.uuid4())},
    )
    assert response.status == '400 BAD REQUEST'


def test_callback_eid_get_redirects(client):
    invite_key = str(uuid.uuid4())
    with client.session_transaction() as sess:
        sess['using-freja'] = True
        sess['using-bankid'] = False

    response = client.get(f'/sign/callback-eid/{invite_key}')
    assert response.status == '302 FOUND'
    assert f'/sign/freja/{invite_key}' in response.location

    with client.session_transaction() as sess:
        sess['using-freja'] = False
        sess['using-bankid'] = True

    response = client.get(f'/sign/callback-eid/{invite_key}')
    assert response.status == '302 FOUND'
    assert f'/sign/bankid/{invite_key}' in response.location


def test_callback_eid_post(client):
    response = client.post(
        f'/sign/callback-eid/{uuid.uuid4()}',
        data={
            'EidSignResponse': b64encode(b'Dummy Sign Response').decode('ascii'),
            'RelayState': str(uuid.uuid4()),
        },
    )
    assert response.status == '200 OK'


def test_test_api_callback(app):
    _, app = app
    client = app.test_client()

    app.config['DEBUG'] = False
    response = client.post('/test-api-callback', data={'EidSignResponse': 'x', 'RelayState': 'y'})
    assert response.status == '404 NOT FOUND'

    app.config['DEBUG'] = True
    response = client.post('/test-api-callback', data={'EidSignResponse': 'x', 'RelayState': 'y'})
    if app.config['ENVIRONMENT'] in ('development', 'e2e'):
        assert response.status == '200 OK'
        assert response.data == b'OK'
    else:
        assert response.status == '404 NOT FOUND'


def test_emails_view(app):
    _, app = app
    client = app.test_client()

    response = client.get('/sign/emails')
    assert response.status == '404 NOT FOUND'

    app.config['ENVIRONMENT'] = 'e2e'
    app.extensions['email_msgs'] = {'messages': [{'message': 'dummy message'}]}
    response = client.get('/sign/emails')
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert resp_data['payload']['messages'] == [{'message': 'dummy message'}]
    assert app.extensions['email_msgs'] == {}


def test_receive_sign_request(app):
    _, app = app
    client = app.test_client()

    if app.config['ENVIRONMENT'].startswith('pro'):
        response = client.get('/sign/receive-sign-request')
        assert response.status == '404 NOT FOUND'
    else:
        response = client.get('/sign/receive-sign-request')
        assert response.status == '200 OK'

        response = client.post(
            '/sign/receive-sign-request',
            data={'Binding': 'dummy', 'RelayState': 'dummy', 'EidSignResponse': 'dummy'},
        )
        assert response.status == '200 OK'
        resp_data = json.loads(response.data)
        assert resp_data['message'] == 'OK'


def test_config_eid_no_session(client):
    response = client.get(f'/sign/config-eid/{uuid.uuid4()}')
    assert response.status == '403 FORBIDDEN'


def test_update_form(client, monkeypatch, sample_form_1):
    fields = [{'name': 'Given Name Text Box', 'value': 'Tester'}]
    response = _csrf_post(
        client,
        monkeypatch,
        '/sign/update-form',
        {'document': sample_form_1['pdf'], 'form_fields': fields},
    )
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert not resp_data.get('error', False)
    assert len(resp_data['payload']['document']) > 0


def test_update_form_error(client, monkeypatch):
    fields = [{'name': 'Some Field', 'value': 'Some value'}]
    response = _csrf_post(
        client,
        monkeypatch,
        '/sign/update-form',
        {'document': b64encode(b'not a pdf').decode('ascii'), 'form_fields': fields},
    )
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert resp_data['error']


def test_lock_and_unlock_document(client, monkeypatch, sample_doc_1, sample_owner_1):
    _add_document_as_tester_invite(client, sample_doc_1, sample_owner_1)

    response = _csrf_post(client, monkeypatch, '/sign/lock-doc', {'key': sample_doc_1['key']})
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert not resp_data.get('error', False)

    response = _csrf_post(client, monkeypatch, '/sign/unlock-doc', {'key': sample_doc_1['key']})
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert not resp_data.get('error', False)


def test_delegate_invitation(client, monkeypatch, sample_doc_1, sample_owner_1):
    invitations = _add_document_as_tester_invite(client, sample_doc_1, sample_owner_1)
    invite_key = invitations[0]['key']

    response = _csrf_post(
        client,
        monkeypatch,
        '/sign/delegate-invitation',
        {
            'invite_key': invite_key,
            'document_key': sample_doc_1['key'],
            'name': 'Delegated Person',
            'email': 'delegated@example.org',
            'lang': 'en',
            'ssn': '',
        },
    )
    assert response.status == '200 OK'
    resp_data = json.loads(response.data)
    assert not resp_data.get('error', False)
