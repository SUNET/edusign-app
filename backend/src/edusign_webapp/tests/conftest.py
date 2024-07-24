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
import logging
import os
import tempfile
import uuid
from base64 import b64decode, b64encode
from copy import copy, deepcopy
from datetime import timedelta

import pytest

from edusign_webapp import run
from edusign_webapp.doc_store import DocStore
from edusign_webapp.document.metadata.redis_client import RedisMD
from edusign_webapp.document.metadata.sqlite import SqliteMD
from edusign_webapp.document.storage.local import LocalStorage
from edusign_webapp.tests.sample_pdfs import pdf_form_1, pdf_form_2, pdf_simple_1, pdf_simple_2

here = os.path.abspath(os.path.dirname(__file__))


config_dev = {
    'TESTING': True,
    'ENVIRONMENT': 'development',
    'SCOPE_WHITELIST': 'example.org',
    'USER_BLACKLIST': 'blacklisted@example.org',
    'USER_WHITELIST': 'whitelisted@example.org',
    'MAIL_BACKEND': 'dummy',
    'BABEL_DEFAULT_LOCALE': 'en',
    'DOC_LOCK_TIMEOUT': timedelta(seconds=300),
    'SESSION_COOKIE_SECURE': False,
    'SESSION_COOKIE_DOMAIN': 'test.localhost',
    'SERVER_NAME': 'test.localhost',
    'SQLITE_MD_DB_PATH': '/tmp/test.db',
}


config_pro = {
    'TESTING': True,
    'ENVIRONMENT': 'production',
    'SCOPE_WHITELIST': 'example.org',
    'USER_BLACKLIST': 'blacklisted@example.org',
    'USER_WHITELIST': 'whitelisted@example.org',
    'MAIL_BACKEND': 'dummy',
    'BABEL_DEFAULT_LOCALE': 'en',
    'DOC_LOCK_TIMEOUT': timedelta(seconds=300),
    'SESSION_COOKIE_SECURE': False,
    'SESSION_COOKIE_DOMAIN': 'test.localhost',
    'SERVER_NAME': 'test.localhost',
    'SQLITE_MD_DB_PATH': '/tmp/test.db',
}


_environ_base = {
    "HTTP_MD_ORGANIZATIONNAME": 'Test Org',
    "HTTP_MD_REGISTRATIONAUTHORITY": 'http://www.swamid.se/',
    "HTTP_EDUPERSONPRINCIPALNAME_20": 'dummy-eppn@example.org',
    "HTTP_DISPLAYNAME_20": b64encode('<Attribute>Tëster Kid</Attribute>'.encode("utf-8")).decode('ascii'),
    "HTTP_MAIL_20": b64encode(b'<Attribute>tester@example.org</Attribute>').decode('ascii'),
    "HTTP_SHIB_IDENTITY_PROVIDER": 'https://idp',
    "HTTP_SHIB_AUTHENTICATION_METHOD": 'dummy',
    "HTTP_SHIB_AUTHNCONTEXT_CLASS": 'dummy',
    "HTTP_EDUPERSONASSURANCE_20": b';'.join(
        [
            b64encode(b'<AttributeValue>http://www.swamid.se/policy/assurance/al1</AttributeValue>'),
            b64encode(b'<AttributeValue>https://refeds.org/assurance/IAP/low</AttributeValue>'),
            b64encode(b'<AttributeValue>https://refeds.org/assurance</AttributeValue>'),
        ]
    ).decode('ascii'),
}


