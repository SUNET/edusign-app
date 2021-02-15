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

from edusign_webapp import run


def test_add(doc_store_local_sqlite, sample_doc_1):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)

    assert len(os.listdir(doc_store.storage.base_dir)) == 2
    assert 'test.db' in os.listdir(doc_store.storage.base_dir)

    db_path = os.path.join(tempdir.name, 'test.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Documents")
    result = cur.fetchone()
    cur.close()
    conn.close()

    assert result[2:5] == (sample_doc_1['name'], sample_doc_1['size'], sample_doc_1['type'])


def test_add_and_get_pending(doc_store_local_sqlite, sample_doc_1):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])

    assert len(pending) == 1
    assert pending[0]['name'] == sample_doc_1['name']
    assert pending[0]['size'] == sample_doc_1['size']
    assert pending[0]['type'] == sample_doc_1['type']
    assert pending[0]['owner'] == owner


def test_add_two_and_get_pending(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        doc_store.add_document(sample_doc_2, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])

    assert len(pending) == 2
    assert pending[0]['name'] == sample_doc_1['name']
    assert pending[0]['size'] == sample_doc_1['size']
    assert pending[0]['type'] == sample_doc_1['type']
    assert pending[0]['owner'] == owner
    assert pending[1]['name'] == sample_doc_2['name']
    assert pending[1]['size'] == sample_doc_2['size']
    assert pending[1]['type'] == sample_doc_2['type']
    assert pending[1]['owner'] == owner


def test_add_and_get_content(doc_store_local_sqlite, sample_doc_1):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])
        content = doc_store.get_document_content(pending[0]['key'])

    assert content == sample_doc_1['blob']


def test_add_and_update_and_get_content(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], invites[1])
        content = doc_store.get_document_content(pending[0]['key'])
        pending0 = doc_store.get_pending_documents(invites[0])
        pending1 = doc_store.get_pending_documents(invites[1])

    assert content != sample_doc_1['blob']
    assert content == sample_doc_2['blob']

    assert len(pending0) == 1
    assert pending0[0]['name'] == sample_doc_1['name']
    assert pending0[0]['size'] == sample_doc_1['size']
    assert pending0[0]['type'] == sample_doc_1['type']
    assert pending0[0]['owner'] == owner

    assert len(pending1) == 0


def test_add_and_update_and_get_owned(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], invites[1])
        content = doc_store.get_document_content(pending[0]['key'])
        owned = doc_store.get_owned_documents(owner)

    assert content != sample_doc_1['blob']
    assert content == sample_doc_2['blob']

    assert len(owned) == 1
    assert owned[0]['name'] == sample_doc_1['name']
    assert owned[0]['size'] == sample_doc_1['size']
    assert owned[0]['type'] == sample_doc_1['type']

    assert invites[0] in owned[0]['pending']
    assert invites[1] not in owned[0]['pending']


def test_add_two_and_update_and_get_owned(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        doc_store.add_document(sample_doc_2, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], invites[1])
        content = doc_store.get_document_content(pending[0]['key'])
        owned = doc_store.get_owned_documents(owner)

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

    assert invites[0] in owned[0]['pending']
    assert invites[1] not in owned[0]['pending']

    assert invites[0] in owned[1]['pending']
    assert invites[1] in owned[1]['pending']


def test_add_two_and_remove_not_one_and_get_owned(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        doc_store.add_document(sample_doc_2, owner, invites)
        owned = doc_store.get_owned_documents(owner)
        doc_store.remove_document(owned[0]['key'])
        reowned = doc_store.get_owned_documents(owner)

    assert len(reowned) == 2
    assert reowned[0]['name'] == sample_doc_1['name']
    assert reowned[0]['size'] == sample_doc_1['size']
    assert reowned[0]['type'] == sample_doc_1['type']

    assert invites[0] in owned[0]['pending']
    assert invites[1] in owned[0]['pending']

    assert invites[0] in owned[1]['pending']
    assert invites[1] in owned[1]['pending']


def test_add_two_and_remove_force_one_and_get_owned(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        doc_store.add_document(sample_doc_2, owner, invites)
        owned = doc_store.get_owned_documents(owner)
        doc_store.remove_document(owned[0]['key'], force=True)
        reowned = doc_store.get_owned_documents(owner)

    assert len(reowned) == 1
    assert reowned[0]['name'] == sample_doc_2['name']
    assert reowned[0]['size'] == sample_doc_2['size']
    assert reowned[0]['type'] == sample_doc_2['type']


def test_add_two_and_remove_one_and_get_owned(doc_store_local_sqlite, sample_doc_1, sample_doc_2):
    tempdir, doc_store = doc_store_local_sqlite
    owner = 'owner@example.com'
    invites = ['invite1@example.com', 'invite2@example.com']

    with run.app.app_context():
        doc_store.add_document(sample_doc_1, owner, invites)
        doc_store.add_document(sample_doc_2, owner, invites)
        pending = doc_store.get_pending_documents(invites[1])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], invites[0])
        doc_store.update_document(pending[0]['key'], sample_doc_2['blob'], invites[1])
        doc_store.remove_document(pending[0]['key'])
        owned = doc_store.get_owned_documents(owner)

        content = doc_store.get_document_content(pending[0]['key'])

    assert len(owned) == 1
    assert owned[0]['name'] == sample_doc_2['name']
    assert owned[0]['size'] == sample_doc_2['size']
    assert owned[0]['type'] == sample_doc_2['type']

    assert content is None
