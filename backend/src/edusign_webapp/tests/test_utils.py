# -*- coding: utf-8 -*-
#
# Copyright (c) 2026 SUNET
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
from base64 import b64decode, b64encode
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from unittest import mock

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from flask import session

from edusign_webapp import run
from edusign_webapp.mail_backend import ParallelEmailBackend
from edusign_webapp.tests.conftest import _environ_base
from edusign_webapp.utils import (
    MissingDisplayName,
    NonWhitelisted,
    WrongSSN,
    add_attributes_to_session,
    add_attributes_to_session_bankid_freja,
    compose_message,
    fix_recipients,
    get_authn_context,
    get_previous_signatures,
    get_previous_signatures_xml,
    get_required_assurance,
    is_whitelisted,
    is_whitelisted_for_bankid,
    pretty_print_any,
    pretty_print_xml,
    sendmail,
    sendmail_bulk,
)

invitation_flags = [
    True,  # sendsigned
    'none',  # loa
    False,  # skipfinal
    False,  # ordered
    False,  # allowbankid
    'Invitation text',  # invitation_text
]


sample_xml = b'<root><data>test</data></root>'


def _make_pem_cert(common_name='Test Signer'):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc) - timedelta(days=1))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    return cert.public_bytes(serialization.Encoding.PEM).decode('ascii')


def test_add_attributes_to_session(app):
    _, app = app
    with app.test_request_context(environ_base=deepcopy(_environ_base)):
        add_attributes_to_session()

        assert session['eppn'] == 'dummy-eppn@example.org'
        assert session['displayName'] == 'Tëster Kid'
        assert session['mail'] == 'tester@example.org'
        assert session['mail_aliases'] == ['tester@example.org']
        assert len(session['eduPersonAssurance']) == 3
        assert session['organizationName'] == 'Test Org'
        assert session['registrationAuthority'] == 'http://www.swamid.se/'


def test_add_attributes_to_session_mail_local_address(app):
    _, app = app
    environ = deepcopy(_environ_base)
    environ['HTTP_MAILLOCALADDRESS_20'] = b';'.join(
        [
            b64encode(b'<Attribute>alias1@example.org</Attribute>'),
            b64encode(b'<Attribute>alias2@example.org</Attribute>'),
        ]
    ).decode('ascii')
    with app.test_request_context(environ_base=environ):
        add_attributes_to_session()

        assert sorted(session['mail_aliases']) == [
            'alias1@example.org',
            'alias2@example.org',
            'tester@example.org',
        ]


def test_add_attributes_to_session_attr_schema_11(app):
    _, app = app
    environ = {
        "HTTP_MD_ORGANIZATIONNAME": 'Test Org',
        "HTTP_EDUPERSONPRINCIPALNAME_11": 'dummy-eppn@example.org',
        "HTTP_DISPLAYNAME_11": b64encode('<Attribute>Tëster Kid</Attribute>'.encode('utf-8')).decode('ascii'),
        "HTTP_MAIL_11": b64encode(b'<Attribute>tester@example.org</Attribute>').decode('ascii'),
        "HTTP_SHIB_IDENTITY_PROVIDER": 'https://idp',
        "HTTP_SHIB_AUTHNCONTEXT_CLASS": 'dummy',
    }
    with app.test_request_context(environ_base=environ):
        add_attributes_to_session()

        assert session['saml-attr-schema'] == '11'
        assert session['eppn'] == 'dummy-eppn@example.org'
        # no eduPersonAssurance header
        assert session['eduPersonAssurance'] == []


def test_add_attributes_to_session_missing_eppn(app):
    _, app = app
    with app.test_request_context():
        with pytest.raises(KeyError):
            add_attributes_to_session()


def test_add_attributes_to_session_missing_display_name(app):
    _, app = app
    environ = deepcopy(_environ_base)
    del environ['HTTP_DISPLAYNAME_20']
    with app.test_request_context(environ_base=environ):
        with pytest.raises(MissingDisplayName):
            add_attributes_to_session()


def test_add_attributes_to_session_non_whitelisted(app):
    _, app = app
    environ = deepcopy(_environ_base)
    environ['HTTP_EDUPERSONPRINCIPALNAME_20'] = 'dummy-eppn@other.org'
    with app.test_request_context(environ_base=environ):
        with pytest.raises(NonWhitelisted):
            add_attributes_to_session()

    with app.test_request_context(environ_base=environ):
        add_attributes_to_session(check_whitelisted=False)
        assert session['eppn'] == 'dummy-eppn@other.org'


