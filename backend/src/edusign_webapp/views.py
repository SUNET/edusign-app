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
import uuid
from typing import Union

from flask import Blueprint, abort, current_app, redirect, render_template, request, session, url_for
from flask_babel import gettext
from flask_mail import Message
from werkzeug.wrappers import Response

from edusign_webapp.marshal import Marshal, UnMarshal
from edusign_webapp.schemata import (
    ConfigSchema,
    DocumentSchema,
    KeyedMultiSignSchema,
    MultiSignSchema,
    ReferenceSchema,
    SignedDocumentsSchema,
    SigningSchema,
    SignRequestSchema,
    ToRestartSigningSchema,
    ToSignSchema,
)
from edusign_webapp.utils import add_attributes_to_session, prepare_document

edusign_views = Blueprint('edusign', __name__, url_prefix='/sign', template_folder='templates')


@edusign_views.route('/', methods=['GET'])
def get_index() -> str:
    """
    View to get the index html that loads the frontside app.

    This view assumes that it is secured by a Shibboleth SP, that has added some authn info as headers to the request,
    and in case that info is not already in the session, adds it there.

    :return: the rendered `index.jinja2` template as a string
    """
    try:
        add_attributes_to_session()
    except KeyError:
        current_app.logger.error(
            'There is some misconfiguration and Shibboleth SP does not seem to be securing the edusign app.'
        )
        abort(500)
    except ValueError:
        abort(400)

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
            'pending_multisign': current_app.doc_store.get_pending_documents(session['mail']),
        }
    }


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
    prepare_data = prepare_document(document)

    if 'error' in prepare_data and prepare_data['error']:  # XXX update error message, translate
        return prepare_data

    if 'errorCode' in prepare_data:  # XXX update error message, translate
        prepare_data['error'] = True
        return prepare_data

    doc_ref = prepare_data['updatedPdfDocumentReference']
    sign_req = json.dumps(prepare_data['visiblePdfSignatureRequirement'])
    key = str(uuid.uuid4())

    message = gettext("Success preparing document %(doc)s", doc=document['name'])

    return {'message': message, 'payload': {'key': key, 'ref': doc_ref, 'sign_requirement': sign_req}}


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
    due to the prepared documents having been evicted from the API's cache.

    :param documents: representation of the documents as returned by the ToRestartSigningSchema
    :return: A dict with either the relevant information returned by the API's `create` sign request endpoint,
             or information about some error obtained in the process.
    """
    current_app.logger.debug(f'Data gotten in recreate view: {documents}')

    async def prepare(doc):
        return prepare_document(doc)

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
                'key': doc['key'],
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


@edusign_views.route('/callback', methods=['POST', 'GET'])
def sign_service_callback() -> Union[str, Response]:
    """
    Callback to be called from the signature service, after the user has visited it
    to finish signing some documents.

    :return: The rendered template `index-with-sign-response.jinja2`, which loads the app like the index,
             and in addition contains some information POSTed from the signature service, needed
             to retrieve the signed documents.
    """
    if request.method == 'GET':
        return redirect(url_for('edusign.get_index'))

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

    if 'errorCode' in process_data:
        current_app.logger.error(f"Problem processing sign request, error code received: {process_data}")
        # XXX capture more error conditions, inform end user
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
    :return: A message about the result of the procedure
    """
    if session['mail'] != data['owner']:
        current_app.logger.error(f"User {session['mail']} is trying to create an invitation as {data['owner']}")
        return {'error': True, 'message': gettext(f"You cannot invite as {data['owner']}")}

    try:
        current_app.logger.info(f"Creating multi signature request for user {session['eppn']}")
        owner = {'name': session['displayName'], 'email': data['owner']}
        invites = current_app.doc_store.add_document(data['document'], owner, data['invites'])

        for invite in invites:
            current_app.logger.debug(f"Adding invitation {invite} for {data['document']['name']}")
            recipients = [f"{invite['name']} <{invite['email']}>"]
            msg = Message(gettext("XXX Invite mail subject"), recipients=recipients)
            invited_link = url_for('edusign.create_invited_signature', invite_key=invite['key'], _external=True)
            context = {
                'document_name': data['document']['name'],
                'inviter_name': f"{owner['name']} <{owner['email']}>",
                'invited_link': invited_link,
            }
            msg.body = render_template('invitation_email.txt.jinja2', **context)
            current_app.logger.debug(f"Sending email to user {invite['email']}:\n{msg.body}")
            msg.html = render_template('invitation_email.html.jinja2', **context)

            current_app.mailer.send(msg)

    except Exception as e:
        current_app.logger.error(f'Problem processing multi sign request: {e}')
        return {'error': True, 'message': gettext('Problem storing the document to be multi signed')}

    message = gettext("Success creating multi signature request")

    return {'message': message}


@edusign_views.route('/remove-multi-sign', methods=['POST'])
@UnMarshal(KeyedMultiSignSchema)
@Marshal()
def remove_multi_sign_request(data: dict) -> dict:
    """
    View to remove requests for collectively signing a document

    :param data: The key of the document to remove
    :return: A message about the result of the procedure
    """
    try:
        removed = current_app.doc_store.remove_document(uuid.UUID(data['key']), force=True)

    except Exception as e:
        current_app.logger.error(f'Problem removing multi sign request: {e}')
        return {'error': True, 'message': gettext('Problem removing the document to be multi signed')}

    if not removed:
        current_app.logger.error('Could not remove the multi sign request')
        return {'error': True, 'message': gettext('Could not remove the document to be multi signed')}

    message = gettext("Success removing multi signature request")

    return {'message': message}