_environ_base_2 = {
    "HTTP_MD_ORGANIZATIONNAME": 'Test Org',
    "HTTP_MD_REGISTRATIONAUTHORITY": 'http://www.swamid.se/',
    "HTTP_EDUPERSONPRINCIPALNAME_20": 'dummy-eppn-2@example.org',
    "HTTP_DISPLAYNAME_20": b64encode('<Attribute>Invited Kid</Attribute>'.encode("utf-8")).decode('ascii'),
    "HTTP_MAIL_20": b64encode(b'<Attribute>invite0@example.org</Attribute>').decode('ascii'),
    "HTTP_SHIB_IDENTITY_PROVIDER": 'https://idp',
    "HTTP_SHIB_AUTHENTICATION_METHOD": 'dummy',
    "HTTP_SHIB_AUTHNCONTEXT_CLASS": 'dummy',
    "HTTP_EDUPERSONASSURANCE_20": b';'.join(
        [
            b64encode(b'<AttributeValue>http://www.swamid.se/policy/assurance/al1</AttributeValue>'),
            b64encode(b'<AttributeValue>https://refeds.org/assurance/IAP/low</AttributeValue>'),
            b64encode(b'<AttributeValue>https://refeds.org/assurance</AttributeValue>'),
        ]
    ).decode('ascii'),
}


@pytest.fixture(autouse=True)
def run_around_tests():
    if os.path.exists('/tmp/test.db'):
        os.unlink('/tmp/test.db')
    yield


@pytest.fixture
def environ_base():
    yield _environ_base


@pytest.fixture
def environ_base_2():
    yield _environ_base_2


@pytest.fixture(params=[config_dev, config_pro])
def client(request):
    app = run.edusign_init_app('testing', request.param)
    app.testing = True
    app.config.update(request.param)
    app.extensions['api_client'].api_base_url = 'https://test.localhost'

    with app.test_client() as client:
        client.environ_base.update(_environ_base)

        app.extensions['doc_store'] = DocStore(app)

        yield client


@pytest.fixture(params=[config_dev, config_pro])
def client_custom(request):
    config_custom = copy(request.param)
    config_custom['UI_SEND_SIGNED'] = False
    config_custom['UI_SKIP_FINAL'] = False
    config_custom['CUSTOM_FORMS_DEFAULTS_FILE'] = '/tmp/edusign-forms.yaml'

    app = run.edusign_init_app('testing', config_custom)
    app.testing = True
    app.config.update(config_custom)
    app.extensions['api_client'].api_base_url = 'https://test.localhost'

    with app.test_client() as client:
        client.environ_base.update(_environ_base)

        app.extensions['doc_store'] = DocStore(app)

        yield client


@pytest.fixture(params=[config_dev, config_pro])
def app_and_client(request):
    app = run.edusign_init_app('testing', request.param)
    app.testing = True
    app.config.update(request.param)
    app.extensions['api_client'].api_base_url = 'https://test.localhost'

    with app.test_client() as client:
        client.environ_base.update(_environ_base)

        app.extensions['doc_store'] = DocStore(app)

        yield app, client


@pytest.fixture(params=[config_dev, config_pro])
def client_non_whitelisted(request):
    app = run.edusign_init_app('testing')
    app.testing = True
    app.config.update(request.param)
    app.extensions['api_client'].api_base_url = 'https://test.localhost'

    with app.test_client() as client:
        environ = deepcopy(_environ_base)
        environ['HTTP_EDUPERSONPRINCIPALNAME_20'] = b'tester@example.com'
        client.environ_base.update(environ)

        app.extensions['doc_store'] = DocStore(app)

        yield client


def _get_test_app(config):
    tempdir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tempdir.name, 'test.db')
    more_config = {'LOCAL_STORAGE_BASE_DIR': tempdir.name, 'SQLITE_MD_DB_PATH': db_path}
    more_config.update(config)
    app = run.edusign_init_app('testing', more_config)
    app.testing = True
    app.extensions['api_client'].api_base_url = 'https://test.localhost'
    return tempdir, app


@pytest.fixture(params=[config_dev, config_pro])
def app(request):
    yield _get_test_app(request.param)


def _get_test_s3_app(config):
    more_config = {'STORAGE_CLASS_PATH': 'edusign_webapp.document.storage.s3.S3Storage', 'AWS_REGION_NAME': 'us-east-1'}
    more_config.update(config)
    app = run.edusign_init_app('testing', more_config)
    app.testing = True
    app.extensions['api_client'].api_base_url = 'https://test.localhost'
    return app


@pytest.fixture(params=[config_dev, config_pro])
def s3_app(request):
    yield _get_test_s3_app(request.param)


