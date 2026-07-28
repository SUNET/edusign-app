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
Tests for the email preparation on retrieval of signed documents:
the /sign/get-signed view driven with documents seeded in the doc
store, so that the invitation email helpers in views.py run
(_prepare_signed_by_email, _prepare_all_signed_email,
_next_ordered_invitation_mail, _prepare_signed_documents_data,
_process_signed_documents).

The session user (from conftest's environ_base) is tester@example.org
"Tëster Kid". Emails are captured by patching sendmail_bulk in the
views module; each captured item is a tuple
((recipients, subject, body_txt, body_html), kwargs).
"""
import json
import uuid
from base64 import b64encode
from email.utils import formataddr

from edusign_webapp.marshal import ResponseSchema
from edusign_webapp.tests.sample_pdfs import pdf_simple_1

TESTER_EMAIL = 'tester@example.org'
# formataddr RFC2047-encodes the non-ascii display name, like the app does
TESTER_ADDR = formataddr(('Tëster Kid', TESTER_EMAIL))

OWNER = {'name': 'Owning User', 'email': 'owner@example.org', 'eppn': 'owner-eppn@example.org', 'lang': 'en'}


def _invite(name, email, lang='en'):
    return {'name': name, 'email': email, 'ssn': '', 'lang': lang}


def _add_doc(
    client,
    invites,
    sendsigned=True,
    skipfinal=False,
    ordered=False,
    allowbankid=False,
    owner=OWNER,
    name='test1.pdf',
):
    """Seed the doc store with an invited document; return its key."""
    key = str(uuid.uuid4())
    doc = {'name': name, 'size': 1500000, 'type': 'application/pdf', 'key': key, 'blob': pdf_simple_1}
    app = client.application
    with app.app_context():
        app.extensions['doc_store'].add_document(
            doc, owner, invites, sendsigned, 'none', skipfinal, ordered, allowbankid, 'Invitation text'
        )
    return key


def _mark_signed(client, key, email):
    app = client.application
    with app.app_context():
        app.extensions['doc_store'].update_document(key, pdf_simple_1, [email])


def _mark_declined(client, key, email):
    app = client.application
    with app.app_context():
        app.extensions['doc_store'].decline_document(key, [email])


def _process_data(key):
    signed_content = b64encode(b'Dummy signed content').decode('ascii')
    return {
        'correlationId': '2a08e13e-8719-4b53-8586-662037f153ec',
        'id': '09d91b6f-199c-4388-a4e5-230807dd4ac4',
        'signedDocuments': [{'id': key, 'mimeType': 'application/pdf', 'signedContent': signed_content}],
        'signerAssertionInformation': {'authnInstant': 1611062701000},
    }


def _post_get_signed(client, monkeypatch, process_data, sent, using=None):
    """POST to /sign/get-signed with the API client mocked; capture emails in `sent`."""
    from edusign_webapp.api_client import APIClient

    monkeypatch.setattr(APIClient, 'process_sign_request', lambda self, sign_response, relay_state: process_data)

    def mock_validate(self, to_validate):
        for doc in to_validate:
            doc['validated'] = True
        return to_validate

    monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)

    monkeypatch.setattr('edusign_webapp.views.sendmail_bulk', lambda msgs: sent.extend(msgs))

    response1 = client.get('/sign/')
    assert response1.status == '200 OK'

    if using is not None:
        with client.session_transaction() as sess:
            sess[f'using-{using}'] = True

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
        user_key = sess['user_key']

        sign_response = b64encode(b'Dummy Sign Response').decode('utf8')
        doc_data = {
            'csrf_token': csrf_token,
            'payload': {'sign_response': sign_response, 'relay_state': '09d91b6f-199c-4388-a4e5-230807dd4ac4'},
        }

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == 'user_key':
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

        response = client.post(
            '/sign/get-signed',
            headers={
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://test.localhost',
                'X-Forwarded-Host': 'test.localhost',
            },
            json=doc_data,
        )

        assert response.status == '200 OK'
        return json.loads(response.data)


def test_signed_as_invitee_more_pending(client, monkeypatch):
    """The invitee signs; another invitee still pending: signed_by email to the owner."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL), _invite('invite1', 'invite1@example.org')]
    key = _add_doc(client, invites)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert recipients == ['Owning User <owner@example.org>']
    assert subject == "Tëster Kid signed 'test1.pdf'"
    assert 'test1.pdf' in body_txt
    assert kwargs == {}

    docs = data['payload']['documents']
    assert len(docs) == 1
    assert docs[0]['name'] == 'test1.pdf'
    assert len(docs[0]['pending']) == 1
    assert docs[0]['pending'][0]['email'] == 'invite1@example.org'


def test_signed_as_invitee_ordered_next_invitation(client, monkeypatch):
    """Ordered invitations: signing sends the invitation email to the next invitee."""
    invites = [
        _invite('Tëster Kid', TESTER_EMAIL),
        _invite('invite1', 'invite1@example.org'),
        _invite('invite2', 'invite2@example.org'),
    ]
    key = _add_doc(client, invites, ordered=True)

    sent = []
    _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 2
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert recipients == ['invite1 <invite1@example.org>']
    assert subject == 'You have been invited to sign "test1.pdf"'
    assert 'Invitation text' in body_txt
    # without allowbankid the invited link is the plain index
    assert '/home-eid/' not in body_txt

    (recipients2, subject2, _, _), _ = sent[1]
    assert recipients2 == ['Owning User <owner@example.org>']
    assert subject2 == "Tëster Kid signed 'test1.pdf'"


def test_signed_as_invitee_ordered_next_invitation_bankid(client, monkeypatch):
    """Ordered invitations with allowbankid: the next invitee gets the eID home link."""
    invites = [
        _invite('Tëster Kid', TESTER_EMAIL),
        _invite('invite1', 'invite1@example.org'),
        _invite('invite2', 'invite2@example.org'),
    ]
    key = _add_doc(client, invites, ordered=True, allowbankid=True)

    # sql.SqlMD.get_allowbankid drops the query result and returns None for
    # any existing document (missing return, sql.py:1139), so the stored
    # allowbankid=True never reaches the view; patch the doc store to get
    # the eID link branch to run.
    from edusign_webapp.doc_store import DocStore

    monkeypatch.setattr(DocStore, 'get_allowbankid', lambda self, key: True)

    sent = []
    _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 2
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert recipients == ['invite1 <invite1@example.org>']
    assert '/home-eid/' in body_txt


def test_signed_as_invitee_last_skipfinal_sendsigned(client, monkeypatch):
    """Last signer, skipfinal: all-signed emails with the signed PDF attached."""
    invites = [
        _invite('Tëster Kid', TESTER_EMAIL),
        _invite('invite1', 'invite1@example.org', lang='sv'),
        _invite('invite2', 'invite2@example.org'),
    ]
    key = _add_doc(client, invites, skipfinal=True, sendsigned=True)
    _mark_signed(client, key, 'invite1@example.org')
    _mark_declined(client, key, 'invite2@example.org')

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    # one message per language: en (owner + tester), sv (invite1)
    assert len(sent) == 2
    by_recipients = {tuple(args[0]): (args, kwargs) for args, kwargs in sent}
    en_key = ('Owning User <owner@example.org>', TESTER_ADDR)
    sv_key = ('invite1 <invite1@example.org>',)
    assert en_key in by_recipients
    assert sv_key in by_recipients

    (args, kwargs) = by_recipients[en_key]
    assert args[1] == '"test1.pdf" is now signed'
    assert kwargs['attachment_name'] == 'test1-signed.pdf'
    assert kwargs['attachment'] == b'Dummy signed content'

    docs = data['payload']['documents']
    assert len(docs) == 1
    assert docs[0]['validated']
    assert len(docs[0]['signed']) == 1
    assert docs[0]['signed'][0]['email'] == 'invite1@example.org'


def test_signed_as_invitee_last_skipfinal_no_sendsigned(client, monkeypatch):
    """Last signer, skipfinal, sendsigned False: all-signed emails without attachment."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL)]
    key = _add_doc(client, invites, skipfinal=True, sendsigned=False)

    sent = []
    _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert recipients == ['Owning User <owner@example.org>', TESTER_ADDR]
    assert subject == '"test1.pdf" is now signed'
    assert kwargs == {}


def test_signed_as_invitee_last_skipfinal_no_extension(client, monkeypatch):
    """A document name without extension gets the -signed suffix appended."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL)]
    key = _add_doc(client, invites, skipfinal=True, sendsigned=True, name='testdoc')

    sent = []
    _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    _, kwargs = sent[0]
    assert kwargs['attachment_name'] == 'testdoc-signed'


def test_signed_as_invitee_last_no_skipfinal(client, monkeypatch):
    """Last invitee signs, final signature not skipped: final_signed email to the owner."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL)]
    key = _add_doc(client, invites, skipfinal=False)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert recipients == ['Owning User <owner@example.org>']
    assert subject == "Tëster Kid signed 'test1.pdf'"

    # the document goes back to the owner for the final signature
    docs = data['payload']['documents']
    assert len(docs) == 1
    assert docs[0]['pending'] == []


def test_signed_as_invitee_aliased_invites_skipfinal(client, monkeypatch):
    """Both remaining invitations belong to the session user's aliases, with
    skipfinal: the owner gets the final_signed_by_email_skip variant."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL), _invite('Tëster Alias', TESTER_EMAIL)]
    key = _add_doc(client, invites, skipfinal=True)

    sent = []
    _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert recipients == ['Owning User <owner@example.org>']
    assert subject == "Tëster Kid signed 'test1.pdf'"


def test_signed_own_invitation_removes_document(client, monkeypatch):
    """The inviter adds the final signature: all-signed emails, document removed."""
    owner = {'name': 'Tëster Kid', 'email': TESTER_EMAIL, 'eppn': 'dummy-eppn@example.org', 'lang': 'en'}
    invites = [_invite('invite1', 'invite1@example.org')]
    key = _add_doc(client, invites, owner=owner, sendsigned=True)
    _mark_signed(client, key, 'invite1@example.org')

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    (recipients, subject, body_txt, body_html), kwargs = sent[0]
    assert set(recipients) == {formataddr(('Tëster Kid', TESTER_EMAIL)), 'invite1 <invite1@example.org>'}
    assert subject == '"test1.pdf" is now signed'
    assert kwargs['attachment_name'] == 'test1-signed.pdf'

    docs = data['payload']['documents']
    assert len(docs) == 1
    assert docs[0]['name'] == 'test1.pdf'

    app = client.application
    with app.app_context():
        assert app.extensions['doc_store'].get_owner_data(key) == {}


def test_signed_owner_eppn_without_org(client, monkeypatch):
    """An owner eppn without @ means the signing organization is unknown."""
    owner = {'name': 'Owning User', 'email': 'owner@example.org', 'eppn': 'owner-eppn', 'lang': 'en'}
    invites = [_invite('Tëster Kid', TESTER_EMAIL), _invite('invite1', 'invite1@example.org')]
    key = _add_doc(client, invites, owner=owner)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert len(sent) == 1
    assert len(data['payload']['documents']) == 1


def test_signed_using_bankid_records_signature(client, monkeypatch):
    """Signing an invitation with BankID records a payable signature."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL), _invite('invite1', 'invite1@example.org')]
    key = _add_doc(client, invites)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent, using='bankid')

    assert len(sent) == 1
    assert len(data['payload']['documents']) == 1


def test_signed_using_freja_records_signature(client, monkeypatch):
    """Signing an invitation with Freja records a payable signature."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL), _invite('invite1', 'invite1@example.org')]
    key = _add_doc(client, invites)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent, using='freja')

    assert len(sent) == 1
    assert len(data['payload']['documents']) == 1


