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
import base64
import os
import sqlite3
import uuid

from edusign_webapp import run

invitation_flags = [
    True,  # sendsigned
    'any',  # loa
    False,  # skipfinal
    False,  # ordered
    'Invitation text',  # invitation_text
]


def test_add(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)

    assert len(os.listdir(doc_store.storage.base_dir)) == 1
    assert 'test.db' in os.listdir('/tmp')

    db_path = os.path.join('/tmp/test.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Documents")
    result = cur.fetchone()
    cur.close()
    conn.close()

    assert result[2:5] == (sample_doc_1['name'], sample_doc_1['size'], sample_doc_1['type'])


def test_add_and_get_pending(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])

    assert len(pending) == 1
    assert pending[0]['name'] == sample_doc_1['name']
    assert pending[0]['size'] == sample_doc_1['size']
    assert pending[0]['type'] == sample_doc_1['type']
    assert pending[0]['owner'] == sample_owner_1


def test_add_two_and_get_pending(doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.add_document(sample_doc_2, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])

    assert len(pending) == 2
    assert pending[0]['name'] == sample_doc_1['name']
    assert pending[0]['size'] == sample_doc_1['size']
    assert pending[0]['type'] == sample_doc_1['type']
    assert pending[0]['owner'] == sample_owner_1
    assert pending[1]['name'] == sample_doc_2['name']
    assert pending[1]['size'] == sample_doc_2['size']
    assert pending[1]['type'] == sample_doc_2['type']
    assert pending[1]['owner'] == sample_owner_1


def test_add_and_get_content(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])
        content = doc_store.get_document_content(pending[0]['key'])

    assert content == sample_doc_1['blob']


def test_add_and_update_and_get_content(
    doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], [sample_invites_1[1]['email']])
        content = doc_store.get_document_content(pending[0]['key'])
        pending0 = doc_store.get_pending_documents([sample_invites_1[0]['email']])
        pending1 = doc_store.get_pending_documents([sample_invites_1[1]['email']])

    assert content != sample_doc_1['blob']
    assert content == sample_doc_2['blob']

    assert len(pending0) == 1
    assert pending0[0]['name'] == sample_doc_1['name']
    assert pending0[0]['size'] == sample_doc_1['size']
    assert pending0[0]['type'] == sample_doc_1['type']
    assert pending0[0]['owner'] == sample_owner_1

    assert len(pending1) == 0


def test_add_and_update_and_get_owned(
    doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], [sample_invites_1[1]['email']])
        content = doc_store.get_document_content(pending[0]['key'])
        owned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])

    assert content != sample_doc_1['blob']
    assert content == sample_doc_2['blob']

    assert len(owned) == 1
    assert owned[0]['name'] == sample_doc_1['name']
    assert owned[0]['size'] == sample_doc_1['size']
    assert owned[0]['type'] == sample_doc_1['type']

    assert sample_invites_1[0]['email'] in [o['email'] for o in owned[0]['pending']]
    assert sample_invites_1[1]['email'] not in [o['email'] for o in owned[0]['pending']]


def test_add_two_and_update_and_get_owned(
    doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.add_document(sample_doc_2, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], [sample_invites_1[1]['email']])
        content = doc_store.get_document_content(pending[0]['key'])
        owned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])

    assert content != sample_doc_1['blob']
    assert content == sample_doc_2['blob']

    assert content != sample_doc_1['blob']
    assert content == sample_doc_2['blob']

    assert len(owned) == 2
    assert owned[0]['name'] == sample_doc_1['name']
    assert owned[0]['size'] == sample_doc_1['size']
    assert owned[0]['type'] == sample_doc_1['type']

    assert owned[1]['name'] == sample_doc_2['name']
    assert owned[1]['size'] == sample_doc_2['size']
    assert owned[1]['type'] == sample_doc_2['type']

    assert sample_invites_1[0]['email'] in [o['email'] for o in owned[0]['pending']]
    assert sample_invites_1[1]['email'] not in [o['email'] for o in owned[0]['pending']]

    assert sample_invites_1[0]['email'] in [o['email'] for o in owned[1]['pending']]
    assert sample_invites_1[1]['email'] in [o['email'] for o in owned[1]['pending']]


