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

invitation_flags = [
    True,  # sendsigned
    'any',  # loa
    False,  # skipfinal
    False,  # ordered
    'Invitation text',  # invitation_text
]


def test_add(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

    doc_id = int(test_md.client.redis.get(f"doc:key:{str(dummy_key)}"))
    result = test_md.client.redis.hgetall(f"doc:{doc_id}")

    assert result[b'name'].decode('utf8') == 'test1.pdf'
    assert int(result[b'size']) == 1500000
    assert result[b'type'].decode('utf8') == 'application/pdf'
    assert result[b'owner_name'].decode('utf8') == 'owner'
    assert result[b'owner_email'].decode('utf8') == 'owner@example.org'
    assert result[b'owner_lang'].decode('utf8') == 'en'
    assert result[b'owner_eppn'].decode('utf8') == 'owner-eppn@example.org'


def test_get_full(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        document = test_md.get_full_document(dummy_key)

    assert document['name'] == 'test1.pdf'
    assert document['size'] == 1500000
    assert document['type'] == 'application/pdf'
    assert document['owner_name'] == 'owner'
    assert document['owner_email'] == 'owner@example.org'
    assert document['owner_lang'] == 'en'
    assert document['owner_eppn'] == 'owner-eppn@example.org'


def test_add_raw(sqlite_md, redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    _, sqlite_test_md = sqlite_md
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        sqlite_test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

    db_path = os.path.join('/tmp/test.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Documents")
    result = cur.fetchone()
    cur.close()
    conn.close()

    # Remove timestamps from the result
    assert result[:5] == (1, str(dummy_key), 'test1.pdf', 1500000, 'application/pdf')

    with run.app.app_context():
        document = sqlite_test_md.get_full_document(dummy_key)
        sqlite_test_md.remove(dummy_key, force=True)
        ids = sqlite_test_md.get_old(0)

        assert len(ids) == 0

        test_md.add_document_raw(document)

    doc_id = int(test_md.client.redis.get(f"doc:key:{str(dummy_key)}"))
    result = test_md.client.redis.hgetall(f"doc:{doc_id}")

    assert result[b'name'].decode('utf8') == 'test1.pdf'
    assert int(result[b'size']) == 1500000
    assert result[b'type'].decode('utf8') == 'application/pdf'
    assert result[b'owner_name'].decode('utf8') == 'owner'
    assert result[b'owner_email'].decode('utf8') == 'owner@example.org'
    assert result[b'owner_lang'].decode('utf8') == 'en'
    assert result[b'owner_eppn'].decode('utf8') == 'owner-eppn@example.org'


def test_get_no_pending(redis_md):
    _, test_md = redis_md
    test_md.client.redis.flushall()

    with run.app.app_context():
        pending = test_md.get_pending(['invite0@example.org'])

    assert pending == []


def test_add_and_get_pending(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        pending1 = test_md.get_pending(['invite0@example.org'])
        pending2 = test_md.get_pending(['invite1@example.org'])

    assert len(pending1) == 1
    assert pending1[0]['name'] == 'test1.pdf'
    assert pending1[0]['size'] == 1500000
    assert pending1[0]['type'] == 'application/pdf'
    assert pending1[0]['owner_email'] == 'owner@example.org'

    assert len(pending2) == 1
    assert pending2[0]['name'] == 'test1.pdf'
    assert pending2[0]['size'] == 1500000
    assert pending2[0]['type'] == 'application/pdf'
    assert pending2[0]['owner_email'] == 'owner@example.org'


def test_add_document_and_get_owned(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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


def test_add_document_and_decline_and_get_owned(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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


def test_add_document_and_sign_and_get_owned(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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


def test_add_document_and_sign_and_get_full_invites(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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


def test_add_document_and_decline_and_get_full_invites(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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
    redis_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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
    redis_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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
    redis_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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
    assert invites[0]['order'] == 0


def test_add_document_and_2_invitation_raw_and_get_full_invites(
    redis_md, sample_metadata_1, sample_owner_1, sample_invites_1
):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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
    assert invite0['order'] in (0, 1)


def test_add_and_get_pending_not(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        pending = test_md.get_pending(['invite3@example.org'])

    assert pending == []


def test_add_two_and_get_pending(
    redis_md, sample_metadata_1, sample_metadata_2, sample_owner_1, sample_owner_2, sample_invites_1, sample_invites_2
):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key_1 = uuid.uuid4()
    dummy_key_2 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.add(dummy_key_2, sample_metadata_2, sample_owner_2, sample_invites_2, *invitation_flags)

        pending = test_md.get_pending(['invite0@example.org'])

    assert len(pending) == 2

    for p in pending:
        assert p['name'] in ['test1.pdf', 'test2.pdf']
        assert p['size'] == 1500000
        assert p['type'] == 'application/pdf'
        assert p['owner_email'] in ['owner@example.org', 'owner2@example.org']


def test_add_and_get_pending_invites(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key_1 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        pending = test_md.get_invited(dummy_key_1)

    assert len(pending) == 2

    for p in pending:
        assert p['name'] in ['invite0', 'invite1']
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']
        assert not p['signed']


def test_add_update_and_get_pending_invites(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key_1 = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        test_md.update(dummy_key_1, [sample_invites_1[0]['email']])
        pending = test_md.get_invited(dummy_key_1)

    assert len(pending) == 2

    for p in pending:
        assert p['name'] in ['invite0', 'invite1']
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']

    assert pending[0]['signed'] is not pending[1]['signed']


def test_update_and_get_pending(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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
    assert pending2[0]['owner_email'] == 'owner@example.org'


def test_updated_timestamp(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

    def get_doc():
        doc_id = int(test_md.client.redis.get(f"doc:key:{str(dummy_key)}"))
        return test_md.client.redis.hgetall(f"doc:{doc_id}")

    result = get_doc()

    assert datetime.fromtimestamp(float(result[b'created'])) == datetime.fromtimestamp(float(result[b'updated']))

    with run.app.app_context():
        test_md.update(dummy_key, ['invite1@example.org'])

    result = get_doc()

    assert datetime.fromtimestamp(float(result[b'created'])) < datetime.fromtimestamp(float(result[b'updated']))


def test_add_and_get_owned_by_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 1
    assert owned[0]['key'] == dummy_key
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'
    for p in owned[0]['pending']:
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']


def test_add_and_get_owned(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 1
    assert owned[0]['key'] == dummy_key
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'
    for p in owned[0]['pending']:
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']


def test_add_and_remove_by_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.update(dummy_key, [sample_invites_1[0]['email']])
        test_md.update(dummy_key, [sample_invites_1[1]['email']])
        test_md.remove(dummy_key)

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 0


def test_add_and_remove(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.update(dummy_key, [sample_invites_1[0]['email']])
        test_md.update(dummy_key, [sample_invites_1[1]['email']])
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 0


def test_add_and_remove_wrong_key_by_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.update(dummy_key, [sample_invites_1[0]['email']])
        test_md.update(dummy_key, [sample_invites_1[1]['email']])
        test_md.remove(uuid.uuid4())

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 1


def test_add_and_remove_wrong_key(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.update(dummy_key, [sample_invites_1[0]['email']])
        test_md.update(dummy_key, [sample_invites_1[1]['email']])
        test_md.remove(uuid.uuid4())

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 1


def test_add_and_remove_not_by_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.remove(dummy_key)

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 1


def test_add_and_remove_not(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 1


def test_add_and_remove_force_by_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.remove(dummy_key, force=True)

        owned = test_md.get_owned_by_email('owner@example.org')

    assert len(owned) == 0


def test_add_and_remove_force(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)
        test_md.remove(dummy_key, force=True)

        owned = test_md.get_owned('owner-eppn@example.org')

    assert len(owned) == 0


def test_add_and_get_invitation(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)

    assert invitation['document']['key'] == dummy_key


def test_add_and_get_invitation_wrong_key(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        invitation = test_md.get_invitation(uuid.uuid4())

    assert invitation == {}


def test_get_no_document(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        doc = test_md.get_document(uuid.uuid4())

    assert doc == {}


def test_add_and_lock(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

    assert locked


def test_add_and_lock_wrong_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, 'dummy@example.org')

    assert not locked


def test_add_and_rm_lock(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, sample_invites_1[0]['email'])

    assert removed


def test_add_and_rm_lock_wrong_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = invites[0]['key']
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, 'dummy@exmple.org')

    assert not removed


def test_add_and_lock_before(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

        assert not locked


def test_add_and_lock_timeout(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
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


def test_add_and_get_user(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    _, test_md = redis_md
    test_md.client.redis.flushall()
    dummy_key = uuid.uuid4()

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, *invitation_flags)

        invite = invites[0]

    assert invite['email'] == sample_invites_1[0]['email']
