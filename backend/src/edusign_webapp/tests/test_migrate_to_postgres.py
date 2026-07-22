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
Tests for the admin view that migrates a deployment
from SQLite / local fs to PostgreSQL / S3.

These tests need a PostgreSQL server. Point them at one with the
PG_TEST_HOST / PG_TEST_PORT / PG_TEST_USER / PG_TEST_PASSWORD env vars
(default localhost:5432, user and password 'postgres'). When no server
is reachable, the tests are skipped. A suitable throwaway server:

    docker run --rm -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
"""

import os
import tempfile
import uuid

import psycopg2
import pytest
from moto import mock_aws

from edusign_webapp import run
from edusign_webapp.doc_store import DocStore
from edusign_webapp.document.metadata.sqlite import SqliteMD
from edusign_webapp.document.storage.local import LocalStorage
from edusign_webapp.tests.conftest import _environ_base, config_dev
from edusign_webapp.tests.sample_pdfs import pdf_simple_1, pdf_simple_2

PG_CONFIG = {
    'PG_DB_USER': os.environ.get('PG_TEST_USER', 'postgres'),
    'PG_DB_PASSWORD': os.environ.get('PG_TEST_PASSWORD', 'postgres'),
    'PG_DB_HOST': os.environ.get('PG_TEST_HOST', 'localhost'),
    'PG_DB_PORT': os.environ.get('PG_TEST_PORT', '5432'),
    'PG_DB_NAME': 'edusign_test',
}


def _pg_connect(dbname):
    return psycopg2.connect(
        dbname=dbname,
        user=PG_CONFIG['PG_DB_USER'],
        password=PG_CONFIG['PG_DB_PASSWORD'],
        host=PG_CONFIG['PG_DB_HOST'],
        port=PG_CONFIG['PG_DB_PORT'],
        connect_timeout=2,
    )


def _drop_test_tables():
    """Empty the test database, so that each test starts from scratch."""
    try:
        conn = _pg_connect('edusign_test')
    except psycopg2.OperationalError:
        # the database does not exist yet; PostgresqlMD will create it
        return
    conn.autocommit = True
    with conn.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS Invites, PayableSignatures, Documents CASCADE;")
    conn.close()


@pytest.fixture
def pg_migration_app():
    try:
        conn = _pg_connect('postgres')
        conn.close()
    except psycopg2.OperationalError:
        pytest.skip("no PostgreSQL server available (see test_migrate_to_postgres.py docstring)")

    _drop_test_tables()

    tempdir = tempfile.TemporaryDirectory()
    config = dict(config_dev)
    config.update(
        {
            'STORAGE_CLASS_PATH': 'edusign_webapp.document.storage.s3.S3Storage',
            'DOC_METADATA_CLASS_PATH': 'edusign_webapp.document.metadata.postgres.PostgresqlMD',
            'AWS_REGION_NAME': 'us-east-1',
            'LOCAL_STORAGE_BASE_DIR': tempdir.name,
            'SQLITE_MD_DB_PATH': os.path.join(tempdir.name, 'test.db'),
        }
    )
    config.update(PG_CONFIG)

    app = run.edusign_init_app('testing', config)
    app.testing = True

    yield tempdir, app

    # return the pooled connections, so that the next test can drop the tables
    app.extensions['doc_store'].metadata.connection_pool.closeall()


invitation_flags = [
    False,  # sendsigned
    'high',  # loa
    True,  # skipfinal
    True,  # ordered
    True,  # allowbankid
    'A custom invitation text',  # invitation_text
]


def _old_doc_store(app):
    """The sqlite / local fs doc store to migrate away from, as built by the view."""
    sqlite_md = SqliteMD(app)
    local_storage = LocalStorage(app.config, app.logger)
    return DocStore.custom(app, local_storage, sqlite_md)


def _seed_old_doc_store(app):
    """Add to the old store one document with two invites, and one without invites."""
    doc_1 = {
        'key': str(uuid.uuid4()),
        'name': 'invited.pdf',
        'size': 1500000,
        'type': 'application/pdf',
        'blob': pdf_simple_1,
        'prev_signatures': 'previous signature',
    }
    doc_2 = {
        'key': str(uuid.uuid4()),
        'name': 'not-invited.pdf',
        'size': 1500000,
        'type': 'application/pdf',
        'blob': pdf_simple_2,
        'prev_signatures': '',
    }
    owner = {'name': 'Owner', 'email': 'owner@example.org', 'eppn': 'owner-eppn@example.org', 'lang': 'en'}
    invites = [
        {'name': 'invite0', 'email': 'invite0@example.org', 'ssn': '8112189876', 'lang': 'en'},
        {'name': 'invite1', 'email': 'invite1@example.org', 'ssn': '', 'lang': 'sv'},
    ]

    with app.test_request_context():
        old_store = _old_doc_store(app)
        old_store.add_document(doc_1, owner, invites, *invitation_flags)
        old_store.add_document(doc_2, owner, [], *invitation_flags)
        # mark one invitation as declined, to check that state survives the migration
        old_store.decline_document(uuid.UUID(doc_1['key']), ['invite1@example.org'])
        # payable signatures are migrated too
        old_store.add_signature(
            'bankid', 'Test Org', 'invited.pdf', 'owner-eppn@example.org', '8112189876', 1752000000000
        )
        old_store.add_signature(
            'freja', 'Test Org', 'other.pdf', 'owner-eppn@example.org', '199001019876', 1752100000000
        )

    return doc_1, doc_2


@mock_aws
def test_migrate_to_postgres_and_s3(pg_migration_app):
    tempdir, app = pg_migration_app
    app.extensions['doc_store'].storage.s3.create_bucket(Bucket='edusign-storage')

    doc_1, doc_2 = _seed_old_doc_store(app)

    client = app.test_client()
    client.environ_base.update(_environ_base)
    response = client.post('/admin/migrate-to-postgres-and-s3')

    assert response.status == '200 OK'
    # doc_2 has no invitations, so it is skipped
    assert b'OK, migrated 1 documents and 2 invitations and 2 payable signatures' in response.data

    key = uuid.UUID(doc_1['key'])
    with app.test_request_context():
        new_store = app.extensions['doc_store']

        doc = new_store.get_full_document(key)
        assert doc['name'] == 'invited.pdf'
        assert doc['size'] == 1500000
        assert doc['type'] == 'application/pdf'
        assert doc['owner_email'] == 'owner@example.org'
        assert doc['owner_name'] == 'Owner'
        assert doc['owner_eppn'] == 'owner-eppn@example.org'
        assert doc['owner_lang'] == 'en'
        assert doc['prev_signatures'] == 'previous signature'
        assert not bool(doc['sendsigned'])
        assert doc['loa'] == 'high'
        assert bool(doc['skipfinal'])
        assert bool(doc['ordered_invitations'])
        assert bool(doc['allowbankid'])
        assert doc['invitation_text'] == 'A custom invitation text'

        invites = new_store.get_full_invites(key)
        assert len(invites) == 2
        invites.sort(key=lambda invite: invite['order'])

        assert invites[0]['email'] == 'invite0@example.org'
        assert invites[0]['name'] == 'invite0'
        assert invites[0]['ssn'] == '8112189876'
        assert invites[0]['lang'] == 'en'
        assert not invites[0]['signed']
        assert not invites[0]['declined']
        assert invites[0]['order'] == 0

        assert invites[1]['email'] == 'invite1@example.org'
        assert invites[1]['ssn'] == ''
        assert invites[1]['lang'] == 'sv'
        assert invites[1]['declined']
        assert invites[1]['order'] == 1

        # the contents have been migrated to (mocked) s3
        assert new_store.get_document_content(key) == pdf_simple_1
        # doc_2 was not migrated
        assert new_store.get_full_document(uuid.UUID(doc_2['key'])) == {}

        # the payable signatures have been migrated
        usage = new_store.get_signatures_global()
        assert sorted(
            [(row['organization'], row['type'], row['number_of_signatures']) for row in usage]
        ) == [('Test Org', 'bankid', 1), ('Test Org', 'freja', 1)]

        bankid_sigs = new_store.get_signatures('Test Org', 'bankid')
        assert len(bankid_sigs) == 1
        assert bankid_sigs[0]['owner_eppn'] == 'owner-eppn@example.org'
        assert bankid_sigs[0]['user_eppn'] == '8112189876'


@mock_aws
def test_migrate_to_postgres_and_s3_empty(pg_migration_app):
    tempdir, app = pg_migration_app
    app.extensions['doc_store'].storage.s3.create_bucket(Bucket='edusign-storage')

    client = app.test_client()
    client.environ_base.update(_environ_base)
    response = client.post('/admin/migrate-to-postgres-and-s3')

    assert response.status == '200 OK'
    assert b'OK, migrated 0 documents and 0 invitations and 0 payable signatures' in response.data


def test_migrate_wrong_target_backends(client):
    # the view refuses to run against the sqlite / local fs backends
    with pytest.raises(AssertionError):
        client.post('/admin/migrate-to-postgres-and-s3')
