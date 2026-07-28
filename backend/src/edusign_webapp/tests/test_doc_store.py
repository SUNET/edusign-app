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
import tempfile
import uuid
from datetime import datetime

from edusign_webapp import run
from edusign_webapp.doc_store import DocStore
from edusign_webapp.tests.conftest import config_dev

invitation_flags = [
    True,  # sendsigned
    'none',  # loa
    False,  # skipfinal
    False,  # ordered
    False,  # allowbankid
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


def test_custom_doc_store():
    tempdir = tempfile.TemporaryDirectory()
    config = {
        'STORAGE_CLASS_PATH': 'edusign_webapp.document.storage.local.LocalStorage',
        'DOC_METADATA_CLASS_PATH': 'edusign_webapp.document.metadata.sqlite.SqliteMD',
        'LOCAL_STORAGE_BASE_DIR': tempdir.name,
        'SQLITE_MD_DB_PATH': os.path.join(tempdir.name, 'test.db'),
    }
    config.update(config_dev)
    config['SQLITE_MD_DB_PATH'] = os.path.join(tempdir.name, 'test.db')
    app = run.edusign_init_app('testing', config)

    store = DocStore.custom(app, 'fake-storage', 'fake-metadata')

    assert store.storage == 'fake-storage'
    assert store.metadata == 'fake-metadata'


def test_add_document_raw(doc_store_local_sqlite):
    tempdir, doc_store = doc_store_local_sqlite

    key = str(uuid.uuid4())
    document = {
        'key': key,
        'name': 'raw.pdf',
        'size': 100,
        'type': 'application/pdf',
        'created': datetime.now(),
        'updated': datetime.now(),
        'owner_email': 'owner@example.org',
        'owner_name': 'owner',
        'owner_lang': 'en',
        'owner_eppn': 'owner-eppn@example.org',
        'prev_signatures': '',
        'sendsigned': True,
        'loa': 'none',
        'skipfinal': False,
        'ordered_invitations': False,
        'allowbankid': False,
        'invitation_text': 'Invitation text',
    }
    content = base64.b64encode(b'raw content').decode('utf8')

    with run.app.app_context():
        doc_id = doc_store.add_document_raw(document, content)

        assert doc_id is not None
        assert doc_store.get_document_content(key) == content


def test_get_owned_documents_by_eppn_only(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        # searching with an unrelated email: the doc is still found through the eppn
        owned = doc_store.get_owned_documents(sample_owner_1['eppn'], ['unrelated@example.org'])

    assert len(owned) == 1
    assert owned[0]['name'] == sample_doc_1['name']


def test_add_invite_raw(doc_store_local_sqlite, sample_doc_1, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, [], *invitation_flags)
        doc_id = doc_store.get_document_id(sample_doc_1['key'])
        invite = {
            'key': str(uuid.uuid4()),
            'doc_id': doc_id,
            'email': 'raw-invite@example.org',
            'name': 'Raw Invite',
            'ssn': '',
            'lang': 'en',
            'signed': False,
            'declined': False,
            'order': 0,
        }
        doc_store.add_invite_raw(invite)

        pending = doc_store.get_pending_invites(sample_doc_1['key'])

    assert len(pending) == 1
    assert pending[0]['email'] == 'raw-invite@example.org'


def test_add_invitation_and_rm_invitation(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        invited = doc_store.add_invitation(
            uuid.UUID(sample_doc_1['key']), 'invite2', 'invite2@example.org', '', 'en'
        )

        assert invited

        pending = doc_store.get_pending_invites(sample_doc_1['key'])
        assert 'invite2@example.org' in [i['email'] for i in pending]

        new_invite = [i for i in pending if i['email'] == 'invite2@example.org'][0]
        assert doc_store.rm_invitation(uuid.UUID(str(new_invite['key'])), uuid.UUID(sample_doc_1['key']))

        pending = doc_store.get_pending_invites(sample_doc_1['key'])
        assert 'invite2@example.org' not in [i['email'] for i in pending]


def test_get_pending_invites_exclude(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        pending = doc_store.get_pending_invites(sample_doc_1['key'], exclude=[sample_invites_1[0]['email']])

    assert [i['email'] for i in pending] == [sample_invites_1[1]['email']]


def test_update_invitations_none_pending(doc_store_local_sqlite, sample_doc_1, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, [], *invitation_flags)
        # all original invites signed or declined: the new invite gets the next order
        orig_invites = [
            {
                'key': str(uuid.uuid4()),
                'name': 'invite0',
                'email': 'invite0@example.org',
                'ssn': '',
                'lang': 'en',
                'signed': True,
                'declined': False,
                'order': 0,
            }
        ]
        new_pending = [{'name': 'invite1', 'email': 'invite1@example.org', 'ssn': '', 'lang': 'en'}]
        changed = doc_store.update_invitations(sample_doc_1['key'], orig_invites, new_pending)

        assert [i['email'] for i in changed['added']] == ['invite1@example.org']
        assert changed['removed'] == []

        pending = doc_store.get_pending_invites(sample_doc_1['key'])

    assert [i['email'] for i in pending] == ['invite1@example.org']
    assert pending[0]['order'] == 1


def test_update_invitations_ordered(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    flags = list(invitation_flags)
    flags[3] = True  # ordered
    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *flags)
        orig_invites = [
            {
                'key': str(i['key']),
                'name': i['name'],
                'email': i['email'],
                'ssn': '',
                'lang': 'en',
                'signed': False,
                'declined': False,
                'order': n,
            }
            for n, i in enumerate(invites)
        ]
        new_pending = [{'name': 'invite2', 'email': 'invite2@example.org', 'ssn': '', 'lang': 'en'}]
        changed = doc_store.update_invitations(sample_doc_1['key'], orig_invites, new_pending)

        # with ordered invitations no additions or removals are recorded
        assert changed == {'added': [], 'removed': []}

        pending = doc_store.get_pending_invites(sample_doc_1['key'])

    assert [i['email'] for i in pending] == ['invite2@example.org']


def test_delegate_unknown_invitation(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        assert not doc_store.delegate(
            uuid.uuid4(), uuid.UUID(sample_doc_1['key']), 'other', 'other@example.org', '', 'en'
        )


def test_delegate_unknown_document(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        assert not doc_store.delegate(
            uuid.UUID(str(invites[0]['key'])), uuid.uuid4(), 'other', 'other@example.org', '', 'en'
        )


def test_delegate(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        assert doc_store.delegate(
            uuid.UUID(str(invites[0]['key'])), uuid.UUID(sample_doc_1['key']), 'other', 'other@example.org', '', 'en'
        )

        pending = doc_store.get_pending_invites(sample_doc_1['key'])
        emails = [i['email'] for i in pending]

    assert 'other@example.org' in emails
    assert invites[0]['email'] not in emails


def test_lock_unlock_unknown_document(doc_store_local_sqlite):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        assert not doc_store.lock_document(uuid.uuid4(), 'anyone@example.org')
        assert not doc_store.unlock_document(uuid.uuid4(), ['anyone@example.org'])


def test_get_full_document(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        doc = doc_store.get_full_document(sample_doc_1['key'])

    assert doc['name'] == sample_doc_1['name']
    assert doc['owner_email'] == sample_owner_1['email']


def test_get_full_invites(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)
        invites = doc_store.get_full_invites(sample_doc_1['key'])

    assert len(invites) == 2
    assert sorted([i['email'] for i in invites]) == sorted([i['email'] for i in sample_invites_1])
    assert not any([i['signed'] for i in invites])


def test_is_invitation_standing(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        invites = doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)

        assert doc_store.is_invitation_standing(invites[0]['key'])
        assert not doc_store.is_invitation_standing(uuid.uuid4())


def test_get_invitation_text(doc_store_local_sqlite, sample_doc_1, sample_owner_1, sample_invites_1):
    tempdir, doc_store = doc_store_local_sqlite

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, sample_invites_1, *invitation_flags)

        assert doc_store.get_invitation_text(sample_doc_1['key']) == 'Invitation text'


def test_signatures_raw_roundtrip(doc_store_local_sqlite):
    tempdir, doc_store = doc_store_local_sqlite

    signature = {
        'type': 'bankid',
        'organization': 'Test Org',
        'doc_name': 'test1.pdf',
        'owner_eppn': 'owner-eppn@example.org',
        'user_eppn': 'user-eppn@example.org',
        'timestamp': datetime.now(),
    }
    with run.app.app_context():
        doc_store.add_signature_raw(signature)

        all_signatures = doc_store.get_all_signatures()
        assert len(all_signatures) == 1
        assert all_signatures[0]['doc_name'] == 'test1.pdf'

        signatures = doc_store.get_signatures('Test Org', 'bankid')
        assert len(signatures) == 1

        assert doc_store.get_signatures('Other Org', 'bankid') == []
