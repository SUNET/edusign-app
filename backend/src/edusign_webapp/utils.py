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
from base64 import b64decode
from xml.etree import cElementTree as ET
from email.message import EmailMessage, MIMEPart

from flask import current_app, request, session
from flask_babel import gettext, force_locale, get_locale
from pyhanko.pdf_utils.reader import PdfFileReader


def add_attributes_to_session(check_whitelisted=True):
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
    content = document['blob']
    if "," in content:
        content = content.split(",")[1]

    bytes = b64decode(content, validate=True)
    pdf = io.BytesIO(bytes)
    reader = PdfFileReader(pdf)
    sigs = []
    try:
        for sig in reader.embedded_regular_signatures:
            sigs.append(sig.signer_cert.subject.human_friendly)
        return ";".join(sigs)
    except Exception as e:
        current_app.logger.error(f'Problem reading previous signatures: {e}')
        return ""


def sendmail(recipients, subject_en, subject_sv, body_txt_en, body_html_en, body_txt_sv, body_html_sv, attachment_name='', attachment=''):
    with force_locale('en'):
        warning_en = gettext("Warning languages")
    with force_locale('sv'):
        warning_sv = gettext("Warning languages")

    warning = f"{warning_sv}\n\n{warning_en}"

    msg = EmailMessage()
    msg.add_header('Subject', subject_sv)
    msg.add_header('From', current_app.config['MAIL_DEFAULT_SENDER'])
    msg.add_header('To', ', '.join(recipients))
    msg.add_header('Content-Disposition', 'inline')
    msg.set_content(warning)

    msg_txt_sv = MIMEPart()
    msg_txt_sv.add_header('Content-Disposition', 'inline')
    msg_txt_sv.add_header('Content-Type', 'text/plain; charset="utf8"')
    msg_txt_sv.set_content(body_txt_sv)

    msg_html_sv = MIMEPart()
    msg_html_sv.add_header('Content-Disposition', 'inline')
    msg_html_sv.add_header('Content-Type', 'text/html; charset="utf8"')
    msg_html_sv.set_content(body_html_sv)

    msg_sv = MIMEPart()
    msg_sv.add_header('Subject', subject_sv)
    msg_sv.add_header('Content-Translation-Type', 'original')
    msg_sv.add_header('Content-Language', 'sv')
    msg_sv.add_header('Content-Disposition', 'inline')
    msg_sv.add_header('Content-Type', 'multipart/alternative')
    msg_sv.add_attachment(msg_txt_sv)
    msg_sv.add_attachment(msg_html_sv)

    msg_txt_en = MIMEPart()
    msg_txt_en.add_header('Content-Disposition', 'inline')
    msg_txt_en.add_header('Content-Type', 'text/plain; charset="utf8"')
    msg_txt_en.set_content(body_txt_en)

    msg_html_en = MIMEPart()
    msg_html_en.add_header('Content-Disposition', 'inline')
    msg_html_en.add_header('Content-Type', 'text/html; charset="utf8"')
    msg_html_en.set_content(body_html_en)

    msg_en = MIMEPart()
    msg_en.add_header('Subject', subject_en)
    msg_en.add_header('Content-Translation-Type', 'original')
    msg_en.add_header('Content-Language', 'en')
    msg_en.add_header('Content-Disposition', 'inline')
    msg_en.add_header('Content-Type', 'multipart/alternative')
    msg_en.add_attachment(msg_txt_en)
    msg_en.add_attachment(msg_html_en)

    msg.add_attachment(msg_sv)
    msg.add_attachment(msg_en)
    msg.replace_header('Content-type', 'multipart/multilingual')

    if attachment_name and attachment:
        msg.add_attachment(attachment_name, 'application/pdf', attachment)

    current_app.logger.debug(f"Email to be sent:\n\n{msg}\n\n")

    current_app.mailer.send(Message(msg))


class Message(object):
    """
    Encapsulates an email message.

    :param msg: EmailMessage
    """

    def __init__(self, msg: EmailMessage):

        self.msg = msg

        sender = current_app.extensions['mail'].default_sender

        if isinstance(sender, tuple):
            sender = "%s <%s>" % sender

        self.sender = sender
        self.date = None
        self.mail_options = None
        self.rcpt_options = None


    @property
    def send_to(self):
        return set([recipient.strip() for recipient in self.msg.get('To').split(',')])

    def _message(self):
        return self

    def __str__(self):
        return self.msg.as_string()

    def __bytes__(self):
        return self.msg.as_bytes()

    def has_bad_headers(self):
        return False

    def send(self, connection):
        """Verifies and sends the message."""

        connection.send(self)
