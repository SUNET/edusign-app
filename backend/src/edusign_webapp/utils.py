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
import io
import uuid
from base64 import b64decode
from xml.etree import cElementTree as ET

from flask import current_app, request, session
from flask_babel import force_locale, get_locale, gettext
from flask_mail import Message
from pyhanko.pdf_utils.reader import PdfFileReader, PdfReadError


def add_attributes_to_session(check_whitelisted=True):
    """
    If the Flask session does not contain information identifying the user,
    this function will grab it from the HTTP headers, where it has been put by the
    Shibboleth SP app, and add them to the session.
    The particular info that is grabbed from the headers can be configured in 2 variables:
    * SESSION_ATTRIBUTES: this is a list of attributes that will just be added to the session
    * SIGNER_ATTRIBUTES: attributes that will be added to the session, and will be used for signing.
    Shibboleth is configured to pass the attributes in the headers as XML snippets (to avoid encoding issues),
    so here we extract the value with ElementTree.
    Shibboleth also has to be configured to pass the organization name (corresponding to the IdP
    chosen by the user) as a header.
    If the parameter `check_whitelisted` is True, this function will check whether the identity
    extracted from the headers is whitelisted to initiate signing procedures, and in case it's not,
    will raise a ValueError.
    :param check_whitelisted: whether to check if the user is whitelisted.
    :type check_whitelisted: bool
    """
    if 'eppn' not in session:
        eppn = request.headers.get('Edupersonprincipalname')
        current_app.logger.info(f'User {eppn} started a session')

        attrs = [(attr, attr.lower().capitalize()) for attr in current_app.config['SESSION_ATTRIBUTES'].values()]
        more_attrs = [(attr, attr.lower().capitalize()) for attr in current_app.config['SIGNER_ATTRIBUTES'].values()]
        for attr in more_attrs:
            if attr not in attrs:
                attrs.append(attr)

        for attr_in_session, attr_in_header in attrs:
            current_app.logger.debug(
                f'Getting attribute {attr_in_header} from request: {request.headers[attr_in_header]}'
            )
            session[attr_in_session] = ET.fromstring(b64decode(request.headers[attr_in_header])).text
            if attr_in_session == 'mail':
                session[attr_in_session] = session[attr_in_session].lower()

        session['eppn'] = eppn
        session['idp'] = request.headers.get('Shib-Identity-Provider')
        session['authn_method'] = request.headers.get('Shib-Authentication-Method')
        session['authn_context'] = request.headers.get('Shib-Authncontext-Class')

        session['organizationName'] = None
        orgName = request.headers.get('Md-Organizationname', None)
        if orgName is not None:
            session['organizationName'] = orgName.encode('latin1').decode('utf8')

        current_app.logger.debug(f'Headers sent by Shibboleth SP {request.headers}')

        if check_whitelisted:
            if not current_app.is_whitelisted(eppn):
                current_app.logger.info(f"Rejecting user with {eppn} address")
                raise ValueError('Unauthorized user')


def prepare_document(document: dict) -> dict:
    """
    Send documents to the eduSign API to be prepared for signing.

    This just uses the API client to send the request, and return error information in case
    of problems.

    :param document: a dict with metadata and contents of the document to be prepared.
    :return: a dict with the reponse obtained from the API, or with an error message.
    """
    try:
        current_app.logger.info(f"Sending document {document['name']} for preparation for user {session['eppn']}")
        return current_app.api_client.prepare_document(document)

    except Exception as e:
        current_app.logger.error(f'Problem preparing document: {e}')
        return {
            'error': True,
            'message': gettext('There was an error. Please try again, or contact the site administrator.'),
        }


