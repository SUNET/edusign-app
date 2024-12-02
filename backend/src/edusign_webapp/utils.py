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
import os
import uuid
from base64 import b64decode
from email.encoders import encode_base64
from email.mime.base import MIMEBase
from xml.etree import cElementTree as ET
from zlib import error as zliberror

from flask import current_app, request, session
from flask_babel import force_locale, get_locale, gettext
from flask_mailman import EmailMultiAlternatives
from pyhanko.pdf_utils.reader import PdfFileReader, PdfReadError

from edusign_webapp.mail_backend import ParallelEmailBackend


class MissingDisplayName(Exception):
    pass


class NonWhitelisted(Exception):
    pass


def add_attributes_to_session(check_whitelisted=True):
    """
    If the Flask session does not contain information identifying the user,
    this function will grab it from the HTTP headers, where it has been put by the
    Shibboleth SP app, and add them to the session.
    The particular info that is grabbed from the headers can be configured in a variable:
    * SIGNER_ATTRIBUTES: attributes that will be added to the session, and will be used in the signature.
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
        try:
            eppn = request.headers['Edupersonprincipalname-20']
            attr_schema = '20'
        except KeyError:
            try:
                eppn = request.headers['Edupersonprincipalname-11']
                attr_schema = '11'
            except KeyError:
                current_app.logger.error('Missing eduPersonPrincipalName from request')
                raise

        session['eppn'] = eppn
        session['eduPersonPrincipalName'] = eppn
        session['saml-attr-schema'] = attr_schema

        current_app.logger.info(f'User {eppn} started a session')
        current_app.logger.debug(f'\n\nHEADERS\n\n{request.headers}\n\n\n\n')

        attrs = [('mail', f'Mail-{attr_schema}'), ('displayName', f'Displayname-{attr_schema}')]
        more_attrs = [(attr, attr.lower().capitalize() + f'-{attr_schema}') for attr in current_app.config[f'SIGNER_ATTRIBUTES_{attr_schema}'].values()]
        more_attrs.extend([(attr, attr.lower().capitalize() + f'-{attr_schema}') for attr in current_app.config[f'AUTHN_ATTRIBUTES_{attr_schema}'].values()])
        for attr in more_attrs:
            if attr not in attrs and attr[0] != 'eduPersonPrincipalName':
                attrs.append(attr)

        def get_attr_values(attr_in_header):
            """
            To be able to pass utf8 through wsgi headers,
            we tell shibboleth to add them as b64 encoded XML elements.
            """
            attrs = []
            b64 = request.headers[attr_in_header]
            attrs_b64 = b64.split(';')
            for attr_b64 in attrs_b64:
                attr_xml = b64decode(attr_b64)
                attr_val = ET.fromstring(attr_xml)
                attrs.append(attr_val.text)
            return attrs

        for attr_in_session, attr_in_header in attrs:
            try:
                current_app.logger.debug(
                    f'Getting attribute {attr_in_header} from request: {request.headers[attr_in_header]}'
                )
                attr_values = get_attr_values(attr_in_header)
                session[attr_in_session] = attr_values[0]
                if attr_in_session == 'mail':
                    session[attr_in_session] = session[attr_in_session].lower()
                    session['mail_aliases'] = [m.lower() for m in attr_values]
            except (KeyError, IndexError):
                current_app.logger.error(f'Missing attribute {attr_in_header} from request')
                if attr_in_session == 'displayName':
                    raise MissingDisplayName()
                raise

        if f'Maillocaladdress-{attr_schema}' in request.headers:
            addresses = get_attr_values(f'Maillocaladdress-{attr_schema}')
            if 'mail_aliases' not in session:
                session['mail_aliases'] = []

            session['mail_aliases'] += [m.lower() for m in addresses]

        if 'mail_aliases' in session:
            session['mail_aliases'] = list(set(session['mail_aliases']))

        try:
            session['idp'] = request.headers.get('Shib-Identity-Provider')
        except KeyError:
            current_app.logger.error('Missing Identity Provider from request')
            raise
        try:
            session['authn_method'] = request.headers.get('Shib-Authentication-Method')
        except KeyError:
            current_app.logger.error('Missing Authentication Method from request')
            raise
        try:
            session['authn_context'] = request.headers.get('Shib-Authncontext-Class')
        except KeyError:
            current_app.logger.error('Missing AuthnContext Class from request')
            raise

        session['organizationName'] = None
        orgName = request.headers.get('Md-Organizationname', None)
        if orgName is not None:
            session['organizationName'] = orgName.encode('latin1').decode('utf8')

        current_app.logger.debug(f'Headers sent by Shibboleth SP {request.headers}')

        if check_whitelisted:
            if not current_app.is_whitelisted(eppn):
                current_app.logger.info(f"Rejecting user with {eppn} address")
                raise NonWhitelisted('Unauthorized user')


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


def get_invitations(remove_finished=False):
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
    mail_addresses = session.get('mail_aliases')
    if mail_addresses is None:
        mail_addresses = [session['mail']]
    mail_addresses = list(set(mail_addresses))
    owned = current_app.doc_store.get_owned_documents(session['eppn'], mail_addresses)
    invited = current_app.doc_store.get_pending_documents(mail_addresses)
    poll = False
    for doc in invited:
        if len(doc['pending']) > 0:
            poll = True
        if doc['loa'] not in ("", "none"):
            doc['loa'] += ',' + current_app.config['AVAILABLE_LOAS'][doc['loa']]
    newowned, skipped = [], []
    current_app.logger.debug(f"Start checking {len(owned)} owned docs")
    for doc in owned:
        current_app.logger.debug(f"Checking {doc['name']}, with {len(doc['pending'])} pending")
        if len(doc['pending']) > 0:
            poll = True

        if doc['skipfinal'] and len(doc['pending']) == 0:
            current_app.logger.debug(f"Skipping {doc['name']}")
            doc['blob'] = current_app.doc_store.get_document_content(doc['key'])
            doc['signed_content'] = current_app.doc_store.get_document_content(doc['key'])
            if remove_finished:
                current_app.doc_store.remove_document(doc['key'])
            skipped.append(doc)
        else:
            newowned.append(doc)

        if doc['loa'] not in ("", "none"):
            doc['loa'] += ',' + current_app.config['AVAILABLE_LOAS'][doc['loa']]

    return {
        'owned_multisign': newowned,
        'pending_multisign': invited,
        'skipped': skipped,
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
    except (PdfReadError, zliberror) as e:
        current_app.logger.info(f"Error reading previous signatures for {document['name']}: {e}")
        return "pdf read error"
    sigs = []
    try:
        for sig in reader.embedded_regular_signatures:
            sigs.append(sig.signer_cert.subject.human_friendly)
        return "|".join(sigs)
    except Exception as e:
        current_app.logger.error(f'Problem reading previous signatures: {e}')
        return ""


def compose_message(
    recipients: list,
    subject: str,
    body_txt: str,
    body_html: str,
    attachment_name: str = '',
    attachment: str = '',
):
    """
    Compose a mail message, with subject and body in both Swedish and English,
    and with the body in both plain text and html.

    :param recipients: list of recipients of the email
    :param subject: subject
    :param body_txt: plain text body
    :param body_html: html body
    :param attachment_name: the file name of the PDF to attach
    :param attachment: the contents of the PDF to attach to the message
    """
    current_app.logger.debug(f"message to send: {recipients} -- {subject}")
    msg = EmailMultiAlternatives(subject, body_txt, current_app.config['MAIL_DEFAULT_SENDER'], recipients)
    msg.attach_alternative(body_html, 'text/html')

    if attachment and attachment_name:
        mail_file = MIMEBase('application', 'pdf')
        mail_file.set_payload(attachment)
        mail_file.add_header('Content-Disposition', 'attachment', filename=attachment_name)
        encode_base64(mail_file)
        msg.attach(mail_file)

    return msg


def sendmail(*args, **kwargs):
    """
    Compose a mail message and send it.
    The arguments are the same as those for `compose_message`.
    """
    msg = compose_message(*args, **kwargs)

    current_app.logger.debug(f"Email to be sent:\n\n{msg.message().as_string()}\n\n")

    msg.send()


def sendmail_bulk(msgs_data: list):
    """
    Compose a number of mail messages and send it.

    :param msgs: a list of arguments for `compose_message`.
    """
    if current_app.config['MAIL_BACKEND'] == 'dummy':
        backend = 'dummy'
    else:
        backend = ParallelEmailBackend
    conn = current_app.mailer.get_connection(backend=backend)
    msgs = []

    for args, kwargs in msgs_data:
        msg = compose_message(*args, **kwargs)
        msgs.append(msg)

    if backend == 'dummy':
        conn.send_messages(msgs)
    else:
        conn.send_messages_in_parallel(msgs)
    conn.close()


def get_authn_context(docs: list) -> list:
    """
    Get the authentication context classes to send to the `create` API method.
    If some of the docs to be signed are invitations and have a requirement
    for some minimum LoA, use that. Otherwise, use the LoA obtained in the
    authentication of the user, kept in the session.

    :param docs: list of dicts with the data for the documents to be signed.
    :return: a list with the authn context classes
    """
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
