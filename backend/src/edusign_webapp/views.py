# -*- coding: utf-8 -*-
#
# Copyright (c) 2020 SUNET
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
from base64 import b64decode
from xml.etree import cElementTree as ET

from flask import Blueprint, abort, current_app, json, render_template, request, session
from flask_babel import gettext

from edusign_webapp.marshal import Marshal, UnMarshal
from edusign_webapp.schemata import (
    ConfigSchema,
    DocumentSchema,
    ReferenceSchema,
    SignedDocumentsSchema,
    SigningSchema,
    SignRequestSchema,
    ToSignSchema,
    ToRestartSigningSchema,
)

edusign_views = Blueprint('edusign', __name__, url_prefix='/sign', template_folder='templates')


@edusign_views.route('/', methods=['GET'])
def get_bundle():
    if 'eppn' not in session:
        eppn = request.headers.get('Edupersonprincipalname')
        current_app.logger.info(f'User {eppn} started a session')
        session['eppn'] = eppn

        attrs = [(attr, attr.capitalize().replace('_', '')) for attr in current_app.config['SIGNER_ATTRIBUTES'].values()]
        for attr_in_session, attr_in_header in attrs:
            current_app.logger.debug(f'Getting attribute {attr_in_header} from request')
            session[attr_in_session] = ET.fromstring(b64decode(request.headers.get(attr_in_header))).text

        session['idp'] = request.headers.get('Shib-Identity-Provider')
        session['authn_method'] = request.headers.get('Shib-Authentication-Method')
        session['authn_context'] = request.headers.get('Shib-Authncontext-Class')
    try:
        bundle_name = 'main-bundle'
        if current_app.config['DEBUG']:
            bundle_name += '.dev'

        return render_template('index.jinja2', bundle_name=bundle_name)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/config', methods=['GET'])
@Marshal(ConfigSchema)
def get_config() -> dict:
    """
    Configuration for the front app
    """
    attrs = [{'name': attr, 'value': session[attr]} for attr in current_app.config['SIGNER_ATTRIBUTES'].values()]
    return {
        'payload': {
            'signer_attributes': attrs,
        }
    }


def _prepare_document(document) -> dict:
    """"""
    try:
        current_app.logger.info(f"Sending document {document['name']} for preparation for user {session['eppn']}")
        return current_app.api_client.prepare_document(document)

    except Exception as e:
        current_app.logger.error(f'Problem preparing document: {e}')
        return {'error': True, 'message': gettext('Communication error with the prepare endpoint of the eduSign API')}


@edusign_views.route('/add-doc', methods=['POST'])
@UnMarshal(DocumentSchema)
@Marshal(ReferenceSchema)
def add_document(document) -> dict:
    """"""
    prepare_data = _prepare_document(document)

    if 'error' in prepare_data and prepare_data['error']:
        return prepare_data

    doc_ref = prepare_data['updatedPdfDocumentReference']
    sign_req = json.dumps(prepare_data['visiblePdfSignatureRequirement'])

    message = gettext("Success preparing document %(doc)s", doc=document['name'])

    return {'message': message, 'payload': {'ref': doc_ref, 'sign_requirement': sign_req}}


@edusign_views.route('/create-sign-request', methods=['POST'])
@UnMarshal(ToSignSchema)
@Marshal(SignRequestSchema)
def create_sign_request(documents) -> dict:
    """"""
    current_app.logger.debug(f'Data gotten in create view: {documents}')
    try:
        current_app.logger.info(f"Creating signature request for user {session['eppn']}")
        create_data, documents_with_id = current_app.api_client.create_sign_request(documents['documents'])

    except current_app.api_client.ExpiredCache:
        current_app.logger.info(f"Some document(s) have expired for {session['eppn']} in the API's cache, restarting process...")
        return {'error': True, 'message': 'expired cache'}

    except Exception as e:
        current_app.logger.error(f'Problem creating sign request: {e}')
        return {'error': True, 'message': gettext('Communication error with the create endpoint of the eduSign API')}

    try:
        sign_data = {
            'relay_state': create_data['relayState'],
            'sign_request': create_data['signRequest'],
            'binding': create_data['binding'],
            'destination_url': create_data['destinationUrl'],
            'documents': documents_with_id,
        }
    except KeyError:
        current_app.logger.error(f'Problem creating sign request, got response: {create_data}')
        return {'error': True, 'message': create_data['message']}

    message = gettext("Success creating sign request")

    return {'message': message, 'payload': sign_data}


@edusign_views.route('/recreate-sign-request', methods=['POST'])
@UnMarshal(ToRestartSigningSchema)
@Marshal(SignRequestSchema)
def recreate_sign_request(documents) -> dict:
    """"""
    current_app.logger.debug(f'Data gotten in recreate view: {documents}')

    new_docs = []
    for doc in documents['documents']:
        current_app.logger.info(f"Re-preparing {doc['name']} for user {session['eppn']}")
        prepare_data = _prepare_document(doc)

        if 'error' in prepare_data and prepare_data['error']:
            current_app.logger.error(f"Problem re-preparing document: {doc['name']}")
            return prepare_data

        new_docs.append({
            'name': doc['name'],
            'type': doc['type'],
            'ref': prepare_data['updatedPdfDocumentReference'],
            'sign_requirement': json.dumps(prepare_data['visiblePdfSignatureRequirement'])
        })

    try:
        current_app.logger.info(f"Re-Creating signature request for user {session['eppn']}")
        create_data, documents_with_id = current_app.api_client.create_sign_request(new_docs)

    except Exception as e:
        current_app.logger.error(f'Problem creating sign request: {e}')
        return {'error': True, 'message': gettext('Communication error with the create endpoint of the eduSign API')}

    try:
        sign_data = {
            'relay_state': create_data['relayState'],
            'sign_request': create_data['signRequest'],
            'binding': create_data['binding'],
            'destination_url': create_data['destinationUrl'],
            'documents': documents_with_id,
        }
    except KeyError:
        current_app.logger.error(f'Problem re-creating sign request, got response: {create_data}')
        return {'error': True, 'message': create_data['message']}

    message = gettext("Success creating sign request")

    return {'message': message, 'payload': sign_data}


@edusign_views.route('/callback', methods=['POST'])
def sign_service_callback() -> str:

    data = {k: v for k, v in request.values.items()}
    current_app.logger.debug(f"Data received from sign service: {data}")
    bundle_name = 'main-bundle'
    if current_app.config['DEBUG']:
        bundle_name += '.dev'

    try:
        return render_template(
            'index-with-sign-response.jinja2',
            sign_response=request.form.get('EidSignResponse'),
            relay_state=request.form.get('RelayState'),
            bundle_name=bundle_name,
        )
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/get-signed', methods=['POST'])
@UnMarshal(SigningSchema)
@Marshal(SignedDocumentsSchema)
def get_signed_documents(sign_data) -> dict:

    try:
        current_app.logger.info(f"Processing signature for {sign_data['sign_response']} for user {session['eppn']}")
        process_data = current_app.api_client.process_sign_request(sign_data['sign_response'], sign_data['relay_state'])

    except Exception as e:
        current_app.logger.error(f'Problem processing sign request: {e}')
        return {'error': True, 'message': gettext('Communication error with the process endpoint of the eduSign API')}

    message = gettext("Success processing document sign request")

    return {'message': message, 'payload': {'documents': [{'id': doc['id'], 'signed_content': doc['signedContent']} for doc in process_data['signedDocuments']]}}
