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
import binascii
import json
import os
import uuid
from base64 import b64decode
from collections import defaultdict
from typing import Any, Dict, List, Tuple, Union

import pkg_resources
import yaml
from flask import Blueprint, abort, current_app, g, make_response, redirect, render_template, request, session, url_for
from flask_babel import force_locale, get_locale, gettext
from werkzeug.wrappers.response import Response

from edusign_webapp.api import Routing
from edusign_webapp.doc_store import DocStore
from edusign_webapp.forms import has_pdf_form, update_pdf_form
from edusign_webapp.marshal import Marshal, UnMarshal, UnMarshalNoCSRF
from edusign_webapp.schemata import (
    BlobSchema,
    ConfigSchema,
    DelegationSchema,
    DocSchema,
    DocumentSchema,
    EditMultiSignSchema,
    EmailsSchema,
    FillFormSchema,
    InvitationsSchema,
    KeySchema,
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
    MissingDisplayName,
    NonWhitelisted,
    add_attributes_to_session,
    get_invitations,
    get_previous_signatures,
    get_previous_signatures_xml,
    is_whitelisted,
    prepare_document,
    pretty_print_any,
    pretty_print_xml,
    sendmail,
    sendmail_bulk,
)

admin_edusign_views = Blueprint('edusign_admin', __name__, url_prefix='/admin', template_folder='templates')

anon_edusign_views = Blueprint('edusign_anon', __name__, url_prefix='', template_folder='templates')

edusign_views = Blueprint('edusign', __name__, url_prefix='/sign', template_folder='templates')

edusign_views2 = Blueprint('edusign2', __name__, url_prefix='/sign2', template_folder='templates')

edusign_api_views = Blueprint('edusign_api', __name__, url_prefix='/api/v1', template_folder='templates')


@admin_edusign_views.route('/cleanup', methods=['POST'])
def cleanup():
    """
    Clean up the stored documents being signed,
    removing those that are older than now - current_app.config.MAX_DOCUMENT_AGE

    :return: the number of documents removed
    """
    keys = current_app.extensions['doc_store'].get_old_documents(current_app.config['MAX_DOCUMENT_AGE'])
    current_app.logger.info(f'Purging old documents form db with keys: {keys}')
    total = len(keys)
    removed = 0
    for key in keys:
        try:
            current_app.extensions['doc_store'].remove_document(key, force=True)
            removed += 1
        except Exception as e:
            current_app.logger.error(f'Problem removing old document {key}: {e}')
            continue

    response = make_response(f"Removed {removed} documents out of {total} scheduled")
    response.mimetype = "text/plain"
    return response


@admin_edusign_views.route('/migrate-to-redis-and-s3', methods=['POST'])
def migrate_to_redis_and_s3():
    """
    Migrate the invitations contents from SQLite & the local fs
    to redis and s3.

    :return: the number of documents migrated
    """
    assert "S3Storage" in current_app.config['STORAGE_CLASS_PATH']
    assert "RedisMD" in current_app.config['DOC_METADATA_CLASS_PATH']

    assert 'LOCAL_STORAGE_BASE_DIR' in current_app.config
    assert 'SQLITE_MD_DB_PATH' in current_app.config

    from edusign_webapp.document.metadata.sqlite import SqliteMD
    from edusign_webapp.document.storage.local import LocalStorage

    sqlite_md = SqliteMD(current_app)
    local_storage = LocalStorage(current_app.config, current_app.logger)

    old_doc_store = DocStore.custom(current_app, local_storage, sqlite_md)

    current_app.logger.info("STARTING MIGRATION TO REDIS AND S3")

    keys = old_doc_store.get_old_documents(0)
    current_app.logger.info(f"Going to migrate {len(keys)} documents")

    migrated_docs = 0
    migrated_invites = 0
    for doc_key in keys:
        current_app.logger.info(f"Migrating document with key {doc_key}")
        old_document = old_doc_store.get_full_document(doc_key)
        if not old_document:
            current_app.logger.info(f"    Document with key {doc_key} not found, skipping")
            continue

        content = old_doc_store.get_document_content(doc_key)
        old_invites = old_doc_store.get_full_invites(doc_key)
        if len(old_invites) == 0:
            current_app.logger.info(f"    Document with key {doc_key} has no invitations, skipping")
            continue

        doc_id = current_app.extensions['doc_store'].add_document_raw(old_document, content)
        migrated_docs += 1
        current_app.logger.info(f"    Document with key {doc_key} added to db and storage")

        current_app.logger.info(f"Going to migrate {len(old_invites)} invites for document with key {doc_key}")
        for invite in old_invites:
            invite['doc_id'] = doc_id
            current_app.extensions['doc_store'].add_invite_raw(invite)
            migrated_invites += 1

    return f'OK, migrated {migrated_docs} documents and {migrated_invites} invitations'


@edusign_views.route('/metrics', methods=['GET'])
def metrics():
    """
    Clean up the stored documents being signed,

    :return: the number of documents removed
    """
    keys = current_app.extensions['doc_store'].get_old_documents(0)
    report = f"Number of documents: {len(keys)}\n"
    weight = 0
    for key in keys:
        weight += current_app.extensions['doc_store'].get_document_size(key)

    report += f"Total bytes: {weight}\n"

    old_keys = current_app.extensions['doc_store'].get_old_documents(current_app.config['MAX_DOCUMENT_AGE'])
    report += f"Number of documents to purge: {len(old_keys)}\n"
    weight = 0
    for key in old_keys:
        weight += current_app.extensions['doc_store'].get_document_size(key)

    report += f"Total bytes to purge: {weight}\n"

    response = make_response(report)
    response.mimetype = "text/plain"
    return response


