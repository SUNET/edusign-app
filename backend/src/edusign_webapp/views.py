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
import asyncio
import json
from base64 import b64decode
from xml.etree import cElementTree as ET

from flask import Blueprint, abort, current_app, render_template, request, session
from flask_babel import gettext
from flask_mail import Message

from edusign_webapp.marshal import Marshal, UnMarshal
from edusign_webapp.schemata import (
    ConfigSchema,
    DocumentSchema,
    MultiSignSchema,
    ReferenceSchema,
    SignedDocumentsSchema,
    SigningSchema,
    SignRequestSchema,
    ToRestartSigningSchema,
    ToSignSchema,
)

edusign_views = Blueprint('edusign', __name__, url_prefix='/sign', template_folder='templates')


@edusign_views.route('/', methods=['GET'])
def get_index() -> str:
    """
    View to get the index html that loads the frontside app.

    This view assumes that it is secured by a Shibboleth SP, that has added some authn info as headers to the request,
    and in case that info is not already in the session, adds it there.

    :return: the rendered `index.jinja2` template as a string
    """
    if 'eppn' not in session:
        eppn = request.headers.get('Edupersonprincipalname')
        current_app.logger.info(f'User {eppn} started a session')
        session['eppn'] = eppn

        attrs = [(attr, attr.lower().capitalize()) for attr in current_app.config['SIGNER_ATTRIBUTES'].values()]
        for attr_in_session, attr_in_header in attrs:
            current_app.logger.debug(
                f'Getting attribute {attr_in_header} from request: {request.headers[attr_in_header]}'
            )
            session[attr_in_session] = ET.fromstring(b64decode(request.headers[attr_in_header])).text

        session['idp'] = request.headers.get('Shib-Identity-Provider')
        session['authn_method'] = request.headers.get('Shib-Authentication-Method')
        session['authn_context'] = request.headers.get('Shib-Authncontext-Class')

    current_app.logger.debug("Attributes in session: " + ", ".join([f"{k}: {v}" for k, v in session.items()]))

    bundle_name = 'main-bundle'
    if current_app.config['ENVIRONMENT'] == 'development':
        bundle_name += '.dev'

    try:
        return render_template('index.jinja2', bundle_name=bundle_name)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/config', methods=['GET'])
@Marshal(ConfigSchema)
def get_config() -> dict:
    """
    VIew to serve the configuration for the front app - in principle just the attributes used for signing.

    :return: A dict with the configuration parameters, to be marshaled with the ConfigSchema schema.
    """
    attrs = [{'name': attr, 'value': session[attr]} for attr in current_app.config['SIGNER_ATTRIBUTES'].values()]
    return {
        'payload': {
            'signer_attributes': attrs,
            'owned_multisign': current_app.doc_store.get_owned_documents(session['mail']),
            'invited_multisign': current_app.doc_store.get_pending_documents(session['mail']),
        }
    }


def _prepare_document(document: dict) -> dict:
    """
    Send documents to the eduSign API to be prepared for signing.

    :param document: a dict with metadata and contents of the document to be prepared.
    :return: a dict with the reponse obtained from the API, or with an error message.
    """
    try:
        current_app.logger.info(f"Sending document {document['name']} for preparation for user {session['eppn']}")
        return current_app.api_client.prepare_document(document)

    except Exception as e:
        current_app.logger.error(f'Problem preparing document: {e}')
        return {'error': True, 'message': gettext('Communication error with the prepare endpoint of the eduSign API')}


@edusign_views.route('/add-doc', methods=['POST'])
@UnMarshal(DocumentSchema)
@Marshal(ReferenceSchema)
def add_document(document: dict) -> dict:
    """
    View that sends a document to the API to be prepared to be signed.

    :param document: Representation of the document as unmarshaled by the DocumentSchema schema
    :return: a dict with the data returned from the API after preparing the document,
             or with eerror information in case of some error.
    """
    prepare_data = _prepare_document(document)

    if 'error' in prepare_data and prepare_data['error']:  # XXX update error message, translate
        return prepare_data

    if 'errorCode' in prepare_data:  # XXX update error message, translate
        prepare_data['error'] = True
        return prepare_data

    doc_ref = prepare_data['updatedPdfDocumentReference']
    sign_req = json.dumps(prepare_data['visiblePdfSignatureRequirement'])

    message = gettext("Success preparing document %(doc)s", doc=document['name'])

    return {'message': message, 'payload': {'ref': doc_ref, 'sign_requirement': sign_req}}