@edusign_views.route('/invitation/<invite_key>', methods=['GET'])
def create_invited_signature(invite_key: str) -> str:
    """"""
    try:
        data = current_app.doc_store.get_invitation(uuid.UUID(invite_key))
    except current_app.doc_store.DocumentLocked:
        message = gettext("Someone else is signing the document right now, please try again in a few minutes")
        return render_template('error-generic.jinja2', message=message)

    current_app.logger.info(f"Invitation data: {data}")

    if not data:
        message = gettext("There seems to be no invitation for you")
        return render_template('error-generic.jinja2', message=message)

    add_attributes_to_session(check_whitelisted=False)

    doc = data['document']
    user = data['user']
    key = uuid.UUID(bytes=doc['key'])

    if user['email'] != session['mail']:
        current_app.doc_store.unlock_document(key, user['email'])
        message = gettext("The invited email does not coincide with yours")
        return render_template('error-generic.jinja2', message=message)

    doc_data = prepare_document(doc)

    if 'error' in doc_data and doc_data['error']:
        current_app.doc_store.unlock_document(key, user['email'])
        message = gettext("Problem preparing document for multi sign by user %s: %s") % (session['eppn'], doc['name'])
        return render_template('error-generic.jinja2', message=message)

    current_app.logger.info(f"Prepared {doc['name']} for multisigning by user {session['eppn']}")

    new_doc = {
        'key': str(uuid.UUID(bytes=doc['key'])),
        'name': doc['name'],
        'type': doc['type'],
        'ref': doc_data['updatedPdfDocumentReference'],
        'sign_requirement': json.dumps(doc_data['visiblePdfSignatureRequirement']),
    }

    try:
        current_app.logger.info(f"Creating (multi) signature request for user {session['eppn']}")
        create_data, documents_with_id = current_app.api_client.create_sign_request([new_doc], single_sign=False)

    except Exception as e:
        current_app.doc_store.unlock_document(key, user['email'])
        current_app.logger.error(f'Problem creating sign request: {e}')
        return render_template(
            'error-generic.jinja2', message=gettext('Communication error with the create endpoint of the eduSign API')
        )

    return render_template('vanity-form.jinja2', **create_data)


@edusign_views.route('/multisign-callback/<doc_key>', methods=['POST'])
def multi_sign_service_callback(doc_key) -> str:
    """
    Callback to be called from the signature service, after the user has visited it
    to finish signing some invited document.

    :return: The rendered template with information on the result of the process.
    """
    key = uuid.UUID(doc_key)
    if not current_app.doc_store.check_document_locked(key, session['mail']):
        current_app.logger.error(f'Trying to add signature to unlocked document with key: {doc_key}')
        return render_template(
            'error-generic.jinja2', message=gettext('Timeout signing the document, please try again')
        )

    try:
        sign_response = request.form['EidSignResponse']
        relay_state = request.form['RelayState']
    except KeyError as e:
        current_app.logger.error(f'Missing data in callback request: {e}')
        abort(400)

    current_app.logger.debug(f"Session contains {session.items()}")

    try:
        current_app.logger.info(f"Processing signature for {sign_response}")
        process_data = current_app.api_client.process_sign_request(sign_response, relay_state)

    except Exception as e:
        current_app.logger.error(f'Problem processing sign request: {e}')
        return render_template(
            'error-generic.jinja2', message=gettext('Communication error with the process endpoint of the eduSign API')
        )

    doc = process_data['signedDocuments'][0]

    current_app.doc_store.update_document(key, doc['signedContent'], session['mail'])
    current_app.doc_store.unlock_document(key, session['mail'])

    message = gettext("Success processing document sign request")

    return render_template('success-generic.jinja2', message=message)


@edusign_views.route('/final-sign-request', methods=['POST'])
@UnMarshal(KeyedMultiSignSchema)
@Marshal(SignRequestSchema)
def final_multisign_signature(data: dict) -> dict:
    """
    View to add the final signature to a multisigned document.

    :param data: The key of the document to remove
    :return: Sign data to send to the edusign API
    """

    doc = current_app.doc_store.get_signed_document(uuid.UUID(data['key']))
    if not doc:
        current_app.logger.error(f"Problem getting multisigned document with key : {data['key']}")
        return {'error': True, 'message': gettext('Multisigned document not found in the doc store')}

    doc_data = prepare_document(doc)

    if 'error' in doc_data and doc_data['error']:
        current_app.logger.error(f"Problem preparing multisigned document for user {session['eppn']}: {data['key']}")
        return doc_data

    current_app.logger.info(f"Prepared multisigned {doc['name']} for user {session['eppn']}")

    doc_list = [
        {
            'key': data['key'],
            'name': doc['name'],
            'type': doc['type'],
            'size': doc['size'],
            'blob': doc['blob'],
            'ref': doc_data['updatedPdfDocumentReference'],
            'sign_requirement': json.dumps(doc_data['visiblePdfSignatureRequirement']),
        }
    ]

    try:
        current_app.logger.info(f"Creating signature request for multisigned doc for user {session['eppn']}")
        create_data, documents_with_id = current_app.api_client.create_sign_request(doc_list, add_blob=True)

    except Exception as e:
        current_app.logger.error(f'Problem creating sign request for multisigned doc: {e}')
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
