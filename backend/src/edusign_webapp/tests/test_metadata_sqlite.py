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
from datetime import datetime

from edusign_webapp import run


def test_add(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

    db_path = os.path.join(tempdir.name, 'test.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Documents")
    result = cur.fetchone()
    cur.close()
    conn.close()

    # Remove timestamps from the result
    assert result[:5] == (1, str(dummy_key), 'test1.pdf', 1500000, 'application/pdf')


def test_add_and_get_pending(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

        pending1 = test_md.get_pending('invite0@example.org')
        pending2 = test_md.get_pending('invite1@example.org')

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


def test_add_and_get_pending_not(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

        pending = test_md.get_pending('invite3@example.org')

    assert pending == []


def test_add_two_and_get_pending(
    sqlite_md, sample_metadata_1, sample_metadata_2, sample_owner_1, sample_owner_2, sample_invites_1, sample_invites_2
):
    tempdir, test_md = sqlite_md
    dummy_key_1 = uuid.uuid4()
    dummy_key_2 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1)
        test_md.add(dummy_key_2, sample_metadata_2, sample_owner_2, sample_invites_2)

        pending = test_md.get_pending('invite0@example.org')

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
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1)

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
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1)

        test_md.update(dummy_key_1, sample_invites_1[0]['email'])
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
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

        test_md.update(dummy_key, sample_invites_1[0]['email'])

        pending1 = test_md.get_pending('invite0@example.org')
        pending2 = test_md.get_pending('invite1@example.org')

    assert len(pending1) == 0

    assert len(pending2) == 1
    assert pending2[0]['name'] == 'test1.pdf'
    assert pending2[0]['size'] == 1500000
    assert pending2[0]['type'] == 'application/pdf'
    assert pending2[0]['owner']['email'] == 'owner@example.org'


def test_updated_timestamp(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

    def get_doc():
        db_path = os.path.join(tempdir.name, 'test.db')
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
        test_md.update(dummy_key, 'invite1@example.org')

    result = get_doc()

    assert datetime.fromisoformat(result[5]) < datetime.fromisoformat(result[6])


def test_add_and_get_owned(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

        owned = test_md.get_owned('owner@example.org')

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
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)
        test_md.update(dummy_key, sample_invites_1[0]['email'])
        test_md.update(dummy_key, sample_invites_1[1]['email'])
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 0


def test_add_and_remove_not(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 1


def test_add_and_get_invitation(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)

    assert invitation['document']['key'] == str(dummy_key)


def test_add_and_lock(sqlite_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

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
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

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
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

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
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(uuid.UUID(invitation['document']['key']))['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, 'dummy@exmple.org')

    assert not removed