def get_invitations():
    """
    Function that will retrieve from the db all invitations concerning the user in the current session.
    This is called from the `get_config` and `poll` views, and the results are sent to the client side app
    so it can show invitation information to the user.
    The dict returned from this function will contain 3 keys:
    * owned_multisign, with information about invitations made by the user;
    * pending_multisign, with information about invitations made to the user;
    * poll, a boolean that indicates whether the front side app should continue
      polling the backend (this is, only when there are users pending to sign
      any of the invitations).
    """
    owned = current_app.doc_store.get_owned_documents(session['mail'])
    invited = current_app.doc_store.get_pending_documents(session['mail'])
    poll = False
    for docs in (owned, invited):
        for doc in docs:
            if len(doc['pending']) > 0:
                poll = True
                break

    return {
        'owned_multisign': owned,
        'pending_multisign': invited,
        'poll': poll,
    }


def get_previous_signatures(document: dict) -> str:
    """
    This function receives a document as a dict containing the metadata and the content,
    and analyses the content to determine whether it contains any signatures made before
    it was lodaded to eduSign.
    This will only detect some kinds of PDF signatures, among which are those made by
    the eduSign service.
    :param document: document to inspect for signatures
    :type document: dict
    :return: a string with info on the previous signatures, or empty when there where none.
    """
    content = document['blob']
    if "," in content:
        content = content.split(",")[1]

    bytes = b64decode(content, validate=True)
    pdf = io.BytesIO(bytes)
    try:
        reader = PdfFileReader(pdf)
    except PdfReadError:
        return "pdf read error"
    sigs = []
    try:
        for sig in reader.embedded_regular_signatures:
            sigs.append(sig.signer_cert.subject.human_friendly)
        return "|".join(sigs)
    except Exception as e:
        current_app.logger.error(f'Problem reading previous signatures: {e}')
        return ""


def sendmail(
    recipients: list,
    subject_en: str,
    subject_sv: str,
    body_txt_en: str,
    body_html_en: str,
    body_txt_sv: str,
    body_html_sv: str,
    attachment_name: str = '',
    attachment: str = '',
):
    """
    Compose a mail message, with subject and body in both Swedish and English,
    and with the body in both plain text and html,
    and send it using the mailer configured in the current app.

    :param recipients: list of recipients of the email
    :param subject_en: subject in English
    :param subject_sv: subject in Swedish
    :param body_txt_en: plain text body in English
    :param body_html_en: html body in English
    :param body_txt_sv: plain text body in Swedish
    :param body_html_sv: html body in Swedish
    :param attachment_name: the file name of the PDF to attach
    :param attachment: the contents of the PDF to attach to the message
    """
    mail = {
        'en': {
            'subject': subject_en,
            'body_txt': body_txt_en,
            'body_html': body_html_en,
        },
        'sv': {
            'subject': subject_sv,
            'body_txt': body_txt_sv,
            'body_html': body_html_sv,
        },
    }
    first = str(get_locale())
    second = first == 'sv' and 'en' or 'sv'

    subject = f"{mail[first]['subject']} / {mail[second]['subject']}"
    msg = Message(subject, recipients=recipients)
    msg.body = f"{mail[first]['body_txt']} \n\n {mail[second]['body_txt']}"
    msg.html = f"{mail[first]['body_html']} <br/><br/> {mail[second]['body_html']}"

    if attachment and attachment_name:
        msg.attach(attachment_name, 'application/pdf', attachment)

    current_app.logger.debug(f"Email to be sent:\n\n{msg}\n\n")

    current_app.mailer.send(msg)


def get_authn_context(docs: list) -> list:
    """
    Get the authentication context classes to send to the `create` API method.
    If some of the docs to be signed are invitations and have a requirement
    for some minimum LoA, use that. Otherwise, use the LoA obtained in the
    authentication of the user, kept in the session.

    :param docs: list of dicts with the data for the documents to be signed.
    :return: a list with the authn context classes
    """
    # In development, use a configured context.
    if current_app.config['ENVIRONMENT'] == 'development':
        return [current_app.config['DEBUG_AUTHN_CONTEXT']]

    authn_context = set()
    for doc in docs:
        key = uuid.UUID(doc['key'])
        loa = current_app.doc_store.get_loa(key)
        if loa not in ("", "none"):
            authn_context = authn_context.union(set(loa.split(';')))

    if not authn_context:
        authn_context.add(session['authn_context'])

    current_app.logger.debug(f"Authn context: {authn_context}")

    return list(authn_context)
