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
import os
import sqlite3
import uuid
from copy import copy
from datetime import datetime

from edusign_webapp import run

invitation_flags = [
    True,  # sendsigned
    'any',  # loa
    False,  # skipfinal
    False,  # ordered
    'Invitation text',  # invitation_text
]


def test_add(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

    db_path = os.path.join('/tmp/test.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Documents")
    result = cur.fetchone()
    cur.close()
    conn.close()

    # Remove timestamps from the result
    assert result[:5] == (1, str(dummy_key), 'test1.pdf', 1500000, 'application/pdf')


def test_get_no_pending(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md

    with run.app.app_context():
        pending = test_md.get_pending(['invite0@example.org'])

    assert pending == []


def test_add_and_get_pending(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        pending1 = test_md.get_pending(['invite0@example.org'])
        pending2 = test_md.get_pending(['invite1@example.org'])

    assert len(pending1) == 1
    assert pending1[0]['name'] == 'test1.pdf'
    assert pending1[0]['size'] == 1500000
    assert pending1[0]['type'] == 'application/pdf'
    assert pending1[0]['owner']['email'] == 'owner@example.org'

    assert len(pending2) == 1
    assert pending2[0]['name'] == 'test1.pdf'
    assert pending2[0]['size'] == 1500000
    assert pending2[0]['type'] == 'application/pdf'
    assert pending2[0]['owner']['email'] == 'owner@example.org'


def test_add_ordered_and_get_pending(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    flags = copy(invitation_flags)
    flags[3] = True  # ordered
    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *flags)

        pending1 = test_md.get_pending(['invite0@example.org'])
        pending2 = test_md.get_pending(['invite1@example.org'])

    if len(pending2) == 1:
        pending1, pending2 = pending2, pending1

    assert len(pending1) == 1
    assert pending1[0]['name'] == 'test1.pdf'
    assert pending1[0]['size'] == 1500000
    assert pending1[0]['type'] == 'application/pdf'
    assert pending1[0]['owner']['email'] == 'owner@example.org'

    assert len(pending2) == 0


def test_add_document_and_get_owned(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 1
    assert len(owned[0]['pending']) == 2
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'

    assert owned[0]['pending'][0]['email'] in ('invite1@example.org', 'invite0@example.org')
    assert owned[0]['pending'][0]['name'] in ('invite1', 'invite0')
    assert owned[0]['pending'][0]['lang'] == 'en'

    assert owned[0]['pending'][1]['email'] in ('invite1@example.org', 'invite0@example.org')
    assert owned[0]['pending'][1]['name'] in ('invite1', 'invite0')
    assert owned[0]['pending'][1]['lang'] == 'en'


def test_add_document_and_decline_and_get_owned(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        test_md.decline(dummy_key, ['invite0@example.org'])

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 1
    assert len(owned[0]['pending']) == 1
    assert len(owned[0]['declined']) == 1
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'

    assert owned[0]['pending'][0]['email'] == 'invite1@example.org'
    assert owned[0]['pending'][0]['name'] == 'invite1'
    assert owned[0]['pending'][0]['lang'] == 'en'

    assert owned[0]['declined'][0]['email'] == 'invite0@example.org'
    assert owned[0]['declined'][0]['name'] == 'invite0'
    assert owned[0]['declined'][0]['lang'] == 'en'


def test_add_document_and_sign_and_get_owned(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        test_md.update(dummy_key, ['invite0@example.org'])

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 1
    assert len(owned[0]['pending']) == 1
    assert len(owned[0]['declined']) == 0
    assert len(owned[0]['signed']) == 1
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'

    assert owned[0]['pending'][0]['email'] == 'invite1@example.org'
    assert owned[0]['pending'][0]['name'] == 'invite1'
    assert owned[0]['pending'][0]['lang'] == 'en'

    assert owned[0]['signed'][0]['email'] == 'invite0@example.org'
    assert owned[0]['signed'][0]['name'] == 'invite0'
    assert owned[0]['signed'][0]['lang'] == 'en'


def test_add_document_and_sign_and_get_full_invites(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, [sample_invites_1[0]], *invitation_flags)

        test_md.update(dummy_key, ['invite0@example.org'])

        invites = test_md.get_full_invites(dummy_key)

    assert len(invites) == 1

    assert invites[0]['email'] == 'invite0@example.org'
    assert invites[0]['name'] == 'invite0'
    assert invites[0]['lang'] == 'en'
    assert not invites[0]['declined']
    assert invites[0]['signed']


def test_add_document_and_decline_and_get_full_invites(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, [sample_invites_1[0]], *invitation_flags)

        test_md.decline(dummy_key, ['invite0@example.org'])

        invites = test_md.get_full_invites(dummy_key)

    assert len(invites) == 1

    assert invites[0]['email'] == 'invite0@example.org'
    assert invites[0]['name'] == 'invite0'
    assert invites[0]['lang'] == 'en'
    assert invites[0]['declined']
    assert not invites[0]['signed']


def test_add_document_and_invitation_and_get_full_invites(
    sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()
    dummy_invitation_key = str(uuid.uuid4())

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, [], *invitation_flags)

        test_md.add_invitation(
            dummy_key,
            sample_invites_1[0]['name'],
            sample_invites_1[0]['email'],
            sample_invites_1[0]['lang'],
            dummy_invitation_key,
        )

        invites = test_md.get_full_invites(dummy_key)

    assert len(invites) == 1

    assert invites[0]['email'] == 'invite0@example.org'
    assert invites[0]['name'] == 'invite0'
    assert invites[0]['lang'] == 'en'
    assert not invites[0]['declined']
    assert not invites[0]['signed']


def test_add_document_and_invitation_and_remove_and_get_full_invites(
    sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()
    dummy_invitation_key = str(uuid.uuid4())

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, [], *invitation_flags)

        test_md.add_invitation(
            dummy_key,
            sample_invites_1[0]['name'],
            sample_invites_1[0]['email'],
            sample_invites_1[0]['lang'],
            dummy_invitation_key,
        )

        test_md.rm_invitation(dummy_invitation_key, dummy_key)

        invites = test_md.get_full_invites(dummy_key)

    assert len(invites) == 0


def test_add_document_and_invitation_raw_and_get_full_invites(
    sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()
    dummy_invitation_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, [], *invitation_flags)

        document_id = test_md.get_document(dummy_key)['doc_id']
        invite = {
            'name': sample_invites_1[0]['name'],
            'email': sample_invites_1[0]['email'],
            'lang': sample_invites_1[0]['lang'],
            'signed': False,
            'declined': False,
            'key': str(dummy_invitation_key),
            'doc_id': document_id,
            'order_invitation': 0,
        }

        test_md.add_invite_raw(invite)

        invites = test_md.get_full_invites(dummy_key)

    assert len(invites) == 1

    assert invites[0]['email'] == 'invite0@example.org'
    assert invites[0]['name'] == 'invite0'
    assert invites[0]['lang'] == 'en'
    assert not invites[0]['declined']
    assert not invites[0]['signed']


def test_add_document_and_2_invitation_raw_and_get_full_invites(
    sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()
    dummy_invitation_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, [], *invitation_flags)

        document_id = test_md.get_document(dummy_key)['doc_id']
        invite = {
            'name': sample_invites_1[0]['name'],
            'email': sample_invites_1[0]['email'],
            'lang': sample_invites_1[0]['lang'],
            'signed': True,
            'declined': False,
            'key': str(dummy_invitation_key),
            'doc_id': document_id,
            'order_invitation': 0,
        }

        test_md.add_invite_raw(invite)

        invite2 = {
            'name': sample_invites_1[1]['name'],
            'email': sample_invites_1[1]['email'],
            'lang': sample_invites_1[1]['lang'],
            'signed': False,
            'declined': True,
            'key': str(dummy_invitation_key),
            'doc_id': document_id,
            'order_invitation': 1,
        }

        test_md.add_invite_raw(invite2)

        invites = test_md.get_full_invites(dummy_key)

    assert len(invites) == 2

    if invites[0]['name'] == 'invite0':
        invite0 = invites[0]
        invite1 = invites[1]
    else:
        invite1 = invites[0]
        invite0 = invites[1]

    assert invite0['email'] == 'invite0@example.org'
    assert invite0['name'] == 'invite0'
    assert invite0['lang'] == 'en'
    assert not invite0['declined']
    assert invite0['signed']
    assert invite0['order'] in (0, 1)

    assert invite1['email'] == 'invite1@example.org'
    assert invite1['name'] == 'invite1'
    assert invite1['lang'] == 'en'
    assert invite1['declined']
    assert not invite1['signed']
    assert invite1['order'] in (0, 1)


def test_add_and_get_pending_not(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        pending = test_md.get_pending(['invite3@example.org'])

    assert pending == []


def test_add_two_and_get_pending(
    sqlite_md, sample_metadata_1, sample_metadata_2, sample_owner_1, sample_owner_2, sample_invites_1, sample_invites_2
):
    _, test_md = sqlite_md
    dummy_key_1 = uuid.uuid4()
    dummy_key_2 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.add(dummy_key_2, sample_metadata_2, sample_owner_2, sample_invites_2, *invitation_flags)

        pending = test_md.get_pending(['invite0@example.org'])

    assert len(pending) == 2

    assert pending[0]['name'] == 'test1.pdf'
    assert pending[0]['size'] == 1500000
    assert pending[0]['type'] == 'application/pdf'
    assert pending[0]['owner']['email'] == 'owner@example.org'

    assert pending[1]['name'] == 'test2.pdf'
    assert pending[1]['size'] == 1500000
    assert pending[1]['type'] == 'application/pdf'
    assert pending[1]['owner']['email'] == 'owner2@example.org'


def test_add_and_get_pending_invites(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key_1 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        pending = test_md.get_invited(dummy_key_1)

    assert len(pending) == 2

    assert pending[0]['name'] == 'invite0'
    assert pending[0]['email'] == 'invite0@example.org'
    assert not pending[0]['signed']

    assert pending[1]['name'] == 'invite1'
    assert pending[1]['email'] == 'invite1@example.org'
    assert not pending[1]['signed']


def test_add_update_and_get_pending_invites(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key_1 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        test_md.update(dummy_key_1, [sample_invites_1[0]['email']])
        pending = test_md.get_invited(dummy_key_1)

    assert len(pending) == 2

    assert pending[0]['name'] == 'invite0'
    assert pending[0]['email'] == 'invite0@example.org'
    assert pending[0]['signed']

    assert pending[1]['name'] == 'invite1'
    assert pending[1]['email'] == 'invite1@example.org'
    assert not pending[1]['signed']


def test_update_and_get_pending(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        test_md.update(dummy_key, [sample_invites_1[0]['email']])

        pending1 = test_md.get_pending(['invite0@example.org'])
        pending2 = test_md.get_pending(['invite1@example.org'])

    assert len(pending1) == 0

    assert len(pending2) == 1
    assert pending2[0]['name'] == 'test1.pdf'
    assert pending2[0]['size'] == 1500000
    assert pending2[0]['type'] == 'application/pdf'
    assert pending2[0]['owner']['email'] == 'owner@example.org'


def test_updated_timestamp(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

    def get_doc():
        db_path = os.path.join('/tmp/test.db')
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT * FROM Documents")
        result = cur.fetchone()
        cur.close()
        conn.close()
        return result

    result = get_doc()

    assert datetime.fromisoformat(result[5]) == datetime.fromisoformat(result[6])

    with run.app.app_context():
        test_md.update(dummy_key, ['invite1@example.org'])

    result = get_doc()

    assert datetime.fromisoformat(result[5]) < datetime.fromisoformat(result[6])


def test_add_and_get_owned(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 1
    assert owned[0]['key'] == dummy_key
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'
    assert [p['email'] for p in owned[0]['pending']] == ['invite0@example.org', 'invite1@example.org']


def test_add_and_remove(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.update(dummy_key, [sample_invites_1[0]['email']])
        test_md.update(dummy_key, [sample_invites_1[1]['email']])
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 0


def test_add_and_remove_wrong_key(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.update(dummy_key, [sample_invites_1[0]['email']])
        test_md.update(dummy_key, [sample_invites_1[1]['email']])
        test_md.remove(uuid.uuid4())

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 1


def test_add_and_remove_not(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 1


def test_add_and_remove_force(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.remove(dummy_key, force=True)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 0


def test_add_and_get_invitation(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)

    assert invitation['document']['key'] == str(dummy_key)


def test_add_and_get_invitation_wrong_key(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        invitation = test_md.get_invitation(uuid.uuid4())

    assert invitation == {}


def test_get_no_document(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        doc = test_md.get_document(uuid.uuid4())

    assert doc == {}


def test_add_and_lock(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(uuid.UUID(invitation['document']['key']))['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

    assert locked


def test_add_and_lock_wrong_email(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(uuid.UUID(invitation['document']['key']))['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, 'dummy@example.org')

    assert not locked


def test_add_and_rm_lock(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(uuid.UUID(invitation['document']['key']))['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, sample_invites_1[0]['email'])

    assert removed


def test_add_and_rm_lock_wrong_email(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(uuid.UUID(invitation['document']['key']))['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, 'dummy@exmple.org')

    assert not removed


def test_add_and_lock_before(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

        assert not locked


def test_add_and_lock_timeout(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        import datetime

        old = run.app.config['DOC_LOCK_TIMEOUT']
        run.app.config['DOC_LOCK_TIMEOUT'] = datetime.timedelta(seconds=0)
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

        run.app.config['DOC_LOCK_TIMEOUT'] = old

    assert not locked


def test_add_and_get_user(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

    assert invites[0]['email'] == sample_invites_1[0]['email']
