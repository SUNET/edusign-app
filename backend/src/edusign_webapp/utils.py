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

from flask import current_app, request, session
from flask_babel import force_locale, get_locale, gettext
from flask_mail import Message
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
        return "|".join(sigs)
    except Exception as e:
        current_app.logger.error(f'Problem reading previous signatures: {e}')
        return ""


def sendmail(
    recipients,
    subject_en,
    subject_sv,
    body_txt_en,
    body_html_en,
    body_txt_sv,
    body_html_sv,
    attachment_name='',
    attachment='',
):
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
    msg.body = f"{mail[first]['body_txt']} \n {mail[second]['body_txt']}"
    msg.html = f"{mail[first]['body_html']} \n {mail[second]['body_html']}"

    if attachment and attachment_name:
        msg.attach(attachment_name, 'application/pdf', attachment)

    current_app.logger.debug(f"Email to be sent:\n\n{msg}\n\n")

    current_app.mailer.send(msg)
