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
Tests for the eID (BankID / Freja) views: the /sign/bankid/<key> and
/sign/freja/<key> index views, /sign/config-eid/<key>, the eID
callback, and the /home-eid/<key> landing page.
"""

import json
import os
import uuid
from base64 import b64encode

import pytest

invitation_flags = [
    True,  # sendsigned
    'none',  # loa
    False,  # skipfinal
    False,  # ordered
    False,  # allowbankid
    'Invitation text',  # invitation_text
]

_test_ssn = '199001019999'


def _xml_attr(value):
    return b64encode(f'<Attribute>{value}</Attribute>'.encode('utf8')).decode('ascii')


def _eid_environ(ssn=_test_ssn):
    """Headers as the Shibboleth SP sets them after a BankID / Freja login."""
    environ = {
        "HTTP_MD_ORGANIZATIONNAME": 'BankID TEST',
        "HTTP_DISPLAYNAME_20": _xml_attr('Tëster Kid'),
        "HTTP_SHIB_IDENTITY_PROVIDER": 'https://idp-eid',
        "HTTP_SHIB_AUTHENTICATION_METHOD": 'dummy',
        "HTTP_SHIB_AUTHNCONTEXT_CLASS": 'dummy',
    }
    if ssn is not None:
        environ["HTTP_PERSONALIDENTITYNUMBER_20"] = _xml_attr(ssn)
    return environ


def _add_invited_document(app, doc, owner, invites):
    """Seed the doc store with a document carrying eID invitations."""
    with app.app_context():
        invitations = app.extensions['doc_store'].add_document(doc, owner, invites, *invitation_flags)
    return invitations


def _eid_client(app, ssn=_test_ssn):
    client = app.test_client()
    client.environ_base.update(_eid_environ(ssn=ssn))
    return client


@pytest.fixture
def app_with_invitation(app, sample_doc_1, sample_owner_1):
    tempdir, app = app
    invites = [
        {'name': 'invite0', 'email': 'invite0@example.org', 'ssn': _test_ssn, 'lang': 'en'},
        {'name': 'invite1', 'email': 'invite1@example.org', 'ssn': _test_ssn, 'lang': 'en'},
    ]
    invitations = _add_invited_document(app, sample_doc_1, sample_owner_1, invites)
    yield tempdir, app, invitations


def test_index_bankid(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data

    # second request: the session already holds the attributes, so
    # add_attributes_to_session_bankid_freja is skipped entirely
    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data


def test_index_freja(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = app.test_client()
    environ = _eid_environ()
    # also exercise the branch for an IdP that sends no organization name
    del environ['HTTP_MD_ORGANIZATIONNAME']
    client.environ_base.update(environ)

    response = client.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data


def test_index_bankid_clears_stale_session(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    with client.session_transaction() as sess:
        sess['using-bankid'] = False
        sess['eppn'] = 'stale-eppn@example.org'

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data


def test_index_freja_clears_stale_session(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    with client.session_transaction() as sess:
        sess['using-freja'] = False
        sess['eppn'] = 'stale-eppn@example.org'

    response = client.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data


def test_index_bankid_invited_unauthn(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    with client.session_transaction() as sess:
        sess['invited-unauthn'] = True

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data


def test_index_freja_invited_unauthn(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    with client.session_transaction() as sess:
        sess['invited-unauthn'] = True

    response = client.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data


def test_index_bankid_template_failure(app_with_invitation, monkeypatch):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    import edusign_webapp.views

    def broken_render(template, **context):
        raise AttributeError('broken template')

    monkeypatch.setattr(edusign_webapp.views, 'render_template', broken_render)

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '500 INTERNAL SERVER ERROR'


def test_index_freja_template_failure(app_with_invitation, monkeypatch):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)

    import edusign_webapp.views

    def broken_render(template, **context):
        raise AttributeError('broken template')

    monkeypatch.setattr(edusign_webapp.views, 'render_template', broken_render)

    response = client.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '500 INTERNAL SERVER ERROR'


def test_index_bankid_wrong_ssn(app, sample_doc_1, sample_owner_1):
    _, app = app
    invites = [{'name': 'invite0', 'email': 'invite0@example.org', 'ssn': '188001019999', 'lang': 'en'}]
    invitations = _add_invited_document(app, sample_doc_1, sample_owner_1, invites)
    client = _eid_client(app)

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'Unknown invitation' in response.data


def test_index_freja_wrong_ssn(app, sample_doc_1, sample_owner_1):
    _, app = app
    invites = [{'name': 'invite0', 'email': 'invite0@example.org', 'ssn': '188001019999', 'lang': 'en'}]
    invitations = _add_invited_document(app, sample_doc_1, sample_owner_1, invites)
    client = _eid_client(app)

    response = client.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'Unknown invitation' in response.data


def test_index_bankid_missing_personnummer(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app, ssn=None)

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'Missing information' in response.data


def test_index_freja_missing_personnummer(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app, ssn=None)

    response = client.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'Missing information' in response.data


def test_index_bankid_missing_display_name(app_with_invitation):
    # add_attributes_to_session_bankid_freja reads the displayName with
    # get_attr_values, which raises KeyError, not MissingDisplayName; so
    # this lands on the "Missing information" page, and the
    # "Missing displayName" branch of the view is unreachable.
    _, app, invitations = app_with_invitation
    client = app.test_client()
    environ = _eid_environ()
    del environ['HTTP_DISPLAYNAME_20']
    client.environ_base.update(environ)

    response = client.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'Missing information' in response.data


def test_index_bankid_nonexistent_invitation(app):
    # a non-existing invitation gives an empty invite dict, and the view
    # reports it as missing information from the IdP
    _, app = app
    client = _eid_client(app)

    response = client.get(f"/sign/bankid/{uuid.uuid4()}")
    assert response.status == '200 OK'
    assert b'Missing information' in response.data


def test_index_bankid_locked_document(app_with_invitation):
    _, app, invitations = app_with_invitation

    client1 = _eid_client(app)
    response = client1.get(f"/sign/bankid/{invitations[0]['key']}")
    assert response.status == '200 OK'
    assert b'main-bundle' in response.data

    # a fresh session with the second invitation for the same document:
    # the document is still locked for the first invited email
    client2 = _eid_client(app)
    response = client2.get(f"/sign/bankid/{invitations[1]['key']}")
    assert response.status == '200 OK'
    assert b'Duplicate invitation' in response.data


def test_index_freja_locked_document_unhandled(app_with_invitation):
    # unlike get_index_bankid, get_index_freja has no handler for
    # doc_store.DocumentLocked, so the same situation crashes the view
    _, app, invitations = app_with_invitation

    client1 = _eid_client(app)
    response = client1.get(f"/sign/freja/{invitations[0]['key']}")
    assert response.status == '200 OK'

    client2 = _eid_client(app)
    with pytest.raises(Exception) as excinfo:
        client2.get(f"/sign/freja/{invitations[1]['key']}")
    assert excinfo.type.__name__ == 'DocumentLocked'


def test_config_eid(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)
    invite_key = str(invitations[0]['key'])

    response = client.get(f"/sign/bankid/{invite_key}")
    assert response.status == '200 OK'

    response = client.get(f"/sign/config-eid/{invite_key}")
    assert response.status == '200 OK'
    data = json.loads(response.data)
    attrs = data['payload']['signer_attributes']
    assert attrs['ssn'] == _test_ssn
    assert attrs['using_bankid']
    assert not attrs['using_freja']
    # schemata.py declares signer_attributes.invite_key as
    # fields.List(fields.String()), so the string is serialized as a
    # list of its characters
    assert attrs['invite_key'] == list(invite_key)
    assert data['payload']['unauthn']
    assert len(data['payload']['pending_multisign']) == 1
    assert data['payload']['stale_from'].endswith(f'/home-eid/{invite_key}')


def test_config_eid_freja(app_with_invitation):
    _, app, invitations = app_with_invitation
    client = _eid_client(app)
    invite_key = str(invitations[0]['key'])

    response = client.get(f"/sign/freja/{invite_key}")
    assert response.status == '200 OK'

    response = client.get(f"/sign/config-eid/{invite_key}")
    assert response.status == '200 OK'
    data = json.loads(response.data)
    attrs = data['payload']['signer_attributes']
    assert attrs['using_freja']
    assert not attrs['using_bankid']


def test_callback_eid_get_without_eid_session(client):
    # with neither using-freja nor using-bankid in the session, the GET
    # falls through to the common callback, which requires POSTed form
    # data and rejects the request
    with client.session_transaction() as sess:
        sess['using-freja'] = False
        sess['using-bankid'] = False

    response = client.get(f'/sign/callback-eid/{uuid.uuid4()}')
    assert response.status == '400 BAD REQUEST'


def test_home_eid_custom_md(app):
    tempdir, app = app
    md_dir = os.path.join(tempdir.name, 'md')
    os.makedirs(md_dir, exist_ok=True)
    with open(os.path.join(md_dir, 'home-en.md'), 'w') as f:
        f.write('# Custom home text')

    app.config['CUSTOMIZATION_DIR'] = tempdir.name
    client = app.test_client()

    response = client.get(f'/home-eid/{uuid.uuid4()}')
    assert response.status == '200 OK'
    assert b'Custom home text' in response.data


def test_home_eid_old_custom_md(app):
    tempdir, app = app
    with open(os.path.join(tempdir.name, 'home-en.md'), 'w') as f:
        f.write('# Old-style custom home text')

    app.config['CUSTOMIZATION_DIR'] = tempdir.name
    client = app.test_client()

    response = client.get(f'/home-eid/{uuid.uuid4()}')
    assert response.status == '200 OK'
    assert b'Old-style custom home text' in response.data
