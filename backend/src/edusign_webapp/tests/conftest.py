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
from base64 import b64encode, b64decode
from copy import deepcopy

import pytest
from botocore.stub import Stubber

from edusign_webapp import run
from edusign_webapp.doc_store import DocStore
from edusign_webapp.document.metadata.sqlite import SqliteMD
from edusign_webapp.document.storage.local import LocalStorage

here = os.path.abspath(os.path.dirname(__file__))


config_dev = {
    'TESTING': True,
    'ENVIRONMENT': 'development',
    'SCOPE_WHITELIST': 'example.org',
}


config_pro = {
    'TESTING': True,
    'ENVIRONMENT': 'production',
    'SCOPE_WHITELIST': 'example.org',
}


_environ_base = {
    "HTTP_EDUPERSONPRINCIPALNAME": 'dummy-eppn',
    "HTTP_GIVENNAME": b64encode('<Attribute>Tëster</Attribute>'.encode("utf-8")),
    "HTTP_DISPLAYNAME": b64encode('<Attribute>Tëster Kid</Attribute>'.encode("utf-8")),
    "HTTP_SN": b64encode(b'<Attribute>Testing</Attribute>'),
    "HTTP_MAIL": b64encode(b'<Attribute>tester@example.org</Attribute>'),
    "HTTP_SHIB_IDENTITY_PROVIDER": 'https://idp',
    "HTTP_SHIB_AUTHENTICATION_METHOD": 'dummy',
    "HTTP_SHIB_AUTHNCONTEXT_CLASS": 'dummy',
}


@pytest.fixture
def environ_base():
    yield _environ_base


@pytest.fixture(params=[config_dev, config_pro])
def client(request):
    app = run.edusign_init_app('testing')
    app.config.update(request.param)
    app.api_client.api_base_url = 'https://dummy.edusign.api'

    with app.test_client() as client:
        client.environ_base.update(_environ_base)

        yield client


@pytest.fixture(params=[config_dev, config_pro])
def client_non_whitelisted(request):
    app = run.edusign_init_app('testing')
    app.config.update(request.param)
    app.api_client.api_base_url = 'https://dummy.edusign.api'

    with app.test_client() as client:
        environ = deepcopy(_environ_base)
        environ['HTTP_MAIL'] = b64encode(b'<Attribute>tester@example.com</Attribute>')
        client.environ_base.update(environ)

        yield client


def _get_test_app(config):
    tempdir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tempdir.name, 'test.db')
    more_config = {'LOCAL_STORAGE_BASE_DIR': tempdir.name, 'SQLITE_MD_DB_PATH': db_path}
    more_config.update(config)
    app = run.edusign_init_app('testing', more_config)
    app.api_client.api_base_url = 'https://dummy.edusign.api'
    return tempdir, app


@pytest.fixture(params=[config_dev, config_pro])
def app(request):

    yield _get_test_app(request.param)


def _get_test_s3_app(config):
    more_config = {'STORAGE_CLASS_PATH': 'edusign_webapp.document.storage.s3.S3Storage', 'AWS_REGION_NAME': 'us-east-1'}
    more_config.update(config)
    app = run.edusign_init_app('testing', more_config)
    app.api_client.api_base_url = 'https://dummy.edusign.api'
    return app


@pytest.fixture(params=[config_dev, config_pro])
def s3_app(request):

    yield _get_test_s3_app(request.param)


@pytest.fixture
def local_storage():
    tempdir = tempfile.TemporaryDirectory()
    config = {'LOCAL_STORAGE_BASE_DIR': tempdir.name}
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, LocalStorage(config, logging.getLogger(__name__))


@pytest.fixture
def sqlite_md():
    tempdir = tempfile.TemporaryDirectory()
    db_path = os.path.join(tempdir.name, 'test.db')
    config = {'SQLITE_MD_DB_PATH': db_path}
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, SqliteMD(config, logging.getLogger(__name__))


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
    # return tempdir, since once it goes out of scope, it is removed
    yield tempdir, DocStore(config, logging.getLogger(__name__))