@pytest.fixture
def local_storage():
    tempdir = tempfile.TemporaryDirectory()
    config = {'LOCAL_STORAGE_BASE_DIR': tempdir.name}
    config.update(config_dev)
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, LocalStorage(config, logging.getLogger(__name__))


@pytest.fixture
def sqlite_md():
    tempdir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tempdir.name, 'test.db')
    config = {'SQLITE_MD_DB_PATH': db_path}
    config.update(config_dev)
    app = run.edusign_init_app('testing', config)
    app.testing = True
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, SqliteMD(app)


@pytest.fixture
def redis_md():
    tempdir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tempdir.name, 'test.db')
    config = {'SQLITE_MD_DB_PATH': db_path}
    config.update(config_dev)
    app = run.edusign_init_app('testing', config)
    app.testing = True
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, RedisMD(app)


@pytest.fixture
def doc_store_local_sqlite():
    tempdir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tempdir.name, 'test.db')
    config = {
        'STORAGE_CLASS_PATH': 'edusign_webapp.document.storage.local.LocalStorage',
        'DOC_METADATA_CLASS_PATH': 'edusign_webapp.document.metadata.sqlite.SqliteMD',
        'LOCAL_STORAGE_BASE_DIR': tempdir.name,
        'SQLITE_MD_DB_PATH': db_path,
    }
    config.update(config_dev)
    app = run.edusign_init_app('testing', config)
    app.testing = True
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, DocStore(app)


@pytest.fixture
def doc_store_local_redis():
    tempdir = tempfile.TemporaryDirectory()
    config = {
        'STORAGE_CLASS_PATH': 'edusign_webapp.document.storage.local.LocalStorage',
        'DOC_METADATA_CLASS_PATH': 'edusign_webapp.document.metadata.redis_client.RedisMD',
        'LOCAL_STORAGE_BASE_DIR': tempdir.name,
    }
    config.update(config_dev)
    app = run.edusign_init_app('testing', config)
    app.testing = True
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, DocStore(app)


@pytest.fixture
def sample_pdf_data():
    yield pdf_simple_1


@pytest.fixture
def sample_binary_pdf_data():
    yield b64decode(pdf_simple_1.encode('utf8'))


@pytest.fixture
def sample_metadata_1():
    yield _sample_metadata_1


@pytest.fixture
def sample_new_doc_1():
    doc = {'blob': pdf_simple_1}
    doc.update(_sample_metadata_1)
    del doc['key']
    yield doc


@pytest.fixture
def sample_owned_doc_1():
    doc = {'blob': pdf_simple_1}
    doc.update(_sample_metadata_1)
    yield doc


@pytest.fixture
def sample_doc_1():
    doc = {'blob': pdf_simple_1}
    doc.update(_sample_metadata_1)
    yield doc


@pytest.fixture
def sample_pdf_data_2():
    yield pdf_simple_2


@pytest.fixture
def sample_metadata_2():
    yield _sample_metadata_2


@pytest.fixture
def sample_doc_2():
    doc = {'blob': pdf_simple_2}
    doc.update(_sample_metadata_2)
    yield doc


@pytest.fixture
def sample_invites_1():
    yield [
        {'name': 'invite0', 'email': 'invite0@example.org', 'lang': 'en'},
        {'name': 'invite1', 'email': 'invite1@example.org', 'lang': 'en'},
    ]


@pytest.fixture
def sample_invites_2():
    yield [
        {'name': 'invite0', 'email': 'invite0@example.org', 'lang': 'en'},
        {'name': 'invite2', 'email': 'invite2@example.org', 'lang': 'en'},
    ]


@pytest.fixture
def sample_owner_1():
    yield {'name': 'owner', 'email': 'owner@example.org', 'eppn': 'owner-eppn@example.org', 'lang': 'en'}


@pytest.fixture
def sample_owner_2():
    yield {'name': 'owner2', 'email': 'owner2@example.org', 'eppn': 'owner2-eppn@example.org', 'lang': 'en'}


_sample_metadata_1 = {'name': 'test1.pdf', 'size': 1500000, 'type': 'application/pdf', 'key': str(uuid.uuid4())}


