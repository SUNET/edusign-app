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
from flask import Blueprint, abort, current_app, render_template, request, session, json
from flask_babel import gettext

from edusign_webapp.marshal import Marshal, UnMarshal
from edusign_webapp.schemata import (
    ConfigSchema,
    DocumentSchema,
    ReferenceSchema,
    SignedDocumentSchema,
    SigningDocumentSchema,
    ToSignSchema,
    SignRequestSchema,
)

edusign_views = Blueprint('edusign', __name__, url_prefix='/sign', template_folder='templates')


@edusign_views.route('/', methods=['GET'])
def get_bundle():
    if 'eppn' not in session:
        session['eppn'] = request.headers.get('Edupersonprincipalname')
        session['given_name'] = request.headers.get('Givenname')
        session['surname'] = request.headers.get('Sn')
        session['email'] = request.headers.get('Mail')
        session['idp'] = request.headers.get('Shib-Identity-Provider')
        session['authn_method'] = request.headers.get('Shib-Authentication-Method')
        session['authn_context'] = request.headers.get('Shib-Authncontext-Class')
        session['documents'] = []
    try:
        return render_template('index.jinja2')
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/config', methods=['GET'])
@Marshal(ConfigSchema)
def get_config() -> dict:
    """
    Configuration for the front app
    """
    return {
        'payload': {
            'given_name': session['given_name'],
            'surname': session['surname'],
            'email': session['email'],
            'documents': session['documents'],
        }
    }


@edusign_views.route('/add-doc', methods=['POST'])
@UnMarshal(DocumentSchema)
@Marshal(ReferenceSchema)
def add_document(document) -> dict:
    """"""
    try:
        current_app.logger.info(f"Sending document {document['name']} for preparation")
        prepare_data = current_app.api_client.prepare_document(document)

    except Exception as e:
        current_app.logger.error(f'Problem preparing document: {e}')
        return {'error': True, 'message': gettext('Communication error with the prepare endpoint of the eduSign API')}

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
        current_app.logger.info("Creating signature request")
        create_data = current_app.api_client.create_sign_request(documents['documents'])

    except Exception as e:
        current_app.logger.error(f'Problem creating sign request: {e}')
        return {'error': True, 'message': gettext('Communication error with the create endpoint of the eduSign API')}

    try:
        sign_data = {
            'relay_state': create_data['relayState'],
            'sign_request': create_data['signRequest'],
            'binding': create_data['binding'],
            'destination_url': create_data['destinationUrl'],
        }
    except KeyError:
        current_app.logger.error(f'Problem creating sign request, got response: {create_data}')
        return {'error': True, 'message': create_data['message']}

    message = gettext("Success creating sign request")

    return {'message': message, 'payload': sign_data}


@edusign_views.route('/callback', methods=['POST'])
def sign_service_callback() -> dict:
    sign_response = request.form.get('EidSignResponse')
    relay_state = request.form.get('RelayState')

    for doc in session['documents']:
        if doc['relay_state'] == relay_state:
            doc['state'] = 'ready'
            doc['sign_response'] = sign_response

    return get_bundle()


@edusign_views.route('/get-signed', methods=['POST'])
@UnMarshal(SigningDocumentSchema)
@Marshal(SignedDocumentSchema)
def get_signed_doc(document) -> dict:

    try:
        current_app.logger.info(f"Processing signature for {document['name']}")
        process_data = current_app.api_client.process_document(document['sign_response'], document['relay_state'])

    except Exception as e:
        current_app.logger.error(f'Problem processing sign request: {e}')
        return {'error': True, 'message': gettext('Communication error with the process endpoint of the eduSign API')}

    signed_content = process_data['signedDocuments'][0]['signedContent']

    message = gettext("Success processing document %(doc)s", doc=document['name'])

    return {'message': message, 'payload': {'name': document['name'], 'signed_content': signed_content}}