@pytest.fixture
def sample_pdf_data():
    yield _sample_pdf_data


@pytest.fixture
def sample_binary_pdf_data():
    yield b64decode(_sample_pdf_data.encode('utf8'))


@pytest.fixture
def sample_metadata_1():
    yield _sample_metadata_1


@pytest.fixture
def sample_doc_1():
    doc = {'blob': _sample_pdf_data}
    doc.update(_sample_metadata_1)
    yield doc


@pytest.fixture
def sample_pdf_data_2():
    yield _sample_pdf_data_2


@pytest.fixture
def sample_metadata_2():
    yield _sample_metadata_2


@pytest.fixture
def sample_doc_2():
    doc = {'blob': _sample_pdf_data_2}
    doc.update(_sample_metadata_2)
    yield doc


@pytest.fixture
def sample_invites_1():
    yield [{'name': 'invite0', 'email': 'invite0@example.org'}, {'name': 'invite1', 'email': 'invite1@example.org'}]


@pytest.fixture
def sample_invites_2():
    yield [{'name': 'invite0', 'email': 'invite0@example.org'}, {'name': 'invite2', 'email': 'invite2@example.org'}]


@pytest.fixture
def sample_owner_1():
    yield {'name': 'owner', 'email': 'owner@example.org'}


@pytest.fixture
def sample_owner_2():
    yield {'name': 'owner2', 'email': 'owner2@example.org'}


_sample_metadata_1 = {'name': 'test1.pdf', 'size': 1500000, 'type': 'application/pdf', 'key': str(uuid.uuid4())}


_sample_pdf_data = (
    'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQga'
    'HR0cDovL3d3dy5yZXBvcnRsYWIuY29tCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+Cm'
    'VuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyA'
    'vV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUg'
    'L0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpY'
    'UJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgNiAwIFIgL1Jlc2'
    '91cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWd'
    'lQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAK'
    'ICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNCAwIG9iago8PAovUGFnZUxhYmVscyA4I'
    'DAgUiAvUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDYgMCBSIC9UeXBlIC9DYXRhbG'
    '9nCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9BdXRob3IgKCkgL0NyZWF0aW9uRGF0ZSA'
    'oRDoyMDIwMTEyMDEwMzIzMy0wMScwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVk'
    'XCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDIwMTEyMDEwMzIzMy0wMScwM'
    'CcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gd3d3LnJlcG9ydG'
    'xhYi5jb20pIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoKSA'
    'vVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvdW50IDEgL0tp'
    'ZHMgWyAzIDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKNyAwIG9iago8PAovT'
    'GVuZ3RoIDEzOAo+PgpzdHJlYW0KMSAwIDAgMSAwIDAgY20gIEJUIC9GMSAxMiBUZi'
    'AxNC40IFRMIEVUCnEKMSAwIDAgMSA2Mi42OTI5MSA3NTMuMDIzNiBjbQpxCjAgMCA'
    'wIHJnCkJUIDEgMCAwIDEgMCAyIFRtIC9GMSAxMCBUZiAxMiBUTCAodGVzdCkgVGog'
    'VCogRVQKUQpRCiAKZW5kc3RyZWFtCmVuZG9iago4IDAgb2JqCjw8Ci9OdW1zIFsgM'
    'CA5IDAgUiBdCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9TIC9EIC9TdCAxCj4+CmVuZG'
    '9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDczIDAwMDA'
    'wIG4gCjAwMDAwMDAxMDQgMDAwMDAgbiAKMDAwMDAwMDIxMSAwMDAwMCBuIAowMDAw'
    'MDAwNDE0IDAwMDAwIG4gCjAwMDAwMDA1MDAgMDAwMDAgbiAKMDAwMDAwMDc1NyAwM'
    'DAwMCBuIAowMDAwMDAwODE2IDAwMDAwIG4gCjAwMDAwMDEwMDQgMDAwMDAgbiAKMD'
    'AwMDAwMTA0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxlYTM4NTYzOTJkNzZ'
    'kMWZhNTkzNTNhYWJiMzI3NjUzNz48ZWEzODU2MzkyZDc2ZDFmYTU5MzUzYWFiYjMy'
    'NzY1Mzc+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ'
    '2VzdCAoaHR0cDovL3d3dy5yZXBvcnRsYWIuY29tKQoKL0luZm8gNSAwIFIKL1Jvb3'
    'QgNCAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjEwNzYKJSVFT0YK'
)