_sample_metadata_2 = {'name': 'test2.pdf', 'size': 1500000, 'type': 'application/pdf', 'key': str(uuid.uuid4())}


_form_1_schema = [
    {'type': 'Text', 'value': '', 'label': 'First name', 'name': 'Given Name Text Box', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Last name', 'name': 'Family Name Text Box', 'choices': None},
    {'type': 'Text', 'value': '', 'label': '', 'name': 'Address 1 Text Box', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'House and floor', 'name': 'House nr Text Box', 'choices': None},
    {'type': 'Text', 'value': '', 'label': '', 'name': 'Address 2 Text Box', 'choices': None},
    {'type': 'Text', 'value': '', 'label': '', 'name': 'Postcode Text Box', 'choices': None},
    {'type': 'Text', 'value': '', 'label': '', 'name': 'City Text Box', 'choices': None},
    {
        'type': 'ComboBox',
        'value': '',
        'label': 'Use selection or write country name',
        'name': 'Country Combo Box',
        'choices': [
            'Austria',
            'Belgium',
            'Britain',
            'Bulgaria',
            'Croatia',
            'Cyprus',
            'Czech-Republic',
            'Denmark',
            'Estonia',
            'Finland',
            'France',
            'Germany',
            'Greece',
            'Hungary',
            'Ireland',
            'Italy',
            'Latvia',
            'Lithuania',
            'Luxembourg',
            'Malta',
            'Netherlands',
            'Poland',
            'Portugal',
            'Romania',
            'Slovakia',
            'Slovenia',
            'Spain',
            'Sweden',
        ],
    },
    {
        'type': 'ComboBox',
        'value': 'Man',
        'label': 'Select from list',
        'name': 'Gender List Box',
        'choices': ['Man', 'Woman'],
    },
    {
        'type': 'Text',
        'value': '150',
        'label': 'Value from 40 to 250 cm',
        'name': 'Height Formatted Field',
        'choices': None,
    },
    {
        'type': 'CheckBox',
        'value': 'Off',
        'label': 'Car driving license',
        'name': 'Driving License Check Box',
        'choices': None,
    },
    {'type': 'CheckBox', 'value': 'Off', 'label': '', 'name': 'Language 1 Check Box', 'choices': None},
    {'type': 'CheckBox', 'value': 'Yes', 'label': '', 'name': 'Language 2 Check Box', 'choices': None},
    {'type': 'CheckBox', 'value': 'Off', 'label': '', 'name': 'Language 3 Check Box', 'choices': None},
    {'type': 'CheckBox', 'value': 'Off', 'label': '', 'name': 'Language 4 Check Box', 'choices': None},
    {'type': 'CheckBox', 'value': 'Off', 'label': '', 'name': 'Language 5 Check Box', 'choices': None},
    {
        'type': 'ComboBox',
        'value': 'Red',
        'label': 'Select from colour spectrum',
        'name': 'Favourite Colour List Box',
        'choices': ['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Grey', 'White'],
    },
]


_form_2_schema = [
    {'type': 'Text', 'value': '', 'label': 'Name', 'name': 'Name', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Surname', 'name': 'Surname', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'e-Mail Address (required)', 'name': 'email', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Phone Number', 'name': 'phone', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Mobile Number', 'name': 'Mobile', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Street', 'name': 'Street', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'House Name', 'name': 'House', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Town Name', 'name': 'Town', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Postcode', 'name': 'Postcode', 'choices': None},
    {'type': 'Text', 'value': '', 'label': 'Country', 'name': 'Country', 'choices': None},
    {'type': 'TextArea', 'value': '', 'label': 'Comments', 'name': 'Comments', 'choices': None},
    {'type': 'Button', 'value': '', 'label': '', 'name': 'AloahaFormSaveButton', 'choices': None},
    {'type': 'Button', 'value': '', 'label': '', 'name': 'AloahaFormSubmitButton', 'choices': None},
]


@pytest.fixture
def sample_form_1():
    yield {
        'pdf': pdf_form_1,
        'schema': _form_1_schema,
    }


@pytest.fixture
def sample_form_2():
    yield {
        'pdf': pdf_form_2,
        'schema': _form_2_schema,
    }
