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
import uuid
from datetime import datetime

import pytest

from edusign_webapp import run


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

    doc_id = int(test_md.client.redis.get(f"doc:key:{str(dummy_key)}"))
    result = test_md.client.redis.hgetall(f"doc:{doc_id}")

    assert result[b'name'].decode('utf8') == 'test1.pdf'
    assert int(result[b'size']) == 1500000
    assert result[b'type'].decode('utf8') == 'application/pdf'
    assert int(result[b'owner']) > 0


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_get_no_pending(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md

    with run.app.app_context():
        pending = test_md.get_pending('invite0@example.org')

    assert pending == []


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_pending(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

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


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_pending_not(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        pending = test_md.get_pending('invite3@example.org')

    assert pending == []


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_two_and_get_pending(
    redis_md, sample_metadata_1, sample_metadata_2, sample_owner_1, sample_owner_2, sample_invites_1, sample_invites_2
):
    tempdir, test_md = redis_md
    dummy_key_1 = uuid.uuid4()
    dummy_key_2 = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)
        test_md.add(dummy_key_2, sample_metadata_2, sample_owner_2, sample_invites_2, sendsigned, loa)

        pending = test_md.get_pending('invite0@example.org')

    assert len(pending) == 2

    for p in pending:
        assert p['name'] in ['test1.pdf', 'test2.pdf']
        assert p['size'] == 1500000
        assert p['type'] == 'application/pdf'
        assert p['owner']['email'] in ['owner@example.org', 'owner2@example.org']


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_pending_invites(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key_1 = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        pending = test_md.get_invited(dummy_key_1)

    assert len(pending) == 2

    for p in pending:
        assert p['name'] in ['invite0', 'invite1']
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']
        assert not p['signed']


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_update_and_get_pending_invites(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key_1 = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key_1, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        test_md.update(dummy_key_1, sample_invites_1[0]['email'])
        pending = test_md.get_invited(dummy_key_1)

    assert len(pending) == 2

    for p in pending:
        assert p['name'] in ['invite0', 'invite1']
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']

    assert pending[0]['signed'] is not pending[1]['signed']


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_update_and_get_pending(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        test_md.update(dummy_key, sample_invites_1[0]['email'])

        pending1 = test_md.get_pending('invite0@example.org')
        pending2 = test_md.get_pending('invite1@example.org')

    assert len(pending1) == 0

    assert len(pending2) == 1
    assert pending2[0]['name'] == 'test1.pdf'
    assert pending2[0]['size'] == 1500000
    assert pending2[0]['type'] == 'application/pdf'
    assert pending2[0]['owner']['email'] == 'owner@example.org'


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_updated_timestamp(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

    def get_doc():
        doc_id = int(test_md.client.redis.get(f"doc:key:{str(dummy_key)}"))
        return test_md.client.redis.hgetall(f"doc:{doc_id}")

    result = get_doc()

    assert datetime.fromtimestamp(float(result[b'created'])) == datetime.fromtimestamp(float(result[b'updated']))

    with run.app.app_context():
        test_md.update(dummy_key, 'invite1@example.org')

    result = get_doc()

    assert datetime.fromtimestamp(float(result[b'created'])) < datetime.fromtimestamp(float(result[b'updated']))


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_owned(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 1
    assert owned[0]['key'] == dummy_key
    assert owned[0]['name'] == 'test1.pdf'
    assert owned[0]['size'] == 1500000
    assert owned[0]['type'] == 'application/pdf'
    for p in owned[0]['pending']:
        assert p['email'] in ['invite0@example.org', 'invite1@example.org']


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_remove(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)
        test_md.update(dummy_key, sample_invites_1[0]['email'])
        test_md.update(dummy_key, sample_invites_1[1]['email'])
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 0


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_remove_wrong_key(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)
        test_md.update(dummy_key, sample_invites_1[0]['email'])
        test_md.update(dummy_key, sample_invites_1[1]['email'])
        test_md.remove(uuid.uuid4())

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 1


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_remove_not(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)
        test_md.remove(dummy_key)

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 1


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_remove_force(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)
        test_md.remove(dummy_key, force=True)

        owned = test_md.get_owned('owner@example.org')

    assert len(owned) == 0


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_invitation(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)

    assert invitation['document']['key'] == dummy_key


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_invitation_wrong_key(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        invitation = test_md.get_invitation(uuid.uuid4())

    assert invitation == {}


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_get_no_document(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        doc = test_md.get_document(uuid.uuid4())

    assert doc == {}


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_lock(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

    assert locked


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_lock_wrong_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, 'dummy@example.org')

    assert not locked


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_rm_lock(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, sample_invites_1[0]['email'])

    assert removed


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_rm_lock_wrong_email(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = invites[0]['key']
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        removed = test_md.rm_lock(doc_id, 'dummy@exmple.org')

    assert not removed


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_lock_before(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

        assert not locked


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_lock_timeout(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        import datetime

        old = run.app.config['DOC_LOCK_TIMEOUT']
        run.app.config['DOC_LOCK_TIMEOUT'] = datetime.timedelta(seconds=0)
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        key = uuid.UUID(invites[0]['key'])
        invitation = test_md.get_invitation(key)
        doc_id = test_md.get_document(invitation['document']['key'])['doc_id']
        test_md.add_lock(doc_id, sample_invites_1[0]['email'])
        locked = test_md.check_lock(doc_id, sample_invites_1[0]['email'])

        run.app.config['DOC_LOCK_TIMEOUT'] = old

    assert not locked


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_user(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        invites = test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        user_id = int(invites[0]['id'])
        user = test_md.get_user(user_id)

    assert user['email'] == sample_invites_1[0]['email']


@pytest.mark.skip(reason="Please update redis code and enable these tests")
def test_add_and_get_no_user(redis_md, sample_metadata_1, sample_owner_1, sample_invites_1):
    tempdir, test_md = redis_md
    dummy_key = uuid.uuid4()
    sendsigned = True
    loa = ''

    with run.app.app_context():
        test_md.add(dummy_key, sample_metadata_1, sample_owner_1, sample_invites_1, sendsigned, loa)

        user = test_md.get_user(1000000)

    assert user == {}
