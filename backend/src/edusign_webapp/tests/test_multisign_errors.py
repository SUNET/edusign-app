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
Tests for the error branches of the multi-sign views:
create / edit / remove multi-sign, reminders, decline, delegate,
skip-final-signature, lock/unlock, and the invited-documents branches
of recreate-sign-request.
"""

import json
import uuid

from edusign_webapp.marshal import ResponseSchema

INVITE_0 = {'name': 'invite0', 'email': 'invite0@example.org', 'lang': 'en', 'ssn': ''}
INVITE_1 = {'name': 'invite1', 'email': 'invite1@example.org', 'lang': 'en', 'ssn': ''}
INVITE_2 = {'name': 'invite2', 'email': 'invite2@example.org', 'lang': 'en', 'ssn': ''}

POST_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://test.localhost',
    'X-Forwarded-Host': 'test.localhost',
}


def _csrf_setup(client, monkeypatch):
    """Open a session with GET /sign/ and return a usable csrf token."""
    response = client.get('/sign/')
    assert response.status == '200 OK'

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

    return csrf_token


def _post(client, url, csrf_token, payload):
    response = client.post(url, headers=POST_HEADERS, json={'csrf_token': csrf_token, 'payload': payload})
    return json.loads(response.data)


def _create_invitation(
    client,
    csrf_token,
    doc,
    invites,
    sendsigned=True,
    skipfinal=False,
    ordered=False,
    allowbankid=False,
    loa='low',
    owner='tester@example.org',
):
    payload = {
        'document': doc,
        'owner': owner,
        'text': 'Dummy invitation text',
        'sendsigned': sendsigned,
        'skipfinal': skipfinal,
        'loa': loa,
        'ordered': ordered,
        'allowbankid': allowbankid,
        'invites': invites,
    }
    return _post(client, '/sign/create-multi-sign', csrf_token, payload)


def _switch_user(client, monkeypatch, environ):
    """
    Start a session for another user on the same client.

    A second test client would interleave preserved request contexts with the
    first one, closing the per-context sqlite connection under the other
    client's feet; logging out and changing the identity headers avoids that.
    """
    response = client.get('/sign/logout')
    assert response.status == '302 FOUND'
    client.environ_base.update(environ)
    return _csrf_setup(client, monkeypatch)


def _pending_invites(client, key):
    app = client.application
    with app.app_context():
        return app.extensions['doc_store'].get_pending_invites(uuid.UUID(key))


def _sign_invite(client, key, email):
    """Mark the invitation of `email` for document `key` as signed."""
    app = client.application
    with app.app_context():
        store = app.extensions['doc_store']
        blob = store.get_document_content(uuid.UUID(key))
        store.update_document(uuid.UUID(key), blob, [email])


def _mock_validate(monkeypatch):
    from edusign_webapp.api_client import APIClient

    def mock_validate(self, to_validate):
        for doc in to_validate:
            doc['validated'] = True
            doc['doc']['signedContent'] = doc['doc']['blob']

        return to_validate

    monkeypatch.setattr(APIClient, 'validate_signatures', mock_validate)


def _mock_mail_failure(monkeypatch):
    def mock_sendmail_bulk(*args, **kwargs):
        raise Exception('mock mail failure')

    monkeypatch.setattr('edusign_webapp.views.sendmail_bulk', mock_sendmail_bulk)


# create-multi-sign


def test_create_non_whitelisted(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    monkeypatch.setattr('edusign_webapp.views.is_whitelisted', lambda *args: False)

    resp_data = _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    assert resp_data['message'] == 'Unauthorized'


def test_create_wrong_owner(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)

    resp_data = _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0], owner='other@example.org')

    assert resp_data['message'] == 'You cannot invite as other@example.org'


def test_create_no_invitations_made(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    monkeypatch.setattr(DocStore, 'add_document', lambda *args, **kwargs: [])

    resp_data = _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    assert resp_data['message'] == 'Success sending invitations to sign'


def test_create_allowbankid(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)

    resp_data = _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], allowbankid=True)

    assert resp_data['message'] == 'Success sending invitations to sign'


def test_create_ordered(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)

    resp_data = _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    assert resp_data['message'] == 'Success sending invitations to sign'


def test_create_mail_failure_removes_document(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_mail_failure(monkeypatch)

    resp_data = _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    assert resp_data['message'] == 'There was a problem and the invitation email(s) were not sent'
    assert _pending_invites(client, sample_doc_1['key']) == []


# send-multisign-reminder


def test_reminder_pending_raises(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    def mock_get_pending(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'get_pending_invites', mock_get_pending)

    resp_data = _post(client, '/sign/send-multisign-reminder', csrf_token, {'key': sample_doc_1['key']})

    # the en catalog translates this msgid to the same text as the
    # not-pending branch; the log line distinguishes them
    assert resp_data['message'] == 'Problem finding the users pending to sign'


def test_reminder_no_pending(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    monkeypatch.setattr(DocStore, 'get_pending_invites', lambda *args, **kwargs: [])

    resp_data = _post(client, '/sign/send-multisign-reminder', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Problem finding the users pending to sign'


def test_reminder_no_docname(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    monkeypatch.setattr(DocStore, 'get_document_name', lambda *args, **kwargs: '')

    resp_data = _post(client, '/sign/send-multisign-reminder', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Could not find the document'


def test_reminder_ordered(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    resp_data = _post(client, '/sign/send-multisign-reminder', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success sending reminder email to pending users'


def test_reminder_allowbankid(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], allowbankid=True)

    resp_data = _post(client, '/sign/send-multisign-reminder', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success sending reminder email to pending users'


def test_reminder_mail_failure(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    _mock_mail_failure(monkeypatch)

    resp_data = _post(client, '/sign/send-multisign-reminder', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Problem sending the email, please try again'


# edit-multi-sign, ordered invitations


def _edit_payload(key, invites, sendsigned=True, skipfinal=False):
    return {
        'key': key,
        'text': 'Some invitation text',
        'sendsigned': sendsigned,
        'skipfinal': skipfinal,
        'invites': invites,
    }


def test_edit_ordered_same_next(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    resp_data = _post(
        client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [INVITE_0, INVITE_1])
    )

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_ordered_new_next(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    resp_data = _post(client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [INVITE_1]))

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_ordered_new_next_allowbankid(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True, allowbankid=True)

    resp_data = _post(client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [INVITE_1]))

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_ordered_mail_failure(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)
    _mock_mail_failure(monkeypatch)

    resp_data = _post(client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [INVITE_1]))

    assert resp_data['message'] == "Some users may not have been notified of the changes for 'test1.pdf'"


def test_edit_ordered_to_empty_skipfinal(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    resp_data = _post(
        client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [], skipfinal=True)
    )

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_ordered_to_empty_skipfinal_raises(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    def mock_get_signed(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'get_signed_document', mock_get_signed)

    resp_data = _post(
        client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [], skipfinal=True)
    )

    assert resp_data['message'] == "Some users may not have been notified of the changes for 'test1.pdf'"


# edit-multi-sign, unordered invitations


def test_edit_added_allowbankid(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], allowbankid=True)

    resp_data = _post(
        client,
        '/sign/edit-multi-sign',
        csrf_token,
        _edit_payload(sample_doc_1['key'], [INVITE_0, INVITE_1, INVITE_2]),
    )

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_added_and_removed_mail_failure(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1])
    _mock_mail_failure(monkeypatch)

    resp_data = _post(
        client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [INVITE_0, INVITE_2])
    )

    assert resp_data['message'] == "Some users may not have been notified of the changes for 'test1.pdf'"


def test_edit_to_empty_skipfinal(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1])

    resp_data = _post(
        client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [], skipfinal=True)
    )

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_to_empty_skipfinal_raises(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1])

    def mock_get_signed(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'get_signed_document', mock_get_signed)

    resp_data = _post(
        client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], [], skipfinal=True)
    )

    assert resp_data['message'] == "Some users may not have been notified of the changes for 'test1.pdf'"


# remove-multi-sign


def test_remove_info_raises(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    def mock_get_pending(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'get_pending_invites', mock_get_pending)

    resp_data = _post(client, '/sign/remove-multi-sign', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success removing invitation to sign'


def test_remove_raises(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    def mock_remove(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'remove_document', mock_remove)

    resp_data = _post(client, '/sign/remove-multi-sign', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Problem removing the invitation, please try again'


def test_remove_not_removed(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    monkeypatch.setattr(DocStore, 'remove_document', lambda *args, **kwargs: False)

    resp_data = _post(client, '/sign/remove-multi-sign', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Problem removing the invitation, please try again'


def test_remove_ordered(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    resp_data = _post(client, '/sign/remove-multi-sign', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success removing invitation to sign'


def test_remove_cancellation_mail_failure(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    _mock_mail_failure(monkeypatch)

    resp_data = _post(client, '/sign/remove-multi-sign', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Some users may have not been informed of the cancellation'


# skip-final-signature with signed invitations


def test_skip_final_with_signed_invite(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    _sign_invite(client, sample_doc_1['key'], 'invite0@example.org')

    resp_data = _post(client, '/sign/skip-final-signature', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success'
    assert resp_data['payload']['documents'][0]['id'] == sample_doc_1['key']


def test_skip_final_with_signed_invite_no_sendsigned(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0], sendsigned=False)
    _sign_invite(client, sample_doc_1['key'], 'invite0@example.org')

    resp_data = _post(client, '/sign/skip-final-signature', csrf_token, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success'


def test_skip_final_with_signed_invite_docname_without_extension(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    doc = dict(sample_doc_1)
    doc['name'] = 'testdoc'
    doc['key'] = str(uuid.uuid4())
    _create_invitation(client, csrf_token, doc, [INVITE_0])
    _sign_invite(client, doc['key'], 'invite0@example.org')

    resp_data = _post(client, '/sign/skip-final-signature', csrf_token, {'key': doc['key']})

    assert resp_data['message'] == 'Success'


# decline-invitation, from the invited user's own session


def test_decline_with_pending_remaining(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1])

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    resp_data = _post(client, '/sign/decline-invitation', csrf_token2, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success declining signature'


def test_decline_last_pending(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    resp_data = _post(client, '/sign/decline-invitation', csrf_token2, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success declining signature'


def test_decline_last_pending_skipfinal(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0], skipfinal=True)

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    resp_data = _post(client, '/sign/decline-invitation', csrf_token2, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success declining signature'


def test_decline_last_pending_skipfinal_get_signed_raises(client, environ_base_2, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0], skipfinal=True)

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    def mock_get_signed(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'get_signed_document', mock_get_signed)

    resp_data = _post(client, '/sign/decline-invitation', csrf_token2, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success declining signature'


def test_decline_ordered_next_invitation(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    resp_data = _post(client, '/sign/decline-invitation', csrf_token2, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success declining signature'


def test_decline_ordered_next_invitation_allowbankid(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True, allowbankid=True)

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    resp_data = _post(client, '/sign/decline-invitation', csrf_token2, {'key': sample_doc_1['key']})

    assert resp_data['message'] == 'Success declining signature'


# delegate-invitation


def _delegation_payload(client, document_key):
    invites = _pending_invites(client, document_key)
    return {
        'invite_key': invites[0]['key'],
        'document_key': document_key,
        'name': 'delegated',
        'email': 'delegated@example.org',
        'lang': 'en',
        'ssn': '',
    }


def test_delegate_raises(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    payload = _delegation_payload(client, sample_doc_1['key'])

    def mock_delegate(*args, **kwargs):
        raise Exception('mock error')

    monkeypatch.setattr(DocStore, 'delegate', mock_delegate)

    resp_data = _post(client, '/sign/delegate-invitation', csrf_token, payload)

    assert resp_data['message'] == 'There was a problem delegating the invitation'


def test_delegate_no_owner_data(client, monkeypatch, sample_doc_1):
    from edusign_webapp.doc_store import DocStore

    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    payload = _delegation_payload(client, sample_doc_1['key'])

    monkeypatch.setattr(DocStore, 'get_owner_data', lambda *args, **kwargs: {})

    resp_data = _post(client, '/sign/delegate-invitation', csrf_token, payload)

    assert resp_data['message'] == 'Success delegating signature'


def test_delegate_mail_failure(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    payload = _delegation_payload(client, sample_doc_1['key'])

    def mock_sendmail(*args, **kwargs):
        raise Exception('mock mail failure')

    monkeypatch.setattr('edusign_webapp.views.sendmail', mock_sendmail)

    resp_data = _post(client, '/sign/delegate-invitation', csrf_token, payload)

    assert resp_data['message'] == 'Success delegating signature'


# lock-doc / unlock-doc for unknown documents


def test_lock_unknown_document(client, monkeypatch):
    csrf_token = _csrf_setup(client, monkeypatch)

    resp_data = _post(client, '/sign/lock-doc', csrf_token, {'key': str(uuid.uuid4())})

    assert resp_data['message'] == 'The document is being signed by an invitee, please try again in a few minutes'


def test_unlock_unknown_document(client, monkeypatch):
    csrf_token = _csrf_setup(client, monkeypatch)

    resp_data = _post(client, '/sign/unlock-doc', csrf_token, {'key': str(uuid.uuid4())})

    assert resp_data['message'] == 'There was a problem unlocking the document'


# recreate-sign-request


def _mock_api_post(monkeypatch):
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


def _recreate_payload(local=None, owned=None, invited=None):
    return {
        'documents': {
            'local': local or [],
            'owned': owned or [],
            'invited': invited or [],
        },
        'invite_key': '',
    }


def _invited_doc(sample_doc_1, invite_key):
    return {
        'name': sample_doc_1['name'],
        'size': sample_doc_1['size'],
        'type': sample_doc_1['type'],
        'key': sample_doc_1['key'],
        'invite_key': invite_key,
    }


def test_recreate_non_whitelisted_no_invitations(client, monkeypatch):
    csrf_token = _csrf_setup(client, monkeypatch)
    monkeypatch.setattr('edusign_webapp.views.is_whitelisted', lambda *args: False)

    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token, _recreate_payload())

    assert resp_data['message'] == 'Unauthorized'


def test_recreate_non_whitelisted_with_invitation(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)
    monkeypatch.setattr('edusign_webapp.views.is_whitelisted', lambda *args: False)

    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token2, _recreate_payload())

    assert resp_data['payload']['failed'] == []
    assert resp_data['payload']['documents'] == []


def test_recreate_owned_document(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_api_post(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    owned = [
        {
            'name': sample_doc_1['name'],
            'size': sample_doc_1['size'],
            'type': sample_doc_1['type'],
            'key': sample_doc_1['key'],
        }
    ]
    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token, _recreate_payload(owned=owned))

    assert resp_data['payload']['documents'][0]['name'] == sample_doc_1['name']
    assert resp_data['payload']['failed'] == []


def test_recreate_invited_no_invitation(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    invited = [_invited_doc(sample_doc_1, str(uuid.uuid4()))]
    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token2, _recreate_payload(invited=invited))

    assert resp_data['payload']['failed'][0]['message'] == (
        'There doesn\'t seem to be an invitation for you to sign "test1.pdf".'
    )


def test_recreate_invited_wrong_email(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_1])
    invite_key = _pending_invites(client, sample_doc_1['key'])[0]['key']

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    invited = [_invited_doc(sample_doc_1, invite_key)]
    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token2, _recreate_payload(invited=invited))

    assert resp_data['payload']['failed'][0]['message'] == (
        'The email invite1@example.org invited to sign "test1.pdf" does not coincide with yours.'
    )


def test_recreate_invited_locked(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    invite_key = _pending_invites(client, sample_doc_1['key'])[0]['key']

    app = client.application
    with app.app_context():
        locked = app.extensions['doc_store'].lock_document(uuid.UUID(sample_doc_1['key']), 'tester@example.org')
        assert locked

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    invited = [_invited_doc(sample_doc_1, invite_key)]
    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token2, _recreate_payload(invited=invited))

    assert resp_data['payload']['failed'][0]['message'] == (
        'Document is being signed by another user, please try again in a few minutes.'
    )


def test_recreate_invited_success(client, environ_base_2, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_api_post(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    invite_key = _pending_invites(client, sample_doc_1['key'])[0]['key']

    csrf_token2 = _switch_user(client, monkeypatch, environ_base_2)

    invited = [_invited_doc(sample_doc_1, invite_key)]
    resp_data = _post(client, '/sign/recreate-sign-request', csrf_token2, _recreate_payload(invited=invited))

    assert resp_data['payload']['failed'] == []
    assert resp_data['payload']['documents'][0]['name'] == sample_doc_1['name']


def test_skip_final_mail_failure(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _mock_validate(monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0])
    _sign_invite(client, sample_doc_1['key'], 'invite0@example.org')
    _mock_mail_failure(monkeypatch)

    resp_data = _post(client, '/sign/skip-final-signature', csrf_token, {'key': sample_doc_1['key']})

    # the mail failure is only logged
    assert resp_data['message'] == 'Success'


def test_edit_ordered_to_empty_no_skipfinal(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1], ordered=True)

    resp_data = _post(client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], []))

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"


def test_edit_to_empty_no_skipfinal(client, monkeypatch, sample_doc_1):
    csrf_token = _csrf_setup(client, monkeypatch)
    _create_invitation(client, csrf_token, sample_doc_1, [INVITE_0, INVITE_1])

    resp_data = _post(client, '/sign/edit-multi-sign', csrf_token, _edit_payload(sample_doc_1['key'], []))

    assert resp_data['message'] == "Success editing invitation to sign 'test1.pdf'"
