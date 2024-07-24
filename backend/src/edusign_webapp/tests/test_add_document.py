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
import json


def test_add_document(app, environ_base, monkeypatch, sample_new_doc_1):
    _, app = app

    client = app.test_client()
    client.environ_base.update(environ_base)

    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        return {
            'policy': 'edusign-test',
            'updatedPdfDocumentReference': 'ba26478f-f8e0-43db-991c-08af7c65ed58',
            'visiblePdfSignatureRequirement': {
                'fieldValues': {'idp': 'https://login.idp.eduid.se/idp.xml'},
                'page': 2,
                'scale': -74,
                'signerName': {
                    'formatting': None,
                    'signerAttributes': [
                        {'name': 'urn:oid:2.5.4.42'},
                        {'name': 'urn:oid:2.5.4.4'},
                        {'name': 'urn:oid:0.9.2342.19200300.100.1.3'},
                    ],
                },
                'templateImageRef': 'eduSign-image',
                'xposition': 37,
                'yposition': 165,
            },
        }

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    doc_data = {'payload': sample_new_doc_1}

    response = client.post(
        '/sign/add-doc',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert resp_data['payload']['ref'] == 'ba26478f-f8e0-43db-991c-08af7c65ed58'


def test_add_document_error_preparing(client, monkeypatch, sample_new_doc_1):
    from edusign_webapp.api_client import APIClient

    def mock_post(*args, **kwargs):
        raise Exception("Mocking an error posting to the API")

    monkeypatch.setattr(APIClient, '_post', mock_post)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    doc_data = {
        'payload': sample_new_doc_1,
    }

    response = client.post(
        '/sign/add-doc',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    assert resp_data['message'] == 'There was an error. Please try again, or contact the site administrator.'


def _add_document_missing_data(client, data):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    doc_data = {
        'payload': data,
    }

    response = client.post(
        '/sign/add-doc',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    return json.loads(response.data)


def test_add_document_missing_doc_name(client, sample_new_doc_1):
    del sample_new_doc_1['name']
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == "There were problems with the data you sent, please try again or contact your IT support"
    )


def test_add_document_empty_doc_name(client, sample_new_doc_1):
    sample_new_doc_1['name'] = ''
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_add_document_missing_doc_size(client, sample_new_doc_1):
    del sample_new_doc_1['size']
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == "There were problems with the data you sent, please try again or contact your IT support"
    )


def test_add_document_bad_doc_size(client, sample_new_doc_1):
    sample_new_doc_1['size'] = 'not an int'
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == "There were problems with the data you sent, please try again or contact your IT support"
    )


def test_add_document_missing_doc_type(client, sample_new_doc_1):
    del sample_new_doc_1['type']
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == "There were problems with the data you sent, please try again or contact your IT support"
    )


def test_add_document_bad_doc_type(client, sample_new_doc_1):
    sample_new_doc_1['type'] = 'text/plain'
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )


def test_add_document_missing_doc(client, sample_new_doc_1):
    del sample_new_doc_1['blob']
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == "There were problems with the data you sent, please try again or contact your IT support"
    )


def test_add_document_empty_doc(client, sample_new_doc_1):
    sample_new_doc_1['blob'] = ''
    resp_data = _add_document_missing_data(client, sample_new_doc_1)

    assert resp_data['error']
    assert (
        resp_data['message']
        == 'There were problems with the data you sent, please try again or contact your IT support'
    )