def test_add_two_and_remove_not_one_and_get_owned(
    doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.add_document(sample_doc_2, sample_owner_1, sample_invites_1, *invitation_flags)
        owned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])
        doc_store.remove_document(owned[0]['key'])
        reowned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])

    assert len(reowned) == 2
    assert reowned[0]['name'] == sample_doc_1['name']
    assert reowned[0]['size'] == sample_doc_1['size']
    assert reowned[0]['type'] == sample_doc_1['type']

    assert sample_invites_1[0]['email'] in [o['email'] for o in owned[0]['pending']]
    assert sample_invites_1[1]['email'] in [o['email'] for o in owned[0]['pending']]

    assert sample_invites_1[0]['email'] in [o['email'] for o in owned[1]['pending']]
    assert sample_invites_1[1]['email'] in [o['email'] for o in owned[1]['pending']]


def test_add_two_and_remove_force_one_and_get_owned(
    doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.add_document(sample_doc_2, sample_owner_1, sample_invites_1, *invitation_flags)
        owned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])
        doc_store.remove_document(owned[0]['key'], force=True)
        reowned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])

    assert len(reowned) == 1
    assert reowned[0]['name'] == sample_doc_2['name']
    assert reowned[0]['size'] == sample_doc_2['size']
    assert reowned[0]['type'] == sample_doc_2['type']


def test_add_two_and_remove_one_and_get_owned(
    doc_store_local_sqlite, sample_doc_1, sample_doc_2, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.add_document(sample_doc_2, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_documents([sample_invites_1[1]['email']])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], [sample_invites_1[0]['email']])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], [sample_invites_1[1]['email']])
        doc_store.remove_document(pending[0]['key'])
        owned = doc_store.get_owned_documents(sample_owner_1['eppn'], [sample_owner_1['email']])

        content = doc_store.get_document_content(pending[0]['key'])

    assert len(owned) == 1
    assert owned[0]['name'] == sample_doc_2['name']
    assert owned[0]['size'] == sample_doc_2['size']
    assert owned[0]['type'] == sample_doc_2['type']

    assert content is None


def test_add_and_get_invitation(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        invitation = doc_store.get_invitation(invites[0]['key'])

    assert len(invites) == 2
    assert invitation['user']['email'] == 'invite0@example.org'


def test_add_and_get_invitation_twice(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.get_invitation(invites[0]['key'])
        try:
            doc_store.get_invitation(invites[1]['key'])
        except Exception as e:
            assert isinstance(e, doc_store.DocumentLocked)


def test_get_invitation_none(doc_store_local_sqlite):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        data = doc_store.get_invitation(uuid.uuid4())

    assert data == {}


def test_add_and_get_invitation_twice_unlocking(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.get_invitation(invites[0]['key'])
        doc_store.unlock_document(sample_doc_1['key'], invites[0]['email'])
        invitation = doc_store.get_invitation(invites[1]['key'])

    assert invitation['user']['email'] == 'invite1@example.org'


def test_add_and_get_invitation_and_check_lock(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.get_invitation(invites[0]['key'])

        assert doc_store.check_document_locked(sample_doc_1['key'], invites[0]['email'])
        assert not doc_store.check_document_locked(sample_doc_1['key'], 'dummy@example.org')


def test_check_locked_none(doc_store_local_sqlite):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        assert not doc_store.check_document_locked(uuid.uuid4(), 'dummy@example.org')


def test_add_and_get_invitation_twice_unlocking_check(
    doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc_store.get_invitation(invites[0]['key'])
        doc_store.unlock_document(sample_doc_1['key'], invites[0]['email'])
        doc_store.get_invitation(invites[1]['key'])

        assert not doc_store.check_document_locked(sample_doc_1['key'], invites[0]['email'])
        assert doc_store.check_document_locked(sample_doc_1['key'], invites[1]['email'])


def test_add_and_sign_and_get_signed(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)

        content_1 = base64.b64encode(b"dummy content 1").decode('utf8')
        content_2 = base64.b64encode(b"dummy content 2").decode('utf8')
        doc_store.update_document(sample_doc_1['key'], content_1, [invites[0]['email']])
        doc_store.update_document(sample_doc_1['key'], content_2, [invites[1]['email']])

        signed = doc_store.get_signed_document(sample_doc_1['key'])

        assert signed['key'] == sample_doc_1['key']
        assert signed['blob'] == content_2


def test_add_and_get_invitation_and_get_owner_data(
    doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1
):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        owner = doc_store.get_owner_data(sample_doc_1['key'])

    assert owner['email'] == sample_owner_1['email']
