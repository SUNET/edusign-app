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
Unit tests for edusign_webapp.api_client.APIClient.

The view tests always mock the APIClient above its `_post` method, so
here the HTTP layer itself is mocked (requests.Session.send and
requests.post) and the client methods run for real.
"""
import json
import uuid
from base64 import b64encode
from unittest.mock import patch

import pytest
from flask import session

from edusign_webapp.api_client import APIClient, pretty_print_req


@pytest.fixture
def client_two_paths():
    """A client whose app also registers the blueprint under /sign2."""
    from copy import copy

    from edusign_webapp import run
    from edusign_webapp.doc_store import DocStore
    from edusign_webapp.tests.conftest import _environ_base, config_dev

    config = copy(config_dev)
    config['APP_IN_TWO_PATHS'] = True

    app = run.edusign_init_app('testing', config)
    app.testing = True
    app.config.update(config)
    app.extensions['api_client'].api_base_url = 'https://test.localhost'

    with app.test_client() as client:
        client.environ_base.update(_environ_base)
        app.extensions['doc_store'] = DocStore(app)
        yield client


class FakeResponse:
    def __init__(self, data, status_code=200, content=b''):
        self._data = data
        self.status_code = status_code
        self.content = content

    def json(self):
        return self._data


def _set_session(**kwargs):
    """Set the session keys the APIClient reads, inside a request context."""
    data = {
        'saml-attr-schema': '20',
        'idp': 'https://idp',
        'displayName': 'Tëster Kid',
        'eduPersonPrincipalName': 'dummy-eppn@example.org',
        'registrationAuthority': 'http://www.swamid.se/',
    }
    data.update(kwargs)
    for key, value in data.items():
        session[key] = value


sample_documents = [
    {
        'name': 'test1.pdf',
        'key': str(uuid.uuid4()),
        'type': 'application/pdf',
        'size': 100,
        'blob': 'dummy-blob',
        'ref': 'dummy-ref',
        'sign_requirement': '{"page": 1}',
    },
]


def test_pretty_print_req(client):
    import requests

    req = requests.Request('POST', 'https://test.localhost/api', json={'a': 'b'})
    prepped = requests.Session().prepare_request(req)
    printed = pretty_print_req(prepped)

    assert 'POST https://test.localhost/api' in printed
    assert '-----------START-----------' in printed


def test_initialize_credentials_bankid(client):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context('/sign/'):
        _set_session(**{'using-bankid': True})
        api_client.initialize_credentials()

    assert api_client.profile == client.application.config['EDUSIGN_API_PROFILE_BANKID']
    assert api_client.basic_auth.username == client.application.config['EDUSIGN_API_USERNAME_BANKID']


def test_initialize_credentials_freja(client):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context('/sign/'):
        _set_session(**{'using-freja': True})
        api_client.initialize_credentials()

    assert api_client.profile == client.application.config['EDUSIGN_API_PROFILE_FREJA']
    assert api_client.basic_auth.username == client.application.config['EDUSIGN_API_USERNAME_FREJA']


def test_initialize_credentials_default(client):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context('/sign/'):
        _set_session()
        api_client.initialize_credentials()

    assert api_client.profile == client.application.config['EDUSIGN_API_PROFILE_20']
    assert api_client.basic_auth.username == client.application.config['EDUSIGN_API_USERNAME_20']


def test_post_with_query_params(client):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context('/sign/'):
        _set_session()
        api_client.initialize_credentials()
        with patch('requests.Session.send', return_value=FakeResponse({'result': 'ok'})) as mock_send:
            response = api_client._post('https://test.localhost/method', {'some': 'data'}, {'param': 'value'})

    assert response == {'result': 'ok'}
    sent = mock_send.call_args[0][0]
    assert sent.url == 'https://test.localhost/method?param=value'


def test_post_query_params_url_with_query(client):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context('/sign/'):
        _set_session()
        api_client.initialize_credentials()
        with patch('requests.Session.send', return_value=FakeResponse({'result': 'ok'})) as mock_send:
            api_client._post('https://test.localhost/method?already=here', {'some': 'data'}, {'param': 'value'})

    sent = mock_send.call_args[0][0]
    assert sent.url == 'https://test.localhost/method?already=here&param=value'


def test_post_scrubs_signed_documents_only_in_logs(client):
    api_client = client.application.extensions['api_client']
    response_data = {'signedDocuments': [{'signedContent': 'the-real-content'}]}
    with client.application.test_request_context('/sign/'):
        _set_session()
        api_client.initialize_credentials()
        with patch('requests.Session.send', return_value=FakeResponse(response_data)):
            response = api_client._post('https://test.localhost/method', {'some': 'data'})

    # the returned data keeps the content; only the logged copy is scrubbed
    assert response['signedDocuments'][0]['signedContent'] == 'the-real-content'


def _prepare(client, session_kwargs, response_data=None):
    api_client = client.application.extensions['api_client']
    document = {'name': 'test.pdf', 'type': 'application/pdf', 'blob': 'data:application/pdf;base64,QUFBQQ=='}
    if response_data is None:
        response_data = {'updatedPdfDocumentReference': 'ref'}
    with client.application.test_request_context('/sign/add-doc'):
        _set_session(**session_kwargs)
        with patch('requests.Session.send', return_value=FakeResponse(response_data)) as mock_send:
            response = api_client.prepare_document(document)
    sent = mock_send.call_args[0][0]
    return api_client, response, sent, json.loads(sent.body)


def test_prepare_document_splits_data_url(client):
    _, response, sent, body = _prepare(client, {'organizationName': None})

    assert body['pdfDocument'] == 'QUFBQQ=='
    assert body['signaturePagePreferences']['visiblePdfSignatureUserInformation']['fieldValues']['idp'] == 'https://idp'
    assert '/prepare/' in sent.url
    assert 'returnDocReference=True' in sent.url
    assert response == {'updatedPdfDocumentReference': 'ref'}


def test_prepare_document_plain_blob(client):
    api_client = client.application.extensions['api_client']
    document = {'name': 'test.pdf', 'type': 'application/pdf', 'blob': 'QUFBQQ=='}
    with client.application.test_request_context('/sign/add-doc'):
        _set_session(organizationName=None)
        with patch('requests.Session.send', return_value=FakeResponse({})) as mock_send:
            api_client.prepare_document(document)

    body = json.loads(mock_send.call_args[0][0].body)
    assert body['pdfDocument'] == 'QUFBQQ=='


def test_prepare_document_uses_organization_name(client):
    _, _, _, body = _prepare(client, {'organizationName': 'Test Org'})

    assert body['signaturePagePreferences']['visiblePdfSignatureUserInformation']['fieldValues']['idp'] == 'Test Org'


def test_prepare_document_bankid(client):
    api_client, _, _, body = _prepare(client, {'organizationName': None, 'using-bankid': True})

    assert api_client.profile == client.application.config['EDUSIGN_API_PROFILE_BANKID']
    attrs = body['signaturePagePreferences']['visiblePdfSignatureUserInformation']['signerName']['signerAttributes']
    assert attrs == [{'name': attr} for attr in client.application.config['SIGNER_ATTRIBUTES_BANKID'].keys()]


def test_prepare_document_freja(client):
    api_client, _, _, body = _prepare(client, {'organizationName': None, 'using-freja': True})

    assert api_client.profile == client.application.config['EDUSIGN_API_PROFILE_FREJA']
    attrs = body['signaturePagePreferences']['visiblePdfSignatureUserInformation']['signerName']['signerAttributes']
    assert attrs == [{'name': attr} for attr in client.application.config['SIGNER_ATTRIBUTES_FREJA'].keys()]


def test_prepare_document_debug_logging(client):
    # NOTE: current_app.logger.level == 'DEBUG' compares an int to a str,
    # so in normal operation this branch never runs (suspected app bug).
    # The test sets the attribute to the string to exercise the branch.
    app = client.application
    old_level = app.logger.level
    app.logger.level = 'DEBUG'
    try:
        _, response, _, _ = _prepare(
            client,
            {'organizationName': None},
            response_data={'signedDocuments': [{'signedContent': 'A' * 40}]},
        )
    finally:
        app.logger.level = old_level

    # NOTE: response.copy() is shallow, so scrubbing the copy for the log
    # truncates the signedContent of the response itself (second suspected
    # app bug in this branch); this asserts the current behavior.
    assert response['signedDocuments'][0]['signedContent'] == 'A' * 20 + '...'


def _get_sign_request_data(client, session_kwargs, path='/sign/create-sign-request', invite_key='', assurance='none'):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context(path):
        _set_session(**session_kwargs)
        api_client.initialize_credentials()
        with patch('edusign_webapp.api_client.get_authn_context', return_value=['https://authn-ctx']):
            with patch('edusign_webapp.api_client.get_required_assurance', return_value=assurance):
                return api_client._get_sign_request_data(sample_documents, invite_key=invite_key)


def test_get_sign_request_data_defaults(client):
    data = _get_sign_request_data(client, {})

    assert data['signRequesterID'] == client.application.config['SIGN_REQUESTER_ID']
    assert data['authnRequirements']['authnServiceID'] == 'https://idp'
    assert data['authnRequirements']['authnContextClassRefs'] == ['https://authn-ctx']
    assert data['returnUrl'] == 'https://test.localhost/sign/callback'
    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {'name': 'urn:oid:2.16.840.1.113730.3.1.241', 'value': 'Tëster Kid'} in attrs
    assert {'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.6', 'value': 'dummy-eppn@example.org'} in attrs
    assert data['tbsDocuments'] == []


def test_get_sign_request_data_api_call_new_attr(client):
    data = _get_sign_request_data(
        client,
        {'api_call': True, 'authn_attr_name': 'urn:oid:0.9.2342.19200300.100.1.3', 'authn_attr_value': 'a@example.org'},
    )

    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {'name': 'urn:oid:0.9.2342.19200300.100.1.3', 'value': 'a@example.org'} in attrs


def test_get_sign_request_data_api_call_attr_already_used(client):
    data = _get_sign_request_data(client, {'api_call': True, 'authn_attr_name': 'displayName'})

    attrs = data['authnRequirements']['requestedSignerAttributes']
    # only the signer attribute carrying the displayName, not a second copy
    assert len([attr for attr in attrs if attr['value'] == 'Tëster Kid']) == 1


def test_get_sign_request_data_api_return_url(client):
    data = _get_sign_request_data(client, {'api_return_url': 'https://api.return/url'})

    assert data['returnUrl'] == 'https://api.return/url'


def test_get_sign_request_data_assurance_known_authority(client):
    data = _get_sign_request_data(client, {}, assurance='low')

    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {
        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11',
        'value': 'http://www.swamid.se/policy/assurance/al1',
    } in attrs


def test_get_sign_request_data_assurance_unknown_authority(client):
    data = _get_sign_request_data(client, {'registrationAuthority': 'unknown'}, assurance='medium')

    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {
        'name': 'urn:oid:1.3.6.1.4.1.5923.1.1.1.11',
        'value': 'https://refeds.org/assurance/IAP/medium',
    } in attrs


def test_get_sign_request_data_assurance_schema_11(client):
    data = _get_sign_request_data(client, {'saml-attr-schema': '11'}, assurance='high')

    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {
        'name': 'urn:mace:dir:attribute-def:eduPersonAssurance',
        'value': 'http://www.swamid.se/policy/assurance/al3',
    } in attrs
    assert {'name': 'urn:mace:dir:attribute-def:displayName', 'value': 'Tëster Kid'} in attrs


def test_get_sign_request_data_bankid_attrs(client):
    data = _get_sign_request_data(
        client, {'using-bankid': True, 'personalIdentityNumber': '190001019999'}
    )

    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {'name': 'urn:oid:1.2.752.29.4.13', 'value': '190001019999'} in attrs


def test_get_sign_request_data_freja_attrs(client):
    data = _get_sign_request_data(
        client, {'using-freja': True, 'personalIdentityNumber': '190001019999'}
    )

    attrs = data['authnRequirements']['requestedSignerAttributes']
    assert {'name': 'urn:oid:1.2.752.29.4.13', 'value': '190001019999'} in attrs


def test_get_sign_request_data_invite_key(client):
    invite_key = str(uuid.uuid4())
    data = _get_sign_request_data(client, {}, invite_key=invite_key)

    assert data['returnUrl'] == f'https://test.localhost/sign/callback-eid/{invite_key}'


def test_get_sign_request_data_invite_key_sign2(client_two_paths):
    invite_key = str(uuid.uuid4())
    data = _get_sign_request_data(
        client_two_paths, {}, path='/sign2/create-sign-request', invite_key=invite_key
    )

    assert data['returnUrl'] == f'https://test.localhost/sign2/callback-eid/{invite_key}'


def test_get_sign_request_data_sign2(client_two_paths):
    data = _get_sign_request_data(client_two_paths, {}, path='/sign2/create-sign-request')

    assert data['returnUrl'] == 'https://test.localhost/sign2/callback'


def _create_sign_request(client, documents, response_data=None, add_blob=False):
    api_client = client.application.extensions['api_client']
    if response_data is None:
        response_data = {'signRequest': 'A' * 40, 'relayState': 'dummy-relay-state'}
    with client.application.test_request_context('/sign/create-sign-request'):
        _set_session()
        with patch('edusign_webapp.api_client.get_authn_context', return_value=['https://authn-ctx']):
            with patch('edusign_webapp.api_client.get_required_assurance', return_value='none'):
                with patch('requests.Session.send', return_value=FakeResponse(response_data)) as mock_send:
                    response, docs_with_id = api_client.create_sign_request(documents, add_blob=add_blob)
    sent_body = json.loads(mock_send.call_args[0][0].body)
    return response, docs_with_id, sent_body


def test_create_sign_request_pdf(client):
    response, docs_with_id, sent_body = _create_sign_request(client, sample_documents)

    assert response['signRequest'] == 'A' * 40
    assert docs_with_id == [{'name': 'test1.pdf', 'key': sample_documents[0]['key']}]
    tbs = sent_body['tbsDocuments']
    assert tbs == [
        {
            'id': sample_documents[0]['key'],
            'contentReference': 'dummy-ref',
            'mimeType': 'application/pdf',
            'visiblePdfSignatureRequirement': {'page': 1},
        }
    ]


def test_create_sign_request_add_blob(client):
    _, docs_with_id, _ = _create_sign_request(client, sample_documents, add_blob=True)

    assert docs_with_id[0]['blob'] == 'dummy-blob'
    assert docs_with_id[0]['size'] == 100
    assert docs_with_id[0]['type'] == 'application/pdf'


def test_create_sign_request_xml(client):
    xml_doc = {
        'name': 'test1.xml',
        'key': str(uuid.uuid4()),
        'type': 'application/xml',
        'size': 100,
        'blob': 'data:application/xml;base64,PGRvYy8+',
        'sign_requirement': 'unused',
    }
    _, _, sent_body = _create_sign_request(client, [xml_doc])

    tbs = sent_body['tbsDocuments']
    assert tbs == [{'id': xml_doc['key'], 'content': 'PGRvYy8+', 'mimeType': 'application/xml'}]


def test_create_sign_request_xml_plain_content(client):
    xml_doc = {
        'name': 'test1.xml',
        'key': str(uuid.uuid4()),
        'type': 'text/xml',
        'size': 100,
        'blob': 'PGRvYy8+',
        'sign_requirement': 'unused',
    }
    _, _, sent_body = _create_sign_request(client, [xml_doc])

    tbs = sent_body['tbsDocuments']
    assert tbs == [{'id': xml_doc['key'], 'content': 'PGRvYy8+', 'mimeType': 'application/xml'}]


def test_create_sign_request_unknown_type(client):
    bad_doc = dict(sample_documents[0])
    bad_doc['type'] = 'text/plain'
    with pytest.raises(APIClient.UnknownDocType):
        _create_sign_request(client, [bad_doc])


def test_create_sign_request_unprepared_doc(client):
    bad_doc = dict(sample_documents[0])
    bad_doc['sign_requirement'] = ''
    with pytest.raises(APIClient.ExpiredCache):
        _create_sign_request(client, [bad_doc])


def test_create_sign_request_expired_cache(client):
    response_data = {'status': 400, 'message': 'documents not found in cache'}
    with pytest.raises(APIClient.ExpiredCache):
        _create_sign_request(client, sample_documents, response_data=response_data)


def test_create_sign_request_debug_logging(client):
    # see the note in test_prepare_document_debug_logging
    app = client.application
    old_level = app.logger.level
    app.logger.level = 'DEBUG'
    try:
        response, _, _ = _create_sign_request(client, sample_documents)
    finally:
        app.logger.level = old_level

    assert response['signRequest'] == 'A' * 40


def _process_sign_request(client, response_data):
    api_client = client.application.extensions['api_client']
    with client.application.test_request_context('/sign/callback'):
        _set_session()
        with patch('requests.Session.send', return_value=FakeResponse(response_data)) as mock_send:
            response = api_client.process_sign_request({'response': 'data'}, 'dummy-relay-state')
    return response, mock_send.call_args[0][0]


def test_process_sign_request(client):
    response_data = {'signedDocuments': [{'id': 'doc-id', 'signedContent': 'B' * 40}]}
    response, sent = _process_sign_request(client, response_data)

    assert response == response_data
    assert sent.url.endswith('/process')
    body = json.loads(sent.body)
    assert body['relayState'] == 'dummy-relay-state'
    assert body['state'] == {'id': 'dummy-relay-state'}


def test_process_sign_request_debug_logging(client):
    # see the note in test_prepare_document_debug_logging
    app = client.application
    old_level = app.logger.level
    app.logger.level = 'DEBUG'
    try:
        response, _ = _process_sign_request(client, {'signedDocuments': [{'signedContent': 'B' * 40}]})
    finally:
        app.logger.level = old_level

    # shallow response.copy(): the log scrubbing truncates the response
    # itself, see the note in test_prepare_document_debug_logging
    assert response['signedDocuments'][0]['signedContent'] == 'B' * 20 + '...'


def _validate_signatures(client, to_validate, status_code=200, content=b'validated-pdf'):
    api_client = client.application.extensions['api_client']
    with client.application.app_context():
        with patch(
            'edusign_webapp.api_client.requests.post',
            return_value=FakeResponse({}, status_code=status_code, content=content),
        ):
            return api_client.validate_signatures(to_validate)


def test_validate_signatures_ok(client):
    doc = {'key': 'k', 'owner': 'o@example.org', 'sendsigned': True}
    doc['doc'] = {'blob': b64encode(b'signed-pdf').decode('utf8'), 'type': 'application/pdf'}
    results = _validate_signatures(client, [doc])

    assert results[0]['validated'] is True
    assert results[0]['doc']['signedContent'] == b64encode(b'validated-pdf').decode('utf8')


def test_validate_signatures_signed_content(client):
    doc = {'key': 'k', 'owner': 'o@example.org', 'sendsigned': True}
    doc['doc'] = {'signedContent': b64encode(b'signed-pdf').decode('utf8'), 'type': 'application/pdf'}
    results = _validate_signatures(client, [doc], status_code=400)

    assert results[0]['validated'] is False
    # the signedContent already present is kept
    assert results[0]['doc']['signedContent'] == b64encode(b'signed-pdf').decode('utf8')


def test_validate_signatures_error_backfills_signed_content(client):
    doc = {'key': 'k', 'owner': 'o@example.org', 'sendsigned': True}
    doc['doc'] = {'blob': b64encode(b'signed-pdf').decode('utf8'), 'type': 'application/pdf'}
    results = _validate_signatures(client, [doc], status_code=500)

    assert results[0]['validated'] is False
    assert results[0]['doc']['signedContent'] == doc['doc']['blob']


def test_validate_signatures_empty(client):
    assert _validate_signatures(client, []) == []
