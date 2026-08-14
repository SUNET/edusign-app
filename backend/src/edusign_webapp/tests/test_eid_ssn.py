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
"""
Tests for the BankID/Freja personnummer check in
add_attributes_to_session_bankid_freja: the invited ssn (as typed in the invite
form) must be accepted when it denotes the same person as the ssn asserted by
the IdP, even if the two are formatted differently.
"""

from base64 import b64encode

import pytest
from flask import session

from edusign_webapp.utils import WrongSSN, add_attributes_to_session_bankid_freja

# allowbankid=True so the document accepts eID signatures
_invitation_flags = [True, 'none', False, False, True, 'Invitation text']


def _b64attr(value):
    return b64encode(f'<Attribute>{value}</Attribute>'.encode('utf-8')).decode('ascii')


def _eid_headers(asserted_ssn):
    """The headers the Shibboleth SP sets from a BankID/Freja assertion."""
    return {
        'Personalidentitynumber-20': _b64attr(asserted_ssn),
        'Displayname-20': _b64attr('Invited Kid'),
        'Shib-Identity-Provider': 'https://bankid',
        'Shib-Authncontext-Class': 'dummy',
        'Md-Organizationname': 'Test Org',
    }


def _seed_invitation(app, doc, owner, invited_ssn):
    invites = [{'name': 'Invited Kid', 'email': 'invite0@example.org', 'ssn': invited_ssn, 'lang': 'en'}]
    with app.app_context():
        invitations = app.extensions['doc_store'].add_document(doc, owner, invites, *_invitation_flags)
    return invitations[0]['key']


def _run_eid_login(app, invite_key, asserted_ssn):
    with app.test_request_context(f'/sign/bankid/{invite_key}', headers=_eid_headers(asserted_ssn)):
        add_attributes_to_session_bankid_freja(invite_key, 'bankid')
        return dict(session)


def test_eid_ssn_matches_different_format(app, sample_doc_1, sample_owner_1):
    # invite typed with a hyphen, IdP asserts 12 digits - same person
    _, app = app
    key = _seed_invitation(app, sample_doc_1, sample_owner_1, '19900101-9876')

    sess = _run_eid_login(app, key, '199001019876')

    assert sess['ssn'] == '199001019876'
    assert sess['mail'] == 'invite0@example.org'


def test_eid_ssn_matches_ten_digits(app, sample_doc_1, sample_owner_1):
    # invite typed as 10 digits, IdP asserts 12 digits - same person
    _, app = app
    key = _seed_invitation(app, sample_doc_1, sample_owner_1, '9001019876')

    sess = _run_eid_login(app, key, '199001019876')

    assert sess['ssn'] == '199001019876'


def test_eid_ssn_genuine_mismatch_rejected(app, sample_doc_1, sample_owner_1):
    # a genuinely different personnummer must still be rejected
    _, app = app
    key = _seed_invitation(app, sample_doc_1, sample_owner_1, '199001019876')

    with pytest.raises(WrongSSN):
        _run_eid_login(app, key, '198512121212')