@anon_edusign_views.route('/metadata.xml', methods=['GET'])
def metadata():
    """
    Serve the SAML2 SP metadata
    """
    context = {
        'entity_id': current_app.config['MD_ENTITY_ID'],
        'entity_categories': current_app.config['MD_ENTITY_CATEGORIES'],
        'display_names': current_app.config['MD_DISPLAY_NAMES'],
        'descriptions': current_app.config['MD_DESCRIPTIONS'],
        'information_urls': current_app.config['MD_INFORMATION_URLS'],
        'privacy_statement_urls': current_app.config['MD_PRIVACY_STATEMENT_URLS'],
        'shibboleth_location': current_app.config['MD_SHIBBOLETH_LOCATION'],
        'domain': current_app.config['SERVER_NAME'],
        'signing_certificate': current_app.config['MD_SIGNING_CERTIFICATE'],
        'encryption_certificate': current_app.config['MD_ENCRYPTION_CERTIFICATE'],
        'service_names': current_app.config['MD_SERVICE_NAMES'],
        'attributes': current_app.config['MD_ATTRIBUTES'],
        'organization_names': current_app.config['MD_ORGANIZATION_NAMES'],
        'organization_display_names': current_app.config['MD_ORGANIZATION_DISPLAY_NAMES'],
        'organization_urls': current_app.config['MD_ORGANIZATION_URLS'],
        'technical_contact_name': current_app.config['MD_TECHNICAL_CONTACT_NAME'],
        'technical_contact_email': current_app.config['MD_TECHNICAL_CONTACT_EMAIL'],
        'administrative_contact_name': current_app.config['MD_ADMINISTRATIVE_CONTACT_NAME'],
        'administrative_contact_email': current_app.config['MD_ADMINISTRATIVE_CONTACT_EMAIL'],
        'support_contact_name': current_app.config['MD_SUPPORT_CONTACT_NAME'],
        'support_contact_email': current_app.config['MD_SUPPORT_CONTACT_EMAIL'],
        'security_contact_name': current_app.config['MD_SECURITY_CONTACT_NAME'],
        'security_contact_email': current_app.config['MD_SECURITY_CONTACT_EMAIL'],
    }
    try:
        xml = render_template('metadata.jinja2', **context)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)

    return Response(xml, mimetype='text/xml')


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
    base_dir = current_app.config['CUSTOMIZATION_DIR']
    md_custom = os.path.join(base_dir, 'md', md_name)
    old_md_custom = os.path.join(base_dir, md_name)
    if os.path.exists(md_custom):
        md_file = md_custom
    elif os.path.exists(old_md_custom):
        md_file = old_md_custom
    else:
        md_file = os.path.join(current_app.config['HERE'], 'md', md_name)

    with open(md_file) as f:
        body = f.read()

    base_url = f"{current_app.config['PREFERRED_URL_SCHEME']}://{current_app.config['SERVER_NAME']}"

    version = pkg_resources.require('edusign-webapp')[0].version

    company_link = current_app.config['COMPANY_LINK']
    context = {
        'body': body,
        'login_initiator': f'{base_url}/Shibboleth.sso/Login?target=/sign',
        'current_lang': current_lang,
        'langs': current_app.config['SUPPORTED_LANGUAGES'],
        'version': version,
        'company_link': company_link,
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
    md_name = f"faq-{current_lang}.md"
    base_dir = current_app.config['CUSTOMIZATION_DIR']
    md_custom = os.path.join(base_dir, 'md', md_name)
    old_md_custom = os.path.join(base_dir, md_name)
    if os.path.exists(md_custom):
        md_file = md_custom
    elif os.path.exists(old_md_custom):
        md_file = old_md_custom
    else:
        md_file = os.path.join(current_app.config['HERE'], 'md', md_name)

    with open(md_file) as f:
        body = f.read()

    version = pkg_resources.require('edusign-webapp')[0].version

    company_link = current_app.config['COMPANY_LINK']
    context = {
        'body': body,
        'current_lang': current_lang,
        'langs': current_app.config['SUPPORTED_LANGUAGES'],
        'version': version,
        'company_link': company_link,
    }

    try:
        return render_template('about.jinja2', **context)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/logout', methods=['GET'])
@edusign_views2.route('/logout', methods=['GET'])
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
@edusign_views2.route('/', methods=['GET'])
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
    company_link = current_app.config['COMPANY_LINK']
    context = {
        'back_link': f"{current_app.config['PREFERRED_URL_SCHEME']}://{current_app.config['SERVER_NAME']}",
        'back_button_text': gettext("Back"),
        'company_link': company_link,
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
    except MissingDisplayName:
        current_app.logger.error('There is some misconfiguration and the IdP does not seem to provide the displayName.')
        context['title'] = gettext("Missing displayName")
        context['message'] = gettext(
            'Your should add your name to your account at your organization. Please contact your IT-support for assistance.'
        )
        return render_template('error-generic.jinja2', **context)
    except NonWhitelisted:
        current_app.logger.debug("Authorizing non-whitelisted user")
        unauthn = True

    if 'invited-unauthn' in session and session['invited-unauthn']:
        invites = get_invitations()
        if len(invites['pending_multisign']) > 0:
            unauthn = True

    session['invited-unauthn'] = unauthn
    current_app.logger.debug("Attributes in session: " + ", ".join([f"{k}: {v}" for k, v in session.items()]))

    bundle_name = 'main-bundle'
    if current_app.config['ENVIRONMENT'] in ('development', 'e2e'):
        bundle_name += '.dev'

    try:
        return render_template('index.jinja2', bundle_name=bundle_name)
    except AttributeError as e:
        current_app.logger.error(f'Template rendering failed: {e}')
        abort(500)


@edusign_views.route('/emails', methods=['GET'])
@edusign_views2.route('/emails', methods=['GET'])
@Marshal(EmailsSchema)
def emails():
    if current_app.config['ENVIRONMENT'] != 'e2e':
        abort(404)

    payload = current_app.extensions['email_msgs']
    current_app.extensions['email_msgs'] = {}
    return {'payload': payload}


def _get_ui_defaults():
    ui_defaults = {
        'send_signed': current_app.config['UI_SEND_SIGNED'],
        'skip_final': current_app.config['UI_SKIP_FINAL'],
        'ordered_invitations': current_app.config['UI_ORDERED_INVITATIONS'],
    }
    form_config_file = current_app.config['CUSTOM_FORMS_DEFAULTS_FILE']
    if os.path.exists(form_config_file):
        config = None
        with open(form_config_file, 'r') as f:
            try:
                config = yaml.safe_load(f)
            except yaml.YAMLError as e:
                current_app.logger.info(f"Cannot read YAML file at {form_config_file}: {e}")

        if config is not None:
            idp = session['idp']
            if idp in config:
                idp_config = config[idp]
                ui_defaults = {
                    'send_signed': idp_config['send_signed'],
                    'skip_final': idp_config['skip_final'],
                    'ordered_invitations': idp_config['ordered_invitations'],
                }
    return ui_defaults


@edusign_views.route('/config', methods=['GET'])
@edusign_views2.route('/config', methods=['GET'])
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
    payload = get_invitations(remove_finished=True)

    if 'eppn' in session and is_whitelisted(current_app, session['eppn']):
        payload['unauthn'] = False
    else:
        payload['unauthn'] = True

    payload['ui_defaults'] = _get_ui_defaults()

    attrs = {
        'eppn': session['eppn'],
        "mail": session["mail"],
        "mail_aliases": session.get("mail_aliases", [session["mail"]]),
        'name': session['displayName'],
    }

    payload['signer_attributes'] = attrs
    payload['multisign_buttons'] = current_app.config['MULTISIGN_BUTTONS']
    payload['max_signatures'] = current_app.config['MAX_SIGNATURES']
    payload['available_loas'] = [
        {'name': gettext('Low'), 'value': 'low'},
        {'name': gettext('Medium'), 'value': 'medium'},
        {'name': gettext('High'), 'value': 'high'},
    ]
    payload['max_file_size'] = current_app.config['MAX_CONTENT_LENGTH']
    payload['company_link'] = current_app.config['COMPANY_LINK']
    payload['edit_form_timeout'] = current_app.config['DOC_LOCK_TIMEOUT'].seconds * 1000
    payload['environment'] = current_app.config['ENVIRONMENT']

    return {
        'payload': payload,
    }


@edusign_views.route('/poll', methods=['GET'])
@edusign_views2.route('/poll', methods=['GET'])
@Marshal(InvitationsSchema)
def poll() -> dict:
    """
    View to serve the invitations data for the front app.

    The front side js app will poll this view when the user has invited others to sign,
    and there are pending signatures, to update the representation of said invitations.

    :return: A dict with the invitation data.
    """
    payload = get_invitations(remove_finished=True)

    return {
        'payload': payload,
    }


@edusign_views.route('/add-doc', methods=['POST'])
@edusign_views2.route('/add-doc', methods=['POST'])
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
    if 'mail' not in session or not is_whitelisted(current_app, session['eppn']):
        return {'error': True, 'message': gettext('Unauthorized')}

    key = str(uuid.uuid4())

    if document['type'] == 'application/pdf':
        prepare_data = prepare_document(document)

        if 'error' in prepare_data and prepare_data['error']:  # XXX update error message, translate
            return prepare_data

        if 'errorCode' in prepare_data:  # XXX update error message, translate
            prepare_data['error'] = True
            return prepare_data

        doc_ref = prepare_data['updatedPdfDocumentReference']
        sign_req = json.dumps(prepare_data['visiblePdfSignatureRequirement'])

        prev_signatures = get_previous_signatures(document)
        has_form = has_pdf_form(document['blob'])
        pprinted = 'not-needed-for-pdf'
    else:
        doc_ref = key
        sign_req = 'not-needed-for-non-pdf'
        prev_signatures = get_previous_signatures_xml(document)
        has_form = False
        pprinted = pretty_print_xml(document['blob'])

    return {
        'payload': {
            'key': key,
            'ref': doc_ref,
            'sign_requirement': sign_req,
            'prev_signatures': prev_signatures,
            'has_form': has_form,
            'pprinted': pprinted,
        }
    }


@edusign_views.route('/create-sign-request', methods=['POST'])
@edusign_views2.route('/create-sign-request', methods=['POST'])
@UnMarshal(ToSignSchema)
@Marshal(SignRequestSchema)
def create_sign_request(documents: dict) -> dict:
    """
    View to send a request to the API to create a sign request.

    This is the first view that is called when the user starts the signature process for some document(s)
    that are already loaded and that do not involve invitations.

    The sign request obtained from the API in this view is sent back to the eduSign js app in the browser,
    which will immediately POST it to the sign service to start the actual signing process.

    The prepared document might have been removed from the API's cache, in which case the front side app will be
    informed so that documents can be re-prepared.

    :param documents: Representation of the documents to include in the sign request,
                      as unmarshaled by the ToSignSchema schema
    :return: A dict with either the relevant information returned by the API,
             or information about some error obtained in the process.
    """
    if 'mail' not in session or not is_whitelisted(current_app, session['eppn']):
        if not session['invited-unauthn']:
            return {'error': True, 'message': gettext('Unauthorized')}

    current_app.logger.debug(f'Data gotten in create view: {documents}')
    try:
        current_app.logger.info(f"Creating signature request for user {session['eppn']}")
        create_data, documents_with_id = current_app.extensions['api_client'].create_sign_request(
            documents['documents']
        )

    except current_app.extensions['api_client'].ExpiredCache:
        current_app.logger.info(
            f"Some document(s) have expired for {session['eppn']} in the API's cache, restarting process..."
        )
        return {'error': True, 'message': 'expired cache'}

    except current_app.extensions['api_client'].UnknownDocType as e:
        current_app.logger.error(f'Problem creating sign request, unsupported doc type: {e}')
        return {
            'error': True,
            'message': gettext('There was an error signing docs: unsupported MIME type.'),
        }

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


def _gather_invited_docs(docs: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    This function in used in the `recreate_sign_request` view.

    Here we gather the document contents for invited documents that the user has sent for signing.
    We check that the concernmed documents are not locked (i.e., being signed by some other user),
    that they exist, and that the user trying to sign the document has actually been invited to do so.

    :param docs: The documents that the user has been invited to sign, and wants to sign
    :return: a list with the documents that had some problem (see what problems we check above),
             and a list of the documents ready to be signed, with contents.
    """
    failed: List[Dict[str, Any]] = []
    invited_docs = []
    for doc in docs:
        current_app.logger.debug(f"Re-preparing invited document {doc['name']}")
        try:
            stored = current_app.extensions['doc_store'].get_invitation(doc['invite_key'])
        except current_app.extensions['doc_store'].DocumentLocked:
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
                % {'docname': doc['name']},
            }
            failed.append(failedDoc)
            continue

        # migration to mail_aliases
        mail_aliases = session.get('mail_aliases', [session['mail']])

        if stored['user']['email'] not in mail_aliases:
            current_app.logger.error(
                f"Trying to sign invitation with wrong emails {mail_aliases} (invited:  {stored['user']['email']})"
            )
            failedDoc = {
                'key': doc['key'],
                'state': 'failed-signing',
                'message': gettext("The email %(email)s invited to sign \"%(docname)s\" does not coincide with yours.")
                % {'email': stored['user']['email'], 'docname': doc['name']},
            }
            failed.append(failedDoc)
            continue

        doc['blob'] = stored['document']['blob']
        invited_docs.append(doc)

    return failed, invited_docs


def _ready_docs(
    docs_data: List[Dict[str, Any]], all_docs: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    This function in used in the `recreate_sign_request` view.

    We receive here the results of sending the documents to prepare at the API, in `docs_data`,
    and the actual documents, in `all_docs`, and we check that there was no problem
    during the preparation of the document.
    For the docs that had no problem, we pick the data we need.

    :param docs_data: results of sending the documents to the prepare endpoint of the API.
    :param all_docs: actual documents that have been sent to prepare.
    :return: a list with the problematic documents,
             and a list of successfully prepared documents, ready to be sent to the create endpoint of the API.
    """
    new_docs = []
    failed = []
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

        doc_name = doc['name']
        doc_type = doc['type']
        doc_key = doc['key']

        if doc_type == 'application/pdf':
            ref = doc_data['updatedPdfDocumentReference']
            sign_req = json.dumps(doc_data['visiblePdfSignatureRequirement'])

        else:
            ref = doc_key
            sign_req = 'not-needed-for-non-pdf'

        new_doc = {
            'name': doc_name,
            'type': doc_type,
            'key': doc_key,
            'ref': ref,
            'sign_requirement': sign_req,
        }
        if 'blob' in doc:
            new_doc['blob'] = doc['blob']

        new_docs.append(new_doc)

    return failed, new_docs


@Routing(
    marshal=ReSignRequestSchema,
    unmarshal=ToRestartSigningSchema,
    web_views=[
        {"blueprint": edusign_views, "route": '/recreate-sign-request', "methods": ["POST"]},
        {"blueprint": edusign_views2, "route": '/recreate-sign-request', "methods": ["POST"]},
    ],
    api_views=[
        {"blueprint": edusign_api_views, "route": '/create-sign-request', "methods": ["POST"]},
    ],
)
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
    if 'mail' not in session or not is_whitelisted(current_app, session['eppn']):
        if not session['invited-unauthn']:
            return {'error': True, 'message': gettext('Unauthorized')}

    current_app.logger.debug(f'Data gotten in recreate view: {documents}')

    async def prepare(doc):
        return prepare_document(doc)

    current_app.logger.info(f"Re-preparing documents for user {session['eppn']}")
    loop = asyncio.new_event_loop()
    tasks = [loop.create_task(prepare(doc)) for doc in documents['documents']['local']]

    for doc in documents['documents']['owned']:
        doc['blob'] = current_app.extensions['doc_store'].get_document_content(doc['key'])
        tasks.append(loop.create_task(prepare(doc)))

    failed, invited_docs = _gather_invited_docs(documents['documents']['invited'])

    for doc in invited_docs:
        doc['blob'] = current_app.extensions['doc_store'].get_document_content(doc['key'])
        tasks.append(loop.create_task(prepare(doc)))

    if len(tasks) > 0:
        loop.run_until_complete(asyncio.wait(tasks))
    loop.close()

    docs_data = [task.result() for task in tasks]
    all_docs = documents['documents']['local'] + documents['documents']['owned'] + invited_docs

    more_failed, new_docs = _ready_docs(docs_data, all_docs)
    failed += more_failed

    if len(new_docs) > 0:
        try:
            current_app.logger.info(f"Re-Creating signature request for user {session['eppn']}")
            create_data, documents_with_id = current_app.extensions['api_client'].create_sign_request(new_docs)

        except current_app.extensions['api_client'].UnknownDocType as e:
            current_app.logger.error(f'Problem creating sign request, unsupported doc type: {e}')
            return {
                'error': True,
                'message': gettext('There was an error signing docs: unsupported MIME type.'),
            }

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
@edusign_views2.route('/callback', methods=['POST', 'GET'])
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
    if current_app.config['ENVIRONMENT'] in ('development', 'e2e'):
        bundle_name += '.dev'

    try:
        sign_response = request.form['EidSignResponse']
        relay_state = request.form['RelayState']

        # validate input data: sign_response must be in base64 which is safe against xss
        # and relay_state is in 4f479e08-47ff-4a4b-9295-c9bd3f80e0f4 form
        # so strip '-' and check if base64
        b64decode(sign_response, validate=True)
        b64decode(relay_state.replace('-', ''), validate=True)

    except KeyError as e:
        current_app.logger.error(f'Missing data in callback request: {e}')
        abort(400)
    except ValueError as e:
        current_app.logger.error(f'Invalid data in callback request: {e}')
        abort(400)
    except binascii.Error as e:
        current_app.logger.error(f'Invalid data in callback request: {e}')
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


@anon_edusign_views.route('/test-api-callback', methods=['POST', 'GET'])
def test_api_sign_service_callback() -> Union[str, Response]:
    """
    This is just to be able to test the API for the nextcloud app,
    it will receive the sign response and just log it,
    so that it can be picked from the logs and used to
    retrieve the signed docs from the API.
    """
    if not current_app.config['DEBUG']:
        abort(404)

    if current_app.config['ENVIRONMENT'] not in ('development', 'e2e'):
        abort(404)

    sign_response = request.form['EidSignResponse']
    current_app.logger.debug(f"Sign response: {sign_response}")

    relay_state = request.form['RelayState']
    current_app.logger.debug(f"Relay state: {relay_state}")

    return 'OK'


def _prepare_signed_by_email(key, owner):
    """
    Prepare emails to send informing the inviter user
    that one invited user (perhaps the last remaining one)
    has signed the document.
    """
    skipfinal = current_app.extensions['doc_store'].get_skipfinal(key)
    pending = current_app.extensions['doc_store'].get_pending_invites(
        key, exclude=session.get('mail_aliases', [session['mail']])
    )
    pending = [p for p in pending if not p['signed'] and not p['declined']]

    if len(pending) > 0:
        template = 'signed_by_email'
    else:
        if skipfinal:
            template = 'final_signed_by_email_skip'
        else:
            template = 'final_signed_by_email'

    mail_context = {
        'document_name': owner['docname'],
        'invited_name': session['displayName'],
        'invited_email': session['mail'],
    }
    lang = owner['lang']
    recipients = [f"{owner['name']} <{owner['email']}>"]
    with force_locale(lang):
        subject = gettext("%(name)s signed '%(docname)s'") % {
            'name': session['displayName'],
            'docname': owner['docname'],
        }
        body_txt = render_template(f'{template}.txt.jinja2', **mail_context)
        body_html = render_template(f'{template}.html.jinja2', **mail_context)

    return (recipients, subject, body_txt, body_html)


def _prepare_all_signed_email(doc, mail_aliases):
    """
    Prepare email to send to all users that have signed the document,
    possibly with the final signed PDF attached.
    This is sent when the inviter user adds the final signature.
    """
    current_lang = str(get_locale())
    recipients = []
    recipients = defaultdict(list)
    recipients[current_lang].append(f"{doc['owner']['name']} <{doc['owner']['email']}>")
    for invited in current_app.extensions['doc_store'].get_pending_invites(doc['key']):
        if not invited['signed'] and invited['email'] not in mail_aliases:
            continue
        lang = invited['lang']
        recipients[lang].append(f"{invited['name']} <{invited['email']}>")

    mail_context = {
        'document_name': doc['owner']['docname'],
    }
    # attach PDF
    if doc['sendsigned']:
        suffix = 'signed'
        doc_name = current_app.extensions['doc_store'].get_document_name(doc['key'])
        if '.' in doc_name:
            splitted = doc_name.split('.')
            ext = splitted[-1]
            prename = '.'.join(splitted[:-1])
            signed_doc_name = f"{prename}-{suffix}.{ext}"
        else:
            signed_doc_name = f"{doc_name}-{suffix}"
        pdf_bytes = b64decode(doc['doc'].get('signedContent', doc['doc'].get('blob')))
        email_kwargs = dict(
            attachment_name=signed_doc_name,
            attachment=pdf_bytes,
        )
    else:
        email_kwargs = {}

    messages = []
    for lang in recipients:
        with force_locale(lang):
            subject = gettext('"%(docname)s" is now signed') % {'docname': doc['owner']['docname']}
            if doc['sendsigned']:
                body_txt = render_template('signed_all_email.txt.jinja2', **mail_context)
                body_html = render_template('signed_all_email.html.jinja2', **mail_context)
            else:
                body_txt = render_template('signed_all_email_no_pdf.txt.jinja2', **mail_context)
                body_html = render_template('signed_all_email_no_pdf.html.jinja2', **mail_context)

        messages.append(((recipients[lang], subject, body_txt, body_html), email_kwargs))

    return messages


def _prepare_signed_documents_data(process_data):
    """
    Prepare signed documents to be sent to the front end app.
    """
    docs = []
    for doc in process_data['signedDocuments']:
        key = doc['id']
        owner = current_app.extensions['doc_store'].get_owner_data(key)
        current_app.logger.debug(f"Post-processing {key} for {owner}")

        # migration to mail_aliases
        mail_aliases = session.get('mail_aliases', [session['mail']])

        if 'email' in owner and owner['email'] not in mail_aliases:
            current_app.extensions['doc_store'].update_document(key, doc['signedContent'], mail_aliases)
            current_app.extensions['doc_store'].unlock_document(key, mail_aliases)

            pending_invites = current_app.extensions['doc_store'].get_pending_invites(key)
            pending = sum([1 for p in pending_invites if not p['signed'] and not p['declined']])
            skipfinal = current_app.extensions['doc_store'].get_skipfinal(key)

            if pending > 0 or not skipfinal:
                docs.append(
                    {'id': key, 'signed_content': doc['signedContent'], 'validated': False, 'type': doc['mimeType']}
                )

        elif owner:
            current_app.extensions['doc_store'].remove_document(key)

    return docs


def _next_ordered_invitation_mail(doc_key, docname, invite, owner):
    lang = invite['lang']
    recipients = [f"{invite['name']} <{invite['email']}>"]
    custom_text = current_app.extensions['doc_store'].get_invitation_text(doc_key)
    invited_link = url_for('edusign.get_index', _external=True)
    mail_context = {
        'document_name': docname,
        'inviter_email': f"{owner['email']}",
        'inviter_name': f"{owner['name']}",
        'invited_link': invited_link,
        'text': custom_text,
    }
    with force_locale(lang):
        subject = gettext('You have been invited to sign "%(document_name)s"') % {'document_name': docname}
        body_txt = render_template('invitation_email.txt.jinja2', **mail_context)
        body_html = render_template('invitation_email.html.jinja2', **mail_context)

    return ((recipients, subject, body_txt, body_html), {})


def _process_signed_documents(process_data):
    emails = []
    to_validate = []
    # migration to mail_aliases
    mail_aliases = session.get('mail_aliases', [session['mail']])
    # Prepare emails to send
    for doc in process_data['signedDocuments']:
        key = doc['id']
        mime_type = doc['mimeType']
        doc['type'] = mime_type
        docname = current_app.extensions['doc_store'].get_document_name(key)
        ordered = current_app.extensions['doc_store'].get_ordered(key)
        owner = current_app.extensions['doc_store'].get_owner_data(key)
        sendsigned = current_app.extensions['doc_store'].get_sendsigned(key)
        pending_invites = current_app.extensions['doc_store'].get_pending_invites(key)
        pending_invites = [p for p in pending_invites if not p['signed'] and not p['declined']]
        pending = len(pending_invites) > 1  # More than 1 since we still have not removed the currently addressed invite
        skipfinal = current_app.extensions['doc_store'].get_skipfinal(key)
        current_app.logger.debug(
            f"Data for emails for signed docs - key: {key}, owner: {owner}, sendsigned: {sendsigned}, pending: {pending}, skipfinal: {skipfinal}, type: {mime_type}"
        )

        # this is an invitation to the current user
        if owner and 'email' in owner and owner['email'] not in mail_aliases:
            # Last person to sign this document
            if not pending and skipfinal:
                current_app.logger.debug(
                    f"Data for final email - key: {key}, owner: {owner}, sendsigned: {sendsigned}, type: {mime_type}"
                )
                to_validate.append(
                    {'key': key, 'owner': owner, 'doc': doc, 'sendsigned': sendsigned, 'type': mime_type}
                )

            else:
                # More people pending to sign the document
                if pending:
                    # Next invitation email to send, if ordered
                    if ordered:
                        # We still haven't removed the invitation currently being addressed,
                        # thus the index 1
                        invite = pending_invites[1]
                        next_invitation_mail = _next_ordered_invitation_mail(key, docname, invite, owner)
                        emails.append(next_invitation_mail)
                try:
                    email_args = _prepare_signed_by_email(key, owner)
                    emails.append((email_args, {}))

                except Exception as e:
                    current_app.logger.error(
                        f"Problem sending signed by {session['mail']} email to {owner['email']}: {e}"
                    )
        # this is an invitation from the current user
        elif owner:
            to_validate.append({'key': key, 'owner': owner, 'doc': doc, 'sendsigned': sendsigned, 'type': mime_type})

        # this is not an invitation
        else:
            to_validate.append({'key': key, 'owner': {}, 'doc': doc, 'sendsigned': False, 'type': mime_type})

    return emails, to_validate


@Routing(
    marshal=SignedDocumentsSchema,
    unmarshal=SigningSchema,
    web_views=[
        {"blueprint": edusign_views, "route": '/get-signed', "methods": ["POST"]},
        {"blueprint": edusign_views2, "route": '/get-signed', "methods": ["POST"]},
    ],
    api_views=[
        {"blueprint": edusign_api_views, "route": '/get-signed', "methods": ["POST"]},
    ],
)
def get_signed_documents(sign_data: dict) -> dict:
    """
    View to get the signed documents from the API.

    This is called from the user agent after the user has completed a signing process,
    to retrieve the signed documents from the backend and hand them to the user.

    :param sign_data: The data needed to identify the signed documents to be retrieved,
                      as obtained from the POST from the signature service to the `sign_service_callback`.
    :return: A dict with the signed documents, or with error information if some error has ocurred.
    """
    try:
        current_app.logger.info(
            f"Processing signature for {sign_data['sign_response'][:50]} for user {session['eppn']}"
        )
        process_data = current_app.extensions['api_client'].process_sign_request(
            sign_data['sign_response'], sign_data['relay_state']
        )

    except Exception as e:
        current_app.logger.error(f'Problem processing sign request: {e}')
        return {
            'error': True,
            'message': gettext('There was an error. Please try again, or contact the site administrator.'),
        }

    if 'errorCode' in process_data:
        current_app.logger.error(f"Problem processing sign request, error code received: {process_data}")
        message = process_data['message']
        if message == "Requested LoA does not match the Assertion LoA":
            return {
                'error': True,
                'message': gettext("Could not provide the requested level of assurance."),
            }
        elif message == "Missing attributes in assertion":  # XXX use correct string
            return {
                'error': True,
                'message': gettext("Could not provide the requested level of assurance."),
            }
        # XXX translate
        return {'error': True, 'message': message}

    emails, to_validate = _process_signed_documents(process_data)

    validated = current_app.extensions['api_client'].validate_signatures(to_validate)

    mail_aliases = session.get('mail_aliases', [session['mail']])
    docs = []
    for doc in validated:
        owner = doc['owner']
        if owner:
            try:
                messages = _prepare_all_signed_email(doc, mail_aliases)
                emails.extend(messages)
            except Exception as e:
                current_app.logger.error(
                    f"Problem sending signed by all email to all invited for doc '{owner['docname']}': {e}"
                )

        docs.append(
            {
                'id': doc['key'],
                'signed_content': doc['doc']['signedContent'],
                'validated': doc['validated'],
                'type': doc['type'],
            }
        )

    if len(emails) > 0:
        sendmail_bulk(emails)

    prepared_data = _prepare_signed_documents_data(process_data)
    docs.extend(prepared_data)

    doc_names = []

    for doc in docs:
        doc['pprinted'] = pretty_print_any(doc['signed_content'], doc['type'])
        doc_names.append(doc["name"])

    current_app.logger.info(
        f"Handing over signed documents to {session['eppn']}: {', '.join(doc_names)}"
    )
    return {
        'payload': {'documents': docs},
    }


@edusign_views.route('/create-multi-sign', methods=['POST'])
@edusign_views2.route('/create-multi-sign', methods=['POST'])
@UnMarshal(MultiSignSchema)
@Marshal()
def create_multi_sign_request(data: dict) -> dict:
    """
    View to create and send invitations for collectively signing a document.
    This view receives the document (content and metadata) that is the subject of the invitation,
    and stores it backend side. It then sends an email to each of the invitees, urging them to
    sign the invitation, and providing a link to do so.
    If there is an error sending the invitation emails, the document is removed from the backend db
    and the user (inviter) is informed about the failure.

    :param data: The document to sign, the owner of the document,
                 and the emails of the users invited to sign the doc.
    :return: A message about the result of the procedure
    """
    if 'mail' not in session or not is_whitelisted(current_app, session['eppn']):
        return {'error': True, 'message': gettext('Unauthorized')}

    # migration to mail_aliases
    mail_aliases = session.get('mail_aliases', [session['mail']])

    if data['owner'] not in mail_aliases:
        current_app.logger.error(f"User {session['mail']} is trying to create an invitation as {data['owner']}")
        return {'error': True, 'message': gettext("You cannot invite as %(owner)s") % {'owner': data['owner']}}

    for invite in data['invites']:
        invite['email'] = invite['email'].lower()

    try:
        current_app.logger.info(f"Creating multi signature request for user {session['eppn']}")
        owner = {
            'name': session['displayName'],
            'email': data['owner'],
            'eppn': session['eppn'],
            'lang': str(get_locale()),
        }
        current_app.logger.debug(f"Adding document with required loa {data['loa']}")
        invites = current_app.extensions['doc_store'].add_document(
            data['document'],
            owner,
            data['invites'],
            data['sendsigned'],
            data['loa'],
            data['skipfinal'],
            data['ordered'],
            data['text'],
        )

    except Exception as e:
        current_app.logger.error(f'Problem processing multi sign request: {e}')
        return {'error': True, 'message': gettext('Problem creating invitation to sign, please try again')}

    ordered = data['ordered']

    if len(invites) > 0:
        recipients = defaultdict(list)
        if ordered:
            invite = invites[0]
            lang = invite['lang']
            recipients[lang].append(f"{invite['name']} <{invite['email']}>")
        else:
            for invite in invites:
                lang = invite['lang']
                recipients[lang].append(f"{invite['name']} <{invite['email']}>")

        docname = data['document']['name']
        custom_text = data['text']
        try:
            _send_invitation_mail(docname, owner, custom_text, recipients)

        except Exception:
            current_app.extensions['doc_store'].remove_document(uuid.UUID(data['document']['key']), force=True)
            return {'error': True, 'message': gettext('There was a problem and the invitation email(s) were not sent')}

    message = gettext("Success sending invitations to sign")

    return {'message': message}


def _send_invitation_mail(docname, owner, custom_text, recipients):
    invited_link = url_for('edusign.get_index', _external=True)
    try:
        mail_context = {
            'document_name': docname,
            'inviter_email': f"{owner['email']}",
            'inviter_name': f"{owner['name']}",
            'invited_link': invited_link,
            'text': custom_text,
        }
        messages = []
        for lang in recipients:
            with force_locale(lang):
                subject = gettext('You have been invited to sign "%(document_name)s"') % {'document_name': docname}
                body_txt = render_template('invitation_email.txt.jinja2', **mail_context)
                body_html = render_template('invitation_email.html.jinja2', **mail_context)

                messages.append(((recipients[lang], subject, body_txt, body_html), {}))

        sendmail_bulk(messages)

    except Exception as e:
        current_app.logger.error(f'Problem sending invitation email: {e}: {type(e)}')
        raise


@edusign_views.route('/send-multisign-reminder', methods=['POST'])
@edusign_views2.route('/send-multisign-reminder', methods=['POST'])
@UnMarshal(ResendMultiSignSchema)
@Marshal()
def send_multisign_reminder(data: dict) -> dict:
    """
    Send emails to remind people to sign some invitation.
    This view receives a uuid key identifying the invitation,
    retrieves said invitation from the backend db, and sends a reminder email
    to each of the invitees that are still pending to sign.

    :param data: The key of the document pending signatures
    :return: A message about the result of the procedure
    """
    try:
        pending = current_app.extensions['doc_store'].get_pending_invites(uuid.UUID(data['key']))
        docname = current_app.extensions['doc_store'].get_document_name(uuid.UUID(data['key']))
        owner_email = current_app.extensions['doc_store'].get_document_email(uuid.UUID(data['key']))
        ordered = current_app.extensions['doc_store'].get_ordered(uuid.UUID(data['key']))

    except Exception as e:
        current_app.logger.error(f'Problem finding users pending to multi sign: {e}')
        return {'error': True, 'message': gettext('Problem finding the users pending to multi sign')}

    if not pending:
        current_app.logger.error(f"Could not find users pending signing the multi sign request {data['key']}")
        return {'error': True, 'message': gettext('Problem finding the users pending to sign')}

    if not docname:
        current_app.logger.error(f"Could not find document {data['key']} pending signing the multi sign request")
        return {'error': True, 'message': gettext('Could not find the document')}

    recipients = defaultdict(list)
    invites = [i for i in pending if not i['signed'] and not i['declined']]
    invites.sort(key=lambda i: i['order'])
    if ordered:
        invite = invites[0]
        lang = invite['lang']
        recipient = f"{invite['name']} <{invite['email']}>"
        recipients[lang].append(recipient)
    else:
        for invite in invites:
            lang = invite['lang']
            recipient = f"{invite['name']} <{invite['email']}>"
            recipients[lang].append(recipient)

    if len(recipients) > 0:
        try:
            invited_link = url_for('edusign.get_index', _external=True)
            mail_context = {
                'document_name': docname,
                'inviter_email': owner_email,
                'inviter_name': f"{session['displayName']}",
                'invited_link': invited_link,
                'text': 'text' in data and data['text'] or "",
            }
            messages: List[tuple] = []
            for lang in recipients:
                with force_locale(lang):
                    subject = gettext("A reminder to sign '%(document_name)s'") % {'document_name': docname}
                    body_txt = render_template('reminder_email.txt.jinja2', **mail_context)
                    body_html = render_template('reminder_email.html.jinja2', **mail_context)

                    messages.append(((recipients[lang], subject, body_txt, body_html), {}))

            sendmail_bulk(messages)

        except Exception as e:
            current_app.logger.error(f'Problem sending reminder email: {e}')
            return {'error': True, 'message': gettext('Problem sending the email, please try again')}

    message = gettext("Success sending reminder email to pending users")

    return {'message': message}


@edusign_views.route('/edit-multi-sign', methods=['POST'])
@edusign_views2.route('/edit-multi-sign', methods=['POST'])
@UnMarshal(EditMultiSignSchema)
@Marshal()
def edit_multi_sign_request(data: dict) -> dict:
    """
    View to edit an invitation for collectively signing a document.
    This view receives a uuid key identifying an invitation,
    and the new list of invitees, and updates the db with them.

    :param data: The key of the document to remove and the new list of invitees
    :return: A message about the result of the procedure
    """
    key = uuid.UUID(data['key'])
    docname = current_app.extensions['doc_store'].get_document_name(key)
    ordered = current_app.extensions['doc_store'].get_ordered(key)
    owner = current_app.extensions['doc_store'].get_owner_data(key)
    owner_email = owner['email']
    text = data['text']
    sendsigned = data['sendsigned']
    skipfinal = data['skipfinal']
    mail_aliases = session["mail_aliases"]

    current_app.extensions['doc_store'].unlock_document(key, mail_aliases)

    orig_invites = current_app.extensions['doc_store'].get_pending_invites(key)
    orig_pending = [i for i in orig_invites if not i['signed'] and not i['declined']]
    current_pending = data['invites']
    for invite in current_pending:
        invite['email'] = invite['email'].lower()

    try:
        current_app.extensions['doc_store'].set_sendsigned(key, sendsigned)
        current_app.extensions['doc_store'].set_skipfinal(key, skipfinal)
        changed = current_app.extensions['doc_store'].update_invitations(key, orig_pending, current_pending)
        message = gettext("Success editing invitation to sign '%(docname)s'") % {'docname': docname}
    except Exception as e:
        current_app.logger.error(f"Problem editing the invitations for {key}: {e}")
        return {'error': True, 'message': gettext('Problem editing the invitations')}

    if ordered:
        if len(current_pending) == 0:
            current_next_invite = None
            current_next_recipient = ''
        else:
            current_next_invite = current_pending[0]
            current_next_recipient = f"{current_next_invite['name']} <{current_next_invite['email']}>"

        orig_next_invite = orig_pending[0]
        orig_next_recipient = f"{orig_next_invite['name']} <{orig_next_invite['email']}>"

        if orig_next_recipient != current_next_recipient:
            recipient = {orig_next_invite['lang']: [orig_next_recipient]}
            sent = _send_cancellation_mail(docname, owner_email, recipient)
            if not sent:
                message = gettext("Some users may not have been notified of the changes for '%(docname)s'") % {
                    'docname': docname
                }
            if current_next_invite is not None:
                recipient = {current_next_invite['lang']: [current_next_recipient]}
                try:
                    _send_invitation_mail(docname, owner, text, recipient)
                except Exception:
                    message = gettext("Some users may not have been notified of the changes for '%(docname)s'") % {
                        'docname': docname
                    }
            else:
                if skipfinal:
                    try:
                        doc = current_app.extensions['doc_store'].get_signed_document(key)
                        messages = _prepare_all_signed_email(doc, mail_aliases)
                        sendmail_bulk(messages)
                    except Exception:
                        message = gettext("Some users may not have been notified of the changes for '%(docname)s'") % {
                            'docname': docname
                        }

    else:
        recipients_removed = defaultdict(list)
        recipients_added = defaultdict(list)

        for invite in changed['added']:
            lang = invite['lang']
            recipient = f"{invite['name']} <{invite['email']}>"
            recipients_added[lang].append(recipient)

        for invite in changed['removed']:
            lang = invite['lang']
            recipient = f"{invite['name']} <{invite['email']}>"
            recipients_removed[lang].append(recipient)

        if len(recipients_added) > 0:
            try:
                _send_invitation_mail(docname, owner, text, recipients_added)
            except Exception:
                message = gettext("Some users may not have been notified of the changes for '%(docname)s'") % {
                    'docname': docname
                }

        if len(recipients_removed) > 0:
            sent = _send_cancellation_mail(docname, owner_email, recipients_removed)
            if not sent:
                message = gettext("Some users may not have been notified of the changes for '%(docname)s'") % {
                    'docname': docname
                }

        if len(current_pending) == 0:
            if skipfinal:
                try:
                    doc = current_app.extensions['doc_store'].get_signed_document(key)
                    messages = _prepare_all_signed_email(doc, mail_aliases)
                    sendmail_bulk(messages)
                except Exception:
                    message = gettext("Some users may not have been notified of the changes for '%(docname)s'") % {
                        'docname': docname
                    }

    return {'message': message}


@edusign_views.route('/remove-multi-sign', methods=['POST'])
@edusign_views2.route('/remove-multi-sign', methods=['POST'])
@UnMarshal(KeySchema)
@Marshal()
def remove_multi_sign_request(data: dict) -> dict:
    """
    View to remove an invitation for collectively signing a document.
    This view receives a uuid key identifying an invitation,
    and removes all traces of it from the backend db.

    :param data: The key of the document to remove
    :return: A message about the result of the procedure
    """
    key = uuid.UUID(data['key'])
    try:
        pending = current_app.extensions['doc_store'].get_pending_invites(key)
        docname = current_app.extensions['doc_store'].get_document_name(key)
        owner_email = current_app.extensions['doc_store'].get_document_email(key)
        ordered = current_app.extensions['doc_store'].get_ordered(key)
    except Exception as e:
        current_app.logger.error(f'Problem getting info about document {key}: {e}')
        pending = []
        docname = ''
        owner_email = session['mail']
        ordered = False

    try:
        removed = current_app.extensions['doc_store'].remove_document(key, force=True)

    except Exception as e:
        current_app.logger.error(f'Problem removing multi sign request: {e}')
        return {'error': True, 'message': gettext('Problem removing the invitation, please try again')}

    if not removed:
        current_app.logger.error(f'Could not remove the multi sign request corresponding to data: {data}')
        return {'error': True, 'message': gettext('Problem removing the invitation, please try again')}

    recipients = defaultdict(list)
    if not ordered:
        for invite in pending:
            if invite['signed'] or invite['declined']:
                continue
            lang = invite['lang']
            recipients[lang].append(f"{invite['name']} <{invite['email']}>")
    else:
        npending = sum([1 for i in pending if not i['signed'] and not i['declined']])
        if npending > 0:
            invite = pending[len(pending) - npending]
            lang = invite['lang']
            recipients[lang].append(f"{invite['name']} <{invite['email']}>")

    message = gettext("Success removing invitation to sign")
    current_app.logger.info(f"Success removing invitation to sign for document {docname}")

    if len(recipients) > 0:
        sent = _send_cancellation_mail(docname, owner_email, recipients)
        if not sent:
            message = gettext("Some users may have not been informed of the cancellation")

    return {'message': message}


def _send_cancellation_mail(docname, owner_email, recipients):
    try:
        mail_context = {
            'document_name': docname,
            'inviter_email': owner_email,
            'inviter_name': f"{session['displayName']}",
        }
        messages = []
        for lang in recipients:
            with force_locale(lang):
                subject = gettext("Cancellation of invitation to sign '%(document_name)s'") % {'document_name': docname}
                body_txt = render_template('cancellation_email.txt.jinja2', **mail_context)
                body_html = render_template('cancellation_email.html.jinja2', **mail_context)

                messages.append(((recipients[lang], subject, body_txt, body_html), {}))

        sendmail_bulk(messages)

    except Exception as e:
        current_app.logger.error(f'Problem sending cancellation email: {e}')
        return False

    return True


@edusign_views.route('/get-partially-signed', methods=['POST'])
@edusign_views2.route('/get-partially-signed', methods=['POST'])
@UnMarshal(KeySchema)
@Marshal(BlobSchema)
def get_partially_signed_doc(data: dict) -> dict:
    """
    View to get the contents of an invited document that is only partially signed,
    this is, not all invitees have signed it.
    This is called from the front app to show a preview of the document to sign
    to the user.

    :param data: The key of the document to get
    :return: A message about the result of the procedure
    """
    key = uuid.UUID(data['key'])
    try:
        doc = current_app.extensions['doc_store'].get_document_content(key)
        doctype = current_app.extensions['doc_store'].get_document_type(key)

    except Exception as e:
        current_app.logger.error(f'Problem getting multi sign document: {e}')
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    if not doc:
        current_app.logger.error(f"Problem getting multisigned document with key : {data['key']}")
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    pprinted = pretty_print_any(doc, doctype)

    return {'message': 'Success', 'payload': {'blob': doc, 'pprinted': pprinted}}


def _prepare_final_email_skipped(doc, key, sendsigned):
    owner = current_app.extensions['doc_store'].get_owner_data(key)
    recipients = defaultdict(list)
    recipients[owner['lang']].append(f"{owner['name']} <{owner['email']}>")
    for invited in current_app.extensions['doc_store'].get_pending_invites(key):
        if not invited['signed']:
            continue
        lang = invited['lang']
        recipients[lang].append(f"{invited['name']} <{invited['email']}>")

    mail_context = {
        'document_name': doc['doc']['name'],
    }
    # attach PDF
    if sendsigned:
        doc_name = current_app.extensions['doc_store'].get_document_name(key)
        if '.' in doc_name:
            splitted = doc_name.split('.')
            ext = splitted[-1]
            prename = '.'.join(splitted[:-1])
            signed_doc_name = f"{prename}-signed.{ext}"
        else:
            signed_doc_name = doc_name + '-signed'
        pdf_bytes = b64decode(doc['doc']['signedContent'], validate=True)

        kwargs = dict(
            attachment_name=signed_doc_name,
            attachment=pdf_bytes,
        )
    else:
        kwargs = {}

    messages = []
    for lang in recipients:
        with force_locale(lang):
            subject = gettext('"%(docname)s" is now signed') % {'docname': doc['doc']['name']}
            if sendsigned:
                body_txt = render_template('signed_all_email.txt.jinja2', **mail_context)
                body_html = render_template('signed_all_email.html.jinja2', **mail_context)
            else:
                body_txt = render_template('signed_all_email_no_pdf.txt.jinja2', **mail_context)
                body_html = render_template('signed_all_email_no_pdf.html.jinja2', **mail_context)

        messages.append(((recipients[lang], subject, body_txt, body_html), kwargs))

    return messages


@edusign_views.route('/skip-final-signature', methods=['POST'])
@edusign_views2.route('/skip-final-signature', methods=['POST'])
@UnMarshal(KeySchema)
@Marshal(SignedDocumentsSchema)
def skip_final_signature(data: dict) -> dict:
    """
    View to skip adding a final signature to an invitation, by the inviter.
    After all invitees have signed an invited document, the inviter can add a final signature,
    or not. If they choose not to, the front side app will call this view, sending an uuid
    identifying the invitation.
    This will finish the multi signature process: The signed contents of the document
    will be sent back to the front side app to be handed to the user, and also, by email,
    to all invitees that have signed it. It will then be removed from the backend db.
    """

    key = uuid.UUID(data['key'])
    try:
        doc = current_app.extensions['doc_store'].get_signed_document(key)
        sendsigned = current_app.extensions['doc_store'].get_sendsigned(key)
        doctype = current_app.extensions['doc_store'].get_document_type(key)

    except Exception as e:
        current_app.logger.error(f'Problem getting signed document: {e}')
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    if not doc:
        current_app.logger.error(f"Problem getting multisigned document with key : {data['key']}")
        return {'error': True, 'message': gettext('Cannot find the document being signed')}

    validated = current_app.extensions['api_client'].validate_signatures(
        [{'key': key, 'owner': 'dummy', 'doc': doc, 'sendsigned': sendsigned}]
    )
    newdoc = validated[0]

    try:
        messages = _prepare_final_email_skipped(newdoc, key, sendsigned)
        sendmail_bulk(messages)

    except Exception as e:
        current_app.logger.error(f'Problem sending signed document to invited users: {e}')

    try:
        current_app.extensions['doc_store'].remove_document(key)

    except Exception as e:
        current_app.logger.warning(f'Problem removing doc skipping final signature: {e}')

    validated = current_app.extensions['api_client'].validate_signatures(
        [{'key': key, 'owner': 'dummy', 'doc': doc, 'sendsigned': sendsigned}]
    )
    newdoc = validated[0]
    signed_content = newdoc['doc'].get('signedContent', newdoc['doc']['blob'])

    pprinted = pretty_print_any(signed_content, doctype)

    return {
        'message': 'Success',
        'payload': {
            'documents': [
                {
                    'id': newdoc['key'],
                    'signed_content': signed_content,
                    'validated': newdoc['validated'],
                    'pprinted': pprinted,
                }
            ]
        },
    }


def _prepare_declined_emails(key, owner_data):
    """
    Prepare email to inviter user informing about an invited user
    that has declined to sign the document.
    """
    docname = owner_data['docname']
    ordered = current_app.extensions['doc_store'].get_ordered(key)
    pending_invites = current_app.extensions['doc_store'].get_pending_invites(key)
    pending = sum([1 for i in pending_invites if not i['signed'] and not i['declined']])
    mail_aliases = session.get('mail_aliases', [session['mail']])

    skipfinal = current_app.extensions['doc_store'].get_skipfinal(key)
    pending_invites = current_app.extensions['doc_store'].get_pending_invites(key, exclude=mail_aliases)
    pending = [p for p in pending_invites if not p['signed'] and not p['declined']]
    if len(pending) > 0:
        template = 'declined_by_email'
    else:
        if skipfinal:
            template = 'final_declined_by_email_skip'
        else:
            template = 'final_declined_by_email'

    recipients = [f"{owner_data['name']} <{owner_data['email']}>"]
    mail_context = {
        'document_name': docname,
        'invited_name': session['displayName'],
        'invited_email': session['mail'],
    }
    with force_locale(owner_data['lang']):
        subject = gettext("%(name)s declined to sign '%(docname)s'") % {
            'name': session['displayName'],
            'docname': owner_data['docname'],
        }
        body_txt = render_template(f'{template}.txt.jinja2', **mail_context)
        body_html = render_template(f'{template}.html.jinja2', **mail_context)

    emails = [((recipients, subject, body_txt, body_html), {})]

    if len(pending) == 0 and skipfinal:
        try:
            doc = current_app.extensions['doc_store'].get_signed_document(key)
            sendsigned = current_app.extensions['doc_store'].get_sendsigned(key)

        except Exception as e:
            current_app.logger.error(f'Problem getting signed document: {e}')
            return {'error': True, 'message': gettext('Cannot find the document being signed')}

        validated = current_app.extensions['api_client'].validate_signatures(
            [{'key': key, 'owner': 'dummy', 'doc': doc, 'sendsigned': sendsigned}]
        )
        newdoc = validated[0]

        try:
            emails_more = _prepare_final_email_skipped(newdoc, key, sendsigned)
            emails.extend(emails_more)

        except Exception as e:
            current_app.logger.error(f'Problem preparing declined signed by all document to invited users: {e}')

    if len(pending) > 0 and ordered:
        invite = pending_invites[0]
        next_invitation_mail = _next_ordered_invitation_mail(key, docname, invite, owner_data)
        emails.append(next_invitation_mail)

    return emails


@edusign_views.route('/decline-invitation', methods=['POST'])
@edusign_views2.route('/decline-invitation', methods=['POST'])
@UnMarshal(KeySchema)
@Marshal()
def decline_invitation(data):
    """
    view to skip adding an invited signeture to a document.
    When a user is invited to sign a document, they can either sign it, or decline signing it.
    If they decline, the front side app calls this view, with the uuid identifying the invitation.
    This view will mark the invitation regarding this particualr user as declined, and will send
    an email to the inviter user informing them of the event.
    """

    key = uuid.UUID(data['key'])
    # migration to mail_aliases
    mail_aliases = session.get('mail_aliases', [session['mail']])

    try:
        current_app.extensions['doc_store'].decline_document(key, mail_aliases)
    except Exception as e:
        current_app.logger.error(f'Problem declining signature of document: {e}')
        return {'error': True, 'message': gettext('Problem declining signature, please try again')}

    try:
        owner_data = current_app.extensions['doc_store'].get_owner_data(key)

        if not owner_data:
            current_app.logger.error(
                f"Problem sending email about {session['mail']} declining document {key} with no owner data"
            )

        else:
            emails = _prepare_declined_emails(key, owner_data)

            if len(emails) > 0:
                sendmail_bulk(emails)

    except Exception as e:
        current_app.logger.error(f'Problem sending email of declination: {e}')

    message = gettext("Success declining signature")

    return {'message': message}


def _prepare_delegation_email(owner_data, name, email, lang):
    """
    Prepare email to inform some user that a user invited to sign a document
    has delegeted the responsibility to them.
    """
    recipients = [f"{name} <{email}>"]
    mail_context = {
        'document_name': owner_data['docname'],
        'delegater_name': session['displayName'],
        'delegater_email': session['mail'],
        'owner_name': owner_data['name'],
        'owner_email': owner_data['email'],
    }
    with force_locale(lang):
        subject = gettext('%(name)s has delegated signature of "%(docname)s" to you') % {
            'name': owner_data['name'],
            'docname': owner_data['docname'],
        }
        body_txt = render_template('delegation_email.txt.jinja2', **mail_context)
        body_html = render_template('delegation_email.html.jinja2', **mail_context)

    return (recipients, subject, body_txt, body_html)


@edusign_views.route('/delegate-invitation', methods=['POST'])
@edusign_views2.route('/delegate-invitation', methods=['POST'])
@UnMarshal(DelegationSchema)
@Marshal()
def delegate_invitation(data):
    """
    View to delegate an invitation to someone other.
    When a user receives an invitation to sign a document,
    after reviewing the contents of the document, they are offered the
    possibility to, rather than sign the document themselves,
    delegate the invitation to someone else, so that it is this someone else
    who signs the document.
    """

    invite_key = uuid.UUID(data['invite_key'])
    document_key = uuid.UUID(data['document_key'])
    name = data['name']
    email = data['email']
    lang = data['lang']
    try:
        current_app.extensions['doc_store'].delegate(invite_key, document_key, name, email, lang)

    except Exception as e:
        current_app.logger.error(f'Problem delegating invitation: {e}')
        return {'error': True, 'message': gettext('There was a problem delegating the invitation')}
    try:
        owner_data = current_app.extensions['doc_store'].get_owner_data(document_key)
        if not owner_data:
            current_app.logger.error(
                f"Problem sending email about {session['mail']} delegating signature of document {document_key} with no owner data"
            )

        else:
            args = _prepare_delegation_email(owner_data, name, email, lang)
            sendmail(*args)

    except Exception as e:
        current_app.logger.error(f'Problem sending email of delegation: {e}')

    message = gettext("Success delegating signature")

    return {'message': message}


@edusign_views.route('/update-form', methods=['POST'])
@edusign_views2.route('/update-form', methods=['POST'])
@UnMarshal(FillFormSchema)
@Marshal(DocSchema)
def update_form(data):
    pdf = data['document']
    fields = data['form_fields']
    try:
        updated = update_pdf_form(pdf, fields)
    except Exception as e:
        current_app.logger.error(f"Problem filling in form in PDF: {e}")
        return {'error': True, 'message': gettext('Problem filling in form in PDF, please try again')}

    return {'message': 'Success', 'payload': {'document': updated}}


@edusign_views.route('/lock-doc', methods=['POST'])
@edusign_views2.route('/lock-doc', methods=['POST'])
@UnMarshal(KeySchema)
@Marshal()
def lock_document(data):
    key = data['key']
    email = session["mail"]
    locked = current_app.extensions['doc_store'].lock_document(key, email)

    if not locked:
        message = gettext('The document is being signed by an invitee, please try again in a few minutes')
        return {'error': True, 'message': message}

    message = gettext("Success locking document")

    return {'message': message}


@edusign_views.route('/unlock-doc', methods=['POST'])
@edusign_views2.route('/unlock-doc', methods=['POST'])
@UnMarshal(KeySchema)
@Marshal()
def unlock_document(data):
    key = data['key']
    emails = session["mail_aliases"]
    unlocked = current_app.extensions['doc_store'].unlock_document(key, emails)

    if not unlocked:
        message = gettext('There was a problem unlocking the document')
        return {'error': True, 'message': message}

    message = gettext("Success unlocking document")

    return {'message': message}