def test_get_signed_loa_mismatch(client, monkeypatch):
    process_data = {'errorCode': 'error.loa', 'message': 'Requested LoA does not match the Assertion LoA'}

    sent = []
    data = _post_get_signed(client, monkeypatch, process_data, sent)

    assert data['error']
    assert data['message'] == 'Could not provide the requested level of assurance.'
    assert sent == []


def test_get_signed_missing_attributes(client, monkeypatch):
    process_data = {'errorCode': 'error.attrs', 'message': 'Missing attributes in assertion'}

    sent = []
    data = _post_get_signed(client, monkeypatch, process_data, sent)

    assert data['error']
    assert data['message'] == 'Could not provide the requested level of assurance.'


def test_signed_by_email_preparation_fails(client, monkeypatch):
    """A failure preparing the signed-by email is logged and does not break the view."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL), _invite('invite1', 'invite1@example.org')]
    key = _add_doc(client, invites)

    def raiser(*args, **kwargs):
        raise Exception('ho ho ho')

    monkeypatch.setattr('edusign_webapp.views._prepare_signed_by_email', raiser)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert sent == []
    assert len(data['payload']['documents']) == 1


def test_all_signed_email_preparation_fails(client, monkeypatch):
    """A failure preparing the all-signed email is logged and does not break the view."""
    invites = [_invite('Tëster Kid', TESTER_EMAIL)]
    key = _add_doc(client, invites, skipfinal=True)

    def raiser(*args, **kwargs):
        raise Exception('ho ho ho')

    monkeypatch.setattr('edusign_webapp.views._prepare_all_signed_email', raiser)

    sent = []
    data = _post_get_signed(client, monkeypatch, _process_data(key), sent)

    assert sent == []
    assert len(data['payload']['documents']) == 1