_sample_metadata_2 = {'name': 'test2.pdf', 'size': 1500000, 'type': 'application/pdf', 'key': str(uuid.uuid4())}


_sample_pdf_data_2 = (
    'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQga'
    'HR0cDovL3d3dy5yZXBvcnRsYWIuY29tCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+Cm'
    'VuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyA'
    'vV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUg'
    'L0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpY'
    'UJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgNiAwIFIgL1Jlc2'
    '91cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWd'
    'lQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAK'
    'ICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNCAwIG9iago8PAovUGFnZUxhYmVscyA4I'
    'DAgUiAvUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDYgMCBSIC9UeXBlIC9DYXRhbG'
    '9nCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9BdXRob3IgKCkgL0NyZWF0aW9uRGF0ZSA'
    'oRDoyMDIwMTAyMDE1MTM1NS0wMScwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVk'
    'XCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDIwMTAyMDE1MTM1NS0wMScwM'
    'CcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gd3d3LnJlcG9ydG'
    'xhYi5jb20pIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoKSA'
    'vVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvdW50IDEgL0tp'
    'ZHMgWyAzIDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKNyAwIG9iago8PAovT'
    'GVuZ3RoIDE1Ngo+PgpzdHJlYW0KMSAwIDAgMSAwIDAgY20gIEJUIC9GMSAxMiBUZi'
    'AxNC40IFRMIEVUCnEKMSAwIDAgMSA2Mi42OTI5MSA3NTMuMDIzNiBjbQpxCjAgMCA'
    'wIHJnCkJUIDEgMCAwIDEgMCAyIFRtIC9GMSAxMCBUZiAxMiBUTCAoU2FtcGxlIFBE'
    'RiBmb3IgdGVzdGluZykgVGogVCogRVQKUQpRCiAKZW5kc3RyZWFtCmVuZG9iago4I'
    'DAgb2JqCjw8Ci9OdW1zIFsgMCA5IDAgUiBdCj4+CmVuZG9iago5IDAgb2JqCjw8Ci'
    '9TIC9EIC9TdCAxCj4+CmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSB'
    'mIAowMDAwMDAwMDczIDAwMDAwIG4gCjAwMDAwMDAxMDQgMDAwMDAgbiAKMDAwMDAw'
    'MDIxMSAwMDAwMCBuIAowMDAwMDAwNDE0IDAwMDAwIG4gCjAwMDAwMDA1MDAgMDAwM'
    'DAgbiAKMDAwMDAwMDc1NyAwMDAwMCBuIAowMDAwMDAwODE2IDAwMDAwIG4gCjAwMD'
    'AwMDEwMjIgMDAwMDAgbiAKMDAwMDAwMTA2MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9'
    'JRCAKWzw2MzA5NDk0NDlkOTc0NTk5YzNhMDU5ZTg2Y2Y1MWMyOT48NjMwOTQ5NDQ5'
    'ZDk3NDU5OWMzYTA1OWU4NmNmNTFjMjk+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgU'
    'ERGIGRvY3VtZW50IC0tIGRpZ2VzdCAoaHR0cDovL3d3dy5yZXBvcnRsYWIuY29tKQ'
    'oKL0luZm8gNSAwIFIKL1Jvb3QgNCAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjE'
    'wOTQKJSVFT0YK'
)