def _add_invited_document(doc_store, sample_doc_1, sample_owner_1, ssn=''):
    invites = [{'name': 'invite0', 'email': 'invite0@example.org', 'ssn': ssn, 'lang': 'en'}]
    with run.app.app_context():
        invitations = doc_store.add_document(sample_doc_1, sample_owner_1, invites, *invitation_flags)
    return invitations[0]['key']


def _bankid_environ(ssn='8112189876'):
    return {
        "HTTP_MD_ORGANIZATIONNAME": 'Test Org',
        "HTTP_PERSONALIDENTITYNUMBER_20": b64encode(f'<Attribute>{ssn}</Attribute>'.encode('ascii')).decode('ascii'),
        "HTTP_DISPLAYNAME_20": b64encode('<Attribute>Invited Kid</Attribute>'.encode('utf-8')).decode('ascii'),
        "HTTP_SHIB_IDENTITY_PROVIDER": 'https://idp',
        "HTTP_SHIB_AUTHNCONTEXT_CLASS": 'dummy',
    }


def test_add_attributes_to_session_bankid(doc_store_local_sqlite, sample_doc_1, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite
    invite_key = _add_invited_document(doc_store, sample_doc_1, sample_owner_1)

    run.app.extensions['doc_store'] = doc_store
    with run.app.test_request_context(environ_base=_bankid_environ()):
        add_attributes_to_session_bankid_freja(invite_key, 'bankid')

        assert session['eppn'] == '8112189876'
        assert session['ssn'] == '8112189876'
        assert session['using-bankid']
        assert not session['using-freja']
        assert session['mail'] == 'invite0@example.org'
        assert session['displayName'] == 'Invited Kid'
        assert session['registrationAuthority'] == 'dummy-bankid'


def test_add_attributes_to_session_freja_wrong_ssn(doc_store_local_sqlite, sample_doc_1, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite
    invite_key = _add_invited_document(doc_store, sample_doc_1, sample_owner_1, ssn='199001019876')

    run.app.extensions['doc_store'] = doc_store
    with run.app.test_request_context(environ_base=_bankid_environ()):
        with pytest.raises(WrongSSN):
            add_attributes_to_session_bankid_freja(invite_key, 'freja')


def test_add_attributes_to_session_bankid_missing_ssn(doc_store_local_sqlite, sample_doc_1, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite
    invite_key = _add_invited_document(doc_store, sample_doc_1, sample_owner_1)

    environ = _bankid_environ()
    del environ['HTTP_PERSONALIDENTITYNUMBER_20']
    run.app.extensions['doc_store'] = doc_store
    with run.app.test_request_context(environ_base=environ):
        with pytest.raises(KeyError):
            add_attributes_to_session_bankid_freja(invite_key, 'bankid')


def test_get_previous_signatures_none(app, sample_pdf_data):
    _, app = app
    with app.test_request_context():
        assert get_previous_signatures({'name': 'test.pdf', 'blob': sample_pdf_data}) == ''
        # with a data-url prefix
        assert (
            get_previous_signatures({'name': 'test.pdf', 'blob': 'data:application/pdf;base64,' + sample_pdf_data})
            == ''
        )


def test_get_previous_signatures_unreadable(app):
    _, app = app
    not_a_pdf = b64encode(b'this is not a pdf document').decode('ascii')
    with app.test_request_context():
        assert get_previous_signatures({'name': 'test.pdf', 'blob': not_a_pdf}) == 'pdf read error'


def test_get_previous_signatures_xml(app):
    _, app = app
    pem = _make_pem_cert()
    xml = (
        '<root xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:Signature>'
        '<ds:KeyInfo><ds:X509Data>'
        f'<ds:X509Certificate>{pem}</ds:X509Certificate>'
        '</ds:X509Data></ds:KeyInfo>'
        '</ds:Signature></root>'
    )
    blob = b64encode(xml.encode('ascii')).decode('ascii')
    with app.test_request_context():
        assert get_previous_signatures_xml({'name': 'test.xml', 'blob': blob}) == 'CN=Test Signer'


def test_get_previous_signatures_xml_unsigned(app):
    _, app = app
    blob = 'data:text/xml;base64,' + b64encode(sample_xml).decode('ascii')
    with app.test_request_context():
        assert get_previous_signatures_xml({'name': 'test.xml', 'blob': blob}) == ''


def test_is_whitelisted(app):
    _, app = app
    with app.test_request_context():
        assert is_whitelisted(app, 'anyone@example.org')
        assert not is_whitelisted(app, 'anyone@other.org')
        assert not is_whitelisted(app, 'blacklisted@example.org')
        assert is_whitelisted(app, 'whitelisted@example.org')
        # no scope: BankID user
        assert is_whitelisted(app, '8112189876')


def test_is_whitelisted_api_call(app):
    _, app = app
    with app.test_request_context():
        session['api_call'] = True
        assert is_whitelisted(app, 'anyone@other.org')


def test_is_whitelisted_for_bankid(app):
    _, app = app
    app.config['BANKID_WHITELIST'] = ['example.org']
    with app.test_request_context():
        assert is_whitelisted_for_bankid(app, 'anyone@example.org')
        assert not is_whitelisted_for_bankid(app, 'anyone@other.org')
        assert not is_whitelisted_for_bankid(app, '8112189876')


def test_fix_recipients():
    assert fix_recipients(['"John Doe" <john@example.org>']) == ['"John Doe" <john@example.org>']
    assert fix_recipients(['"john@example.org" <john@example.org>']) == ['john@example.org']
    assert fix_recipients(['john@example.org']) == ['john@example.org']


def test_compose_message_with_attachment(app):
    _, app = app
    with app.test_request_context():
        msg = compose_message(
            ['recipient@example.org'],
            'Test subject',
            'text body',
            '<p>html body</p>',
            attachment_name='test.pdf',
            attachment='some pdf content',
        )
        assert len(msg.attachments) == 1


def test_sendmail_dummy(app):
    _, app = app
    with app.test_request_context():
        sendmail(['recipient@example.org'], 'Test subject', 'text body', '<p>html body</p>')


def test_sendmail_e2e(app):
    _, app = app
    app.config['ENVIRONMENT'] = 'e2e'
    app.extensions['email_msgs'] = {}
    with app.test_request_context():
        sendmail(['recipient@example.org'], 'Test subject', 'text body', '<p>html body</p>')
        assert len(app.extensions['email_msgs']['messages']) == 1

        sendmail(['recipient2@example.org'], 'Test subject 2', 'text body', '<p>html body</p>')
        assert len(app.extensions['email_msgs']['messages']) == 2


def _bulk_msgs_data():
    return [
        ((['recipient@example.org'], 'Test subject', 'text body', '<p>html body</p>'), {}),
        ((['recipient2@example.org'], 'Test subject 2', 'text body', '<p>html body</p>'), {}),
    ]


def test_sendmail_bulk_dummy(app):
    _, app = app
    with app.test_request_context():
        sendmail_bulk(_bulk_msgs_data())


def test_sendmail_bulk_e2e(app):
    _, app = app
    app.config['ENVIRONMENT'] = 'e2e'
    app.extensions['email_msgs'] = {}
    with app.test_request_context():
        sendmail_bulk(_bulk_msgs_data())
        assert len(app.extensions['email_msgs']['messages']) == 2

        sendmail_bulk(_bulk_msgs_data())
        assert len(app.extensions['email_msgs']['messages']) == 4


def test_sendmail_bulk_parallel(app):
    _, app = app
    app.config['MAIL_BACKEND'] = 'smtp'
    with app.test_request_context():
        # open() fails silently, so nothing is sent
        with mock.patch.object(ParallelEmailBackend, 'open', return_value=None):
            sendmail_bulk(_bulk_msgs_data())


def test_get_authn_context_and_required_assurance(doc_store_local_sqlite, sample_doc_1, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite
    with run.app.app_context():
        doc_store.add_document(sample_doc_1, sample_owner_1, [], *invitation_flags)

    run.app.extensions['doc_store'] = doc_store
    docs = [{'key': sample_doc_1['key']}]
    with run.app.test_request_context():
        session['authn_context'] = 'dummy-authn-context'
        assert get_authn_context(docs) == ['dummy-authn-context']
        assert get_required_assurance(docs) == 'none'


def test_get_authn_context_and_required_assurance_high(doc_store_local_sqlite, sample_doc_2, sample_owner_1):
    tempdir, doc_store = doc_store_local_sqlite
    flags = deepcopy(invitation_flags)
    flags[1] = 'high'
    with run.app.app_context():
        doc_store.add_document(sample_doc_2, sample_owner_1, [], *flags)

    run.app.extensions['doc_store'] = doc_store
    docs = [{'key': sample_doc_2['key']}]
    with run.app.test_request_context():
        session['authn_context'] = 'dummy-authn-context'
        assert get_authn_context(docs) == ['https://refeds.org/profile/mfa']
        assert get_required_assurance(docs) == 'high'


def test_pretty_print_xml_and_any(app):
    _, app = app
    blob = b64encode(sample_xml).decode('ascii')
    with app.test_request_context():
        html = b64decode(pretty_print_xml(blob)).decode('ascii')
        assert 'xml-preview' in html
        assert 'root' in html

        assert pretty_print_any(blob, 'application/pdf') == 'not-needed-for-pdf'
        assert b64decode(pretty_print_any('data:text/xml;base64,' + blob, 'text/xml')).decode('ascii') == html
