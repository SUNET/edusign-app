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
import os
import uuid
from base64 import b64decode
from email.mime.base import MIMEBase
from typing import Any, Dict, List, Union

import pkg_resources
from flask import Blueprint, abort, current_app, redirect, render_template, request, session, url_for
from flask_babel import force_locale, get_locale, gettext
from flask_mail import Message
from werkzeug.wrappers import Response

from edusign_webapp.marshal import Marshal, UnMarshal, UnMarshalNoCSRF
from edusign_webapp.schemata import (
    BlobSchema,
    ConfigSchema,
    DocumentSchema,
    InvitationsSchema,
    KeyedMultiSignSchema,
    MultiSignSchema,
    ReferenceSchema,
    ResendMultiSignSchema,
    ReSignRequestSchema,
    SignedDocumentsSchema,
    SigningSchema,
    SignRequestSchema,
    ToRestartSigningSchema,
    ToSignSchema,
)
from edusign_webapp.utils import (
    add_attributes_to_session,
    get_invitations,
    get_previous_signatures,
    prepare_document,
)
try:
    import redis
    import rq
except ImportError:
    from edusign_webapp.mail import sendmail_sync as sendmail
else:
    from edusign_webapp.mail import sendmail_async as sendmail

anon_edusign_views = Blueprint('edusign_anon', __name__, url_prefix='', template_folder='templates')

edusign_views = Blueprint('edusign', __name__, url_prefix='/sign', template_folder='templates')


@anon_edusign_views.route('/', methods=['GET'])
def get_home():
    """
    View to serve the anonymous landing page.

    The text on the page is extractd from markdown documents
    at edusign_webapp/md/, and can be overridden with md documents at /etc/edusign.

    :return: the rendered `home.jinja2` template as a string
    """
    current_lang = str(get_locale())
    md_name = f"home-{current_lang}.md"
    md_etc = os.path.join('/etc/edusign/', md_name)
    if os.path.exists(md_etc):
        md_file = md_etc
    else:
        md_file = os.path.join(current_app.config['HERE'], 'md', md_name)

    with open(md_file) as f:
        body = f.read()

    base_url = f"{current_app.config['PREFERRED_URL_SCHEME']}://{current_app.config['SERVER_NAME']}"

    other_lang = 'en' if current_lang == 'sv' else 'sv'

    version = pkg_resources.require('edusign-webapp')[0].version

    context = {
        'body': body,
        'login_initiator': f'{base_url}/Shibboleth.sso/Login?target=/sign',
        'other_lang': other_lang,
        'other_lang_name': current_app.config['SUPPORTED_LANGUAGES'][other_lang],
        'version': version,
    }

    try:
        return render_template('home.jinja2', **context)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@anon_edusign_views.route('/faq', methods=['GET'])
def get_help_page():
    """
    View to serve the anonymous about page.

    The text on the page is extractd from markdown documents
    at edusign_webapp/md/, and can be overridden with md documents at /etc/edusign.

    :return: the rendered `about.jinja2` template as a string
    """
    current_lang = str(get_locale())
    md_name = f"about-{current_lang}.md"
    md_etc = os.path.join('/etc/edusign/', md_name)
    if os.path.exists(md_etc):
        md_file = md_etc
    else:
        md_file = os.path.join(current_app.config['HERE'], 'md', md_name)

    with open(md_file) as f:
        body = f.read()

    other_lang = 'en' if current_lang == 'sv' else 'sv'

    version = pkg_resources.require('edusign-webapp')[0].version

    context = {
        'body': body,
        'other_lang': other_lang,
        'other_lang_name': current_app.config['SUPPORTED_LANGUAGES'][other_lang],
        'version': version,
    }

    try:
        return render_template('about.jinja2', **context)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/logout', methods=['GET'])