@edusign_views.route('/create-sign-request', methods=['POST'])
@UnMarshal(ToSignSchema)
@Marshal(SignRequestSchema)
def create_sign_request(documents: dict) -> dict:
    """
    View to send a request to the API to create a sign request.

    :param documents: Representation of the documents to include in the sign request,
                      as unmarshaled by the ToSignSchema schema
    :return: A dict with either the relevant information returned by the API,
             or information about some error obtained in the process.
    """
    current_app.logger.debug(f'Data gotten in create view: {documents}')
    try:
        current_app.logger.info(f"Creating signature request for user {session['eppn']}")
        create_data, documents_with_id = current_app.api_client.create_sign_request(documents['documents'])

    except current_app.api_client.ExpiredCache:
        current_app.logger.info(
            f"Some document(s) have expired for {session['eppn']} in the API's cache, restarting process..."
        )
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
def recreate_sign_request(documents: dict) -> dict:
    """
    View to both send some documents to the API to be prepared to  be signed,
    and to send the results of the preparations to create a sign request.

    This is used when a call to the `create` sign request API method has failed
    due to the prepared documents havingg been evicted from the API's cache.

    :param documents: representation of the documents as returned by the ToRestartSigningSchema
    :return: A dict with either the relevant information returned by the API's `create` sign request endpoint,
             or information about some error obtained in the process.
    """
    current_app.logger.debug(f'Data gotten in recreate view: {documents}')

    async def prepare(doc):
        return _prepare_document(doc)

    current_app.logger.info(f"Re-preparing documents for user {session['eppn']}")
    loop = asyncio.new_event_loop()
    tasks = [loop.create_task(prepare(doc)) for doc in documents['documents']]
    loop.run_until_complete(asyncio.wait(tasks))
    loop.close()

    docs_data = [task.result() for task in tasks]
    new_docs = []
    for doc_data, doc in zip(docs_data, documents['documents']):

        if 'error' in doc_data and doc_data['error']:
            current_app.logger.error(f"Problem re-preparing document for user {session['eppn']}: {doc['name']}")
            return doc_data

        current_app.logger.info(f"Re-prepared {doc['name']} for user {session['eppn']}")

        new_docs.append(
            {
                'name': doc['name'],
                'type': doc['type'],
                'ref': doc_data['updatedPdfDocumentReference'],
                'sign_requirement': json.dumps(doc_data['visiblePdfSignatureRequirement']),
            }
        )

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
    """
    Callback to be called from the signature service, after the user has visited it
    to finish signing some documents.

    :return: The rendered template `index-with-sign-response.jinja2`, which loads the app like the index,
             and in addition contains some information POSTed from the signature service, needed
             to retrieve the signed documents.
    """
    bundle_name = 'main-bundle'
    if current_app.config['DEBUG']:
        bundle_name += '.dev'

    try:
        sign_response = request.form['EidSignResponse']
        relay_state = request.form['RelayState']
    except KeyError as e:
        current_app.logger.error(f'Missing data in callback request: {e}')
        abort(400)

    try:
        return render_template(
            'index-with-sign-response.jinja2',
            sign_response=sign_response,
            relay_state=relay_state,
            bundle_name=bundle_name,
        )
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/get-signed', methods=['POST'])
@UnMarshal(SigningSchema)
@Marshal(SignedDocumentsSchema)
def get_signed_documents(sign_data: dict) -> dict:
    """
    View to get the signed documents from the API.

    :param sign_data: The data needed to identify the signed documents to be retrieved,
                      as obtained from the POST from the signature service to the `sign_service_callback`.
    :return: A dict with the signed documents, or with error information if some error has ocurred.
    """
    try:
        current_app.logger.info(f"Processing signature for {sign_data['sign_response']} for user {session['eppn']}")
        process_data = current_app.api_client.process_sign_request(sign_data['sign_response'], sign_data['relay_state'])

    except Exception as e:
        current_app.logger.error(f'Problem processing sign request: {e}')
        return {'error': True, 'message': gettext('Communication error with the process endpoint of the eduSign API')}

    message = gettext("Success processing document sign request")

    return {
        'message': message,
        'payload': {
            'documents': [
                {'id': doc['id'], 'signed_content': doc['signedContent']} for doc in process_data['signedDocuments']
            ]
        },
    }


@edusign_views.route('/create-multi-sign', methods=['POST'])
@UnMarshal(MultiSignSchema)
@Marshal()
def create_multi_sign_request(data: dict) -> dict:
    """
    View to create requests for collectively signing a document

    :param data: The document to sign, the owner of the document,
                 and the emails of the users invited to sign the doc.
    :return: A dict wit the signed documents, or with error information if some error has ocurred.
    """
    try:
        current_app.logger.info(f"Creating multi signature request for user {session['eppn']}")
        owner = {'name': session['displayName'], 'email': data['owner']}
        current_app.doc_store.add_document(data['document'], owner, data['invites'])

        recipients = [f"{invite['name']} <{invite['email']}>" for invite in data['invites']]

        msg = Message(gettext("XXX Invite mail subject"), recipients=recipients)
        msg.body = gettext("XXX Invite mail body")

        current_app.mailer.send(msg)

    except Exception as e:
        current_app.logger.error(f'Problem processing multi sign request: {e}')
        return {'error': True, 'message': gettext('Problem storing the document to be multi signed')}

    message = gettext("Success creating multi signature request")

    return {'message': message}