def logout() -> Response:
    """
    View to log out of the app.

    Logging out just means clearing the data in the session;
    it does not entail a SLO through the SAML IdP. So returning to
    the app will automatically re-login the user if the session at
    the IdP is still valid.

    :return: A Werkzeug redirect Response to the anonymous landing page
    """
    session.clear()
    return redirect(url_for('edusign_anon.get_home'))


@edusign_views.route('/', methods=['GET'])
def get_index() -> str:
    """
    View to get the index html that loads the frontside app.

    This view assumes that it is secured by a Shibboleth SP,
    that has added some authn info as headers to the request,
    and in case that info is not already in the session, adds it there.

    If there is no correct authn info in the headers, the app assumes that the org / IdP
    used by the user is not releasing the appropriate attributes for eduSign.

    If the authn info in the headers does not correspond to a whitelisted user,
    this view returns a page informing the user that they have no permission to
    use the service.

    :return: the rendered `index.jinja2` template as a string (or `error-generic.jinja2` in case of errors)
    """
    context = {
        'back_link': f"{current_app.config['PREFERRED_URL_SCHEME']}://{current_app.config['SERVER_NAME']}",
        'back_button_text': gettext("Back"),
    }
    unauthn = False
    try:
        add_attributes_to_session()
    except KeyError as e:
        current_app.logger.error(
            f'There is some misconfiguration and the IdP does not seem to provide the correct attributes: {e}.'
        )
        context['title'] = gettext("Missing information")
        context['message'] = gettext(
            'Your organization did not provide the correct information during login. Please contact your IT-support for assistance.'
        )
        return render_template('error-generic.jinja2', **context)
    except ValueError:
        invites = get_invitations()
        if len(invites['pending_multisign']) > 0:
            current_app.logger.debug(f"Authorizing non-whitelisted invited user, has invitations: {invites}")
            unauthn = True
        else:
            current_app.logger.debug(f"Not authorizing non-whitelisted invited user, has no invitations: {invites}")
            context['title'] = gettext("No documents to sign")
            context['message'] = gettext(
                'You are currently not invited to sign any documents. The organization/identity provider you are affiliated with does not have permission to upload your own documents into eduSign to sign. Please contact your IT-department if you would like to be able to sign your own documents or invite others to sign your documents.'
            )
            return render_template('error-generic.jinja2', **context)

    if 'invited-unauthn' in session:
        invites = get_invitations()
        if len(invites['pending_multisign']) > 0:
            unauthn = True

    session['invited-unauthn'] = unauthn
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
    View to serve the configuration for the front app.

    This is called once the browser has rendered the js app.
    The main info sent in the config JSON is:

    - Info about pending invitations to sign, both as inviter and as invitee;
    - Attributes released by the IdP;
    - A flag to indicate whether to show the invitations button;
    - A flag to indicate whether the user has logged in through a whitelisted organization.

    :return: A dict with the configuration parameters, to be marshaled with the ConfigSchema schema.
    """
    payload = get_invitations()

    if 'eppn' in session and current_app.is_whitelisted(session['eppn']):
        payload['unauthn'] = False
    else:
        payload['unauthn'] = True

    attrs = {'eppn': session['eppn'], "mail": session["mail"]}
    if 'displayName' in session:
        attrs['name'] = session['displayName']
    else:
        attrs['name'] = f"{session['givenName']} {session['sn']}"

    payload['signer_attributes'] = attrs
    payload['multisign_buttons'] = current_app.config['MULTISIGN_BUTTONS']

    return {
        'payload': payload,
    }


@edusign_views.route('/poll', methods=['GET'])
@Marshal(InvitationsSchema)
def poll() -> dict:
    """
    View to serve the invitations data for the front app.

    The front side js app will poll this view when the user has invited others to sign,
    and there are pending signatures, to update the representation of said invitations.

    :return: A dict with the invitation data.
    """
    payload = get_invitations()

    return {
        'payload': payload,
    }


@edusign_views.route('/add-doc', methods=['POST'])
@UnMarshalNoCSRF(DocumentSchema)
@Marshal(ReferenceSchema)
def add_document(document: dict) -> dict:
    """
    View that sends a document to the API to be prepared to be signed.

    This is called from the front side app as soon as the user loads a document.

    :param document: Representation of the document as unmarshaled by the DocumentSchema schema
    :return: a dict with the data returned from the API after preparing the document,
             or with eerror information in case of some error.
    """
    if 'mail' not in session or not current_app.is_whitelisted(session['eppn']):
        return {'error': True, 'message': gettext('Unauthorized')}

    prepare_data = prepare_document(document)

    if 'error' in prepare_data and prepare_data['error']:  # XXX update error message, translate
        return prepare_data

    if 'errorCode' in prepare_data:  # XXX update error message, translate
        prepare_data['error'] = True
        return prepare_data

    doc_ref = prepare_data['updatedPdfDocumentReference']
    sign_req = json.dumps(prepare_data['visiblePdfSignatureRequirement'])
    key = str(uuid.uuid4())

    prev_signatures = get_previous_signatures(document)

    return {'payload': {'key': key, 'ref': doc_ref, 'sign_requirement': sign_req, 'prev_signatures': prev_signatures}}


@edusign_views.route('/create-sign-request', methods=['POST'])
@UnMarshal(ToSignSchema)
@Marshal(SignRequestSchema)
def create_sign_request(documents: dict) -> dict:
    """
    View to send a request to the API to create a sign request.

    This is the first view that is called when the user starts the signature process for some document(s)
    that do not involve invitations.

    The sign request obtained from the API in this view is sent back to the eduSign js app in the browser,
    which will immediately POST it to the sign service to start the actual signing process.

    The prepared document might have been removed from the API's cache, in which case the front side app will be
    informed so that documents can be re-prepared.

    :param documents: Representation of the documents to include in the sign request,
                      as unmarshaled by the ToSignSchema schema
    :return: A dict with either the relevant information returned by the API,
             or information about some error obtained in the process.
    """
    if 'mail' not in session or not current_app.is_whitelisted(session['eppn']):
        return {'error': True, 'message': gettext('Unauthorized')}

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
        return {
            'error': True,
            'message': gettext('There was an error. Please try again, or contact the site administrator.'),
        }

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
        # XXX translate
        return {'error': True, 'message': create_data['message']}

    return {'payload': sign_data}


@edusign_views.route('/recreate-sign-request', methods=['POST'])
@UnMarshal(ToRestartSigningSchema)
@Marshal(ReSignRequestSchema)
def recreate_sign_request(documents: dict) -> dict:
    """
    View to both send some documents to the API to be prepared to  be signed,
    and to send the results of the preparations to create a sign request.

    This is used when a call to the `create` sign request API method has failed
    due to the prepared documents having been evicted from the API's cache.

    This is also used when there are invitations among the documents to sign,
    either as inviter or as invitee, since we assume that the invitations signing process is
    generally longer than the cache timeout in the API.

    This view will check for locks in invited documents to make sure no race condition
    occurs as different invitees try signing the same document in parallell,
    and inform the front side app about them so it can tell the user.

    The sign request obtained from the API in this view is sent back to the eduSign js app in the browser,
    which will immediately POST it to the sign service to start the actual signing process.

    :param documents: representation of the documents as returned by the ToRestartSigningSchema
    :return: A dict with either the relevant information returned by the API's `create` sign request endpoint,
             or information about some error obtained in the process.
    """
    if 'mail' not in session or not current_app.is_whitelisted(session['eppn']):
        if not session['invited-unauthn']:
            return {'error': True, 'message': gettext('Unauthorized')}

    current_app.logger.debug(f'Data gotten in recreate view: {documents}')

    async def prepare(doc):
        return prepare_document(doc)

    current_app.logger.info(f"Re-preparing documents for user {session['eppn']}")
    loop = asyncio.new_event_loop()
    tasks = [loop.create_task(prepare(doc)) for doc in documents['documents']['local']]

    for doc in documents['documents']['owned']:
        doc['blob'] = current_app.doc_store.get_document_content(doc['key'])
        tasks.append(loop.create_task(prepare(doc)))

    failed: List[Dict[str, Any]] = []

    invited_docs = []
    for doc in documents['documents']['invited']:
        current_app.logger.debug(f"Re-preparing invited document {doc['name']}")
        try:
            stored = current_app.doc_store.get_invitation(doc['invite_key'])
        except current_app.doc_store.DocumentLocked:
            current_app.logger.debug(f"Invited document {doc['name']} is locked")
            failedDoc = {
                'key': doc['key'],
                'state': 'failed-signing',
                'message': gettext("Document is being signed by another user, please try again in a few minutes."),
            }
            failed.append(failedDoc)
            continue

        if not stored:
            current_app.logger.debug(f"No invitation for user {session['eppn']} to sign {doc['name']}")
            failedDoc = {
                'key': doc['key'],
                'state': 'failed-signing',
                'message': gettext("There doesn't seem to be an invitation for you to sign \"%(docname)s\".")
                % {'docname': doc.name},
            }
            failed.append(failedDoc)
            continue

        if stored['user']['email'] != session['mail']:
            current_app.logger.error(
                f"Trying to sign invitation with wrong email {session['mail']} (invited:  {stored['user']['email']})"
            )
            failedDoc = {
                'key': doc['key'],
                'state': 'failed-signing',
                'message': gettext("The email %(email)s invited to sign \"%(docname)s\" does not coincide with yours.")
                % {'email': stored['user']['email'], 'docname': doc.name},
            }
            failed.append(failedDoc)
            continue

        doc['blob'] = stored['document']['blob']
        tasks.append(loop.create_task(prepare(doc)))
        invited_docs.append(doc)

    if len(tasks) > 0:
        loop.run_until_complete(asyncio.wait(tasks))
    loop.close()

    docs_data = [task.result() for task in tasks]
    new_docs = []
    all_docs = documents['documents']['local'] + documents['documents']['owned'] + invited_docs
    for doc_data, doc in zip(docs_data, all_docs):

        if 'error' in doc_data and doc_data['error']:
            current_app.logger.error(f"Problem re-preparing document for user {session['eppn']}: {doc['name']}")
            failedDoc = {
                'key': doc['key'],
                'state': 'failed-signing',
                'message': doc_data.get(
                    'message',
                    gettext(
                        "Problem preparing document for signing. Please try again, or contact the site administrator."
                    ),
                ),
            }
            failed.append(failedDoc)
            continue

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

    if len(new_docs) > 0:
        try:
            current_app.logger.info(f"Re-Creating signature request for user {session['eppn']}")
            create_data, documents_with_id = current_app.api_client.create_sign_request(new_docs)

        except Exception as e:
            current_app.logger.error(f'Problem creating sign request: {e}')
            return {
                'error': True,
                'message': gettext('There was an error. Please try again, or contact the site administrator.'),
            }

        try:
            sign_data = {
                'relay_state': create_data['relayState'],
                'sign_request': create_data['signRequest'],
                'binding': create_data['binding'],
                'destination_url': create_data['destinationUrl'],
                'documents': documents_with_id,
                'failed': failed,
            }
        except KeyError:
            current_app.logger.error(f'Problem re-creating sign request, got response: {create_data}')
            # XXX translate
            return {'error': True, 'message': create_data['message']}
    else:
        sign_data = {
            'relay_state': "unused - nothing signing",
            'sign_request': "unused - nothing signing",
            'binding': "unused - nothing signing",
            'destination_url': "unused - nothing signing",
            'documents': [],
            'failed': failed,
        }

    return {'payload': sign_data}


@edusign_views.route('/callback', methods=['POST', 'GET'])
def sign_service_callback() -> Union[str, Response]:
    """
    After the user has used the sign request to go through the sign service and IdP to sign the documents,
    the sign service will respond with a redirect to this view. This redirect will carry the sign response
    obtained in the sign process.

    The response of this view will trigger loading the frontside js eduSign app in the browser,
    adding the sign response to the mix as data attributes in the html. When the frontside app loads,
    and detects a sign response in the html, it will automatically call the `get_signed_docs` view below,
    to get the signed documents in the browser and hand them over to the user.

    :return: The rendered template `index-with-sign-response.jinja2`, which loads the app like the index,
             and in addition contains some information POSTed from the signature service, needed
             to retrieve the signed documents.
    """
    if request.method == 'GET':
        return redirect(url_for('edusign.get_index'))

    bundle_name = 'main-bundle'
    if current_app.config['ENVIRONMENT'] == 'development':
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
        return {
            'error': True,
            'message': gettext('There was an error. Please try again, or contact the site administrator.'),
        }

    if 'errorCode' in process_data:
        current_app.logger.error(f"Problem processing sign request, error code received: {process_data}")
        # XXX translate
        return {'error': True, 'message': process_data['message']}

    docs = []
    for doc in process_data['signedDocuments']:
        key = doc['id']
        owner = current_app.doc_store.get_owner_data(key)
        sendsigned = current_app.doc_store.get_sendsigned(key)

        if 'email' in owner and owner['email'] != session['mail']:
            pending = current_app.doc_store.get_pending_invites(key, exclude=session['mail'])

            if len(pending) > 0:
                template = 'signed_by_email'
            else:
                template = 'final_signed_by_email'

            try:
                mail_context = {
                    'document_name': owner['docname'],
                    'invited_name': session['displayName'],
                    'invited_email': session['mail'],
                }
                recipients = [f"{owner['name']} <{owner['email']}>"]
                with force_locale('en'):
                    subject_en = gettext('%(name)s signed "%(docname)s"') % {
                        'name': session['displayName'],
                        'docname': owner['docname'],
                    }
                    body_txt_en = render_template(f'{template}.txt.jinja2', **mail_context)
                    body_html_en = render_template(f'{template}.html.jinja2', **mail_context)
                with force_locale('sv'):
                    subject_sv = gettext('%(name)s signed "%(docname)s"') % {
                        'name': session['displayName'],
                        'docname': owner['docname'],
                    }
                    body_txt_sv = render_template(f'{template}.txt.jinja2', **mail_context)
                    body_html_sv = render_template(f'{template}.html.jinja2', **mail_context)

                sendmail(recipients, subject_en, subject_sv, body_txt_en, body_html_en, body_txt_sv, body_html_sv)

            except Exception as e:
                current_app.logger.error(f"Problem sending signed by {session['email']} email to {owner['email']}: {e}")

        elif owner:
            if sendsigned:
                recipients = [
                    f"{invited['name']} <{invited['email']}>"
                    for invited in current_app.doc_store.get_pending_invites(key)
                    if invited['signed']
                ]
                recipients.append(f"{owner['name']} <{owner['email']}>")
                try:
                    mail_context = {
                        'document_name': owner['docname'],
                    }
                    with force_locale('en'):
                        subject_en = gettext("\"%(docname)s\" is now signed") % {'docname': owner['docname']}
                        body_txt_en = render_template('signed_all_email.txt.jinja2', **mail_context)
                        body_html_en = render_template('signed_all_email.html.jinja2', **mail_context)
                    with force_locale('sv'):
                        subject_sv = gettext("\"%(docname)s\" is now signed") % {'docname': owner['docname']}
                        body_txt_sv = render_template('signed_all_email.txt.jinja2', **mail_context)
                        body_html_sv = render_template('signed_all_email.html.jinja2', **mail_context)

                    # attach PDF
                    doc_name = current_app.doc_store.get_document_name(key)
                    signed_doc_name = '.'.join(doc_name.split('.')[:-1]) + '-signed.pdf'
                    pdf_bytes = b64decode(doc['signedContent'], validate=True)

                    sendmail(
                        recipients,
                        subject_en,
                        subject_sv,
                        body_txt_en,
                        body_html_en,
                        body_txt_sv,
                        body_html_sv,
                        attachment_name=signed_doc_name,
                        attachment=pdf_bytes,
                    )

                except Exception as e:
                    current_app.logger.error(f"Problem sending signed by {owner['email']} email to all invited: {e}")

    for doc in process_data['signedDocuments']:
        key = doc['id']
        owner = current_app.doc_store.get_owner_data(key)

        if 'email' in owner and owner['email'] != session['mail']:
            current_app.doc_store.update_document(key, doc['signedContent'], session['mail'])
            current_app.doc_store.unlock_document(key, session['mail'])

        elif owner:
            current_app.doc_store.remove_document(key)

        docs.append({'id': key, 'signed_content': doc['signedContent']})

    return {
        'payload': {'documents': docs},
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
    if 'mail' not in session or not current_app.is_whitelisted(session['eppn']):
        return {'error': True, 'message': gettext('Unauthorized')}

    if session['mail'] != data['owner']:
        current_app.logger.error(f"User {session['mail']} is trying to create an invitation as {data['owner']}")
        return {'error': True, 'message': gettext("You cannot invite as %(owner)s") % {'owner': data['owner']}}

    for invite in data['invites']:
        invite['email'] = invite['email'].lower()

    try:
        current_app.logger.info(f"Creating multi signature request for user {session['eppn']}")
        owner = {'name': session['displayName'], 'email': data['owner']}
        invites = current_app.doc_store.add_document(data['document'], owner, data['invites'], data['sendsigned'])

    except Exception as e:
        current_app.logger.error(f'Problem processing multi sign request: {e}')
        return {'error': True, 'message': gettext('Problem creating invitation to sign, please try again')}

    recipients = [f"{invite['name']} <{invite['email']}>" for invite in invites]
    if len(recipients) > 0:
        try:
            doc_name = data['document']['name']
            invited_link = url_for('edusign.get_index', _external=True)
            mail_context = {
                'document_name': doc_name,
                'inviter_email': f"{owner['email']}",
                'inviter_name': f"{owner['name']}",
                'invited_link': invited_link,
                'text': data['text'],
            }
            mail_context_html = mail_context.copy()
            mail_context_html['inviter_name_and_email'] = f"{owner['name']} &lt;{owner['email']}&gt;"
            with force_locale('en'):
                subject_en = gettext('You have been invited to sign "%(document_name)s"') % {'document_name': doc_name}
                body_txt_en = render_template('invitation_email.txt.jinja2', **mail_context)
                body_html_en = render_template('invitation_email.html.jinja2', **mail_context_html)
            with force_locale('sv'):
                subject_sv = gettext('You have been invited to sign "%(document_name)s"') % {'document_name': doc_name}
                body_txt_sv = render_template('invitation_email.txt.jinja2', **mail_context)
                body_html_sv = render_template('invitation_email.html.jinja2', **mail_context_html)

            sendmail(recipients, subject_en, subject_sv, body_txt_en, body_html_en, body_txt_sv, body_html_sv)

        except Exception as e:
            current_app.doc_store.remove_document(uuid.UUID(data['document']['key']), force=True)
            current_app.logger.error(f'Problem sending invitation email: {e}')
            return {'error': True, 'message': gettext('There was a problem and the invitation email(s) were not sent')}

    message = gettext("Success sending invitations to sign")

    return {'message': message}


@edusign_views.route('/send-multisign-reminder', methods=['POST'])
@UnMarshal(ResendMultiSignSchema)
@Marshal()
def send_multisign_reminder(data: dict) -> dict:
    """
    Send emails to remind people to sign some document

    :param data: The key of the document pending signatures
    :return: A message about the result of the procedure
    """
    try:
        pending = current_app.doc_store.get_pending_invites(uuid.UUID(data['key']))
        docname = current_app.doc_store.get_document_name(uuid.UUID(data['key']))

    except Exception as e:
        current_app.logger.error(f'Problem finding users pending to multi sign: {e}')
        return {'error': True, 'message': gettext('Problem finding the users pending to multi sign')}

    if not pending:
        current_app.logger.error(f"Could not find users pending signing the multi sign request {data['key']}")
        return {'error': True, 'message': gettext('Problem finding the users pending to sign')}

    if not docname:
        current_app.logger.error(f"Could not find document {data['key']} pending signing the multi sign request")
        return {'error': True, 'message': gettext('Could not find the document')}

    recipients = [
        f"{invite['name']} <{invite['email']}>" for invite in pending if not invite['signed'] and not invite['declined']
    ]
    if len(recipients) > 0:
        try:
            invited_link = url_for('edusign.get_index', _external=True)
            mail_context = {
                'document_name': docname,
                'inviter__email': f"{session['mail']}",
                'inviter_name': f"{session['displayName']}",
                'invited_link': invited_link,
                'text': 'text' in data and data['text'] or "",
            }
            mail_context_html = mail_context.copy()
            mail_context_html['inviter_name_and_email'] = f"{session['displayName']} &lt;{session['mail']}&gt;"
            with force_locale('en'):
                subject_en = gettext('A reminder to sign "%(document_name)s"') % {'document_name': docname}
                body_txt_en = render_template('reminder_email.txt.jinja2', **mail_context)
                body_html_en = render_template('reminder_email.html.jinja2', **mail_context_html)
            with force_locale('sv'):
                subject_sv = gettext('A reminder to sign "%(document_name)s"') % {'document_name': docname}
                body_txt_sv = render_template('reminder_email.txt.jinja2', **mail_context)
                body_html_sv = render_template('reminder_email.html.jinja2', **mail_context_html)

            sendmail(recipients, subject_en, subject_sv, body_txt_en, body_html_en, body_txt_sv, body_html_sv)

        except Exception as e:
            current_app.logger.error(f'Problem sending reminder email: {e}')
            return {'error': True, 'message': gettext('Problem sending the email, please try again')}

    message = gettext("Success sending reminder email to pending users")

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
        return {'error': True, 'message': gettext('Problem removing the invitation, please try again')}

    if not removed:
        current_app.logger.error(f'Could not remove the multi sign request corresponding to data: {data}')
        return {'error': True, 'message': gettext('Document has not been removed, please try again')}

    message = gettext("Success removing invitation to sign")

    return {'message': message}


@edusign_views.route('/get-partially-signed', methods=['POST'])
@UnMarshal(KeyedMultiSignSchema)
@Marshal(BlobSchema)
def get_partially_signed_doc(data: dict) -> dict:
    """
    View to get a document for preview that is only partially signed

    :param data: The key of the document to get
    :return: A message about the result of the procedure
    """
    try:
        doc = current_app.doc_store.get_document_content(uuid.UUID(data['key']))

    except Exception as e:
        current_app.logger.error(f'Problem getting multi sign document: {e}')
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    if not doc:
        current_app.logger.error(f"Problem getting multisigned document with key : {data['key']}")
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    return {'message': 'Success', 'payload': {'blob': doc}}


@edusign_views.route('/skip-final-signature', methods=['POST'])
@UnMarshal(KeyedMultiSignSchema)
@Marshal(SignedDocumentsSchema)
def skip_final_signature(data: dict) -> dict:

    key = uuid.UUID(data['key'])
    try:
        doc = current_app.doc_store.get_signed_document(key)
        sendsigned = current_app.doc_store.get_sendsigned(key)

    except Exception as e:
        current_app.logger.error(f'Problem getting signed document: {e}')
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    if not doc:
        current_app.logger.error(f"Problem getting multisigned document with key : {data['key']}")
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    if sendsigned:
        try:
            recipients = [
                f"{invited['name']} <{invited['email']}>"
                for invited in current_app.doc_store.get_pending_invites(key)
                if invited['signed']
            ]
            owner = current_app.doc_store.get_owner_data(key)
            recipients.append(f"{owner['name']} <{owner['email']}>")

            mail_context = {
                'document_name': doc['name'],
            }
            with force_locale('en'):
                subject_en = gettext("\"%(docname)s\" is now signed") % {'docname': doc['name']}
                body_txt_en = render_template('signed_all_email.txt.jinja2', **mail_context)
                body_html_en = render_template('signed_all_email.html.jinja2', **mail_context)
            with force_locale('sv'):
                subject_sv = gettext("\"%(docname)s\" is now signed") % {'docname': doc['name']}
                body_txt_sv = render_template('signed_all_email.txt.jinja2', **mail_context)
                body_html_sv = render_template('signed_all_email.html.jinja2', **mail_context)

            # attach PDF
            doc_name = current_app.doc_store.get_document_name(key)
            signed_doc_name = '.'.join(doc_name.split('.')[:-1]) + '-signed.pdf'
            pdf_bytes = b64decode(doc['blob'], validate=True)

            sendmail(
                recipients,
                subject_en,
                subject_sv,
                body_txt_en,
                body_html_en,
                body_txt_sv,
                body_html_sv,
                attachment_name=signed_doc_name,
                attachment=pdf_bytes,
            )
        except Exception as e:
            current_app.logger.error(f'Problem sending signed document to invited users: {e}')

    try:
        current_app.doc_store.remove_document(key)

    except Exception as e:
        current_app.logger.warning(f'Problem removing doc skipping final signature: {e}')

    return {
        'message': 'Success',
        'payload': {'documents': [{'id': doc['key'], 'signed_content': doc['blob']}]},
    }


@edusign_views.route('/decline-invitation', methods=['POST'])
@UnMarshal(KeyedMultiSignSchema)
@Marshal()
def decline_invitation(data):

    key = uuid.UUID(data['key'])
    email = session['mail']

    try:
        current_app.doc_store.decline_document(key, email)
    except Exception as e:
        current_app.logger.error(f'Problem declining signature of document: {e}')
        return {'error': True, 'message': gettext('Problem declining signature, please try again')}

    try:
        owner_data = current_app.doc_store.get_owner_data(key)
        if not owner_data:
            current_app.logger.error(
                f"Problem sending email about {session['mail']} declining document {key} with no owner data"
            )

        else:
            pending = current_app.doc_store.get_pending_invites(key)
            if len(pending) > 0:
                template = 'declined_by_email'
            else:
                template = 'final_declined_by_email'

            recipients = [f"{owner_data['name']} <{owner_data['email']}>"]
            mail_context = {
                'document_name': owner_data['docname'],
                'invited_name': session['displayName'],
                'invited_email': session['mail'],
            }
            with force_locale('en'):
                subject_en = gettext('%(name)s declined to sign "%(docname)s"') % {
                    'name': owner_data['name'],
                    'docname': owner_data['docname'],
                }
                body_txt_en = render_template(f'{template}.txt.jinja2', **mail_context)
                body_html_en = render_template(f'{template}.html.jinja2', **mail_context)
            with force_locale('sv'):
                subject_sv = gettext('%(name)s declined to sign "%(docname)s"') % {
                    'name': owner_data['name'],
                    'docname': owner_data['docname'],
                }
                body_txt_sv = render_template(f'{template}.txt.jinja2', **mail_context)
                body_html_sv = render_template(f'{template}.html.jinja2', **mail_context)

            sendmail(recipients, subject_en, subject_sv, body_txt_en, body_html_en, body_txt_sv, body_html_sv)

    except Exception as e:
        current_app.logger.error(f'Problem sending email of declination: {e}')

    message = gettext("Success declining signature")

    return {'message': message}
