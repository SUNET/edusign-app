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
import json
import uuid

import pytest
from marshmallow import ValidationError

from edusign_webapp.validators import (
    validate_doc_type,
    validate_language,
    validate_nonempty,
    validate_sig_type,
    validate_sign_requirement,
    validate_swedish_ssn,
    validate_uuid4,
)


def test_validate_nonempty(app):
    _, app = app
    with app.test_request_context():
        validate_nonempty('some value')

        with pytest.raises(ValidationError):
            validate_nonempty('')

        with pytest.raises(ValidationError):
            validate_nonempty('   ')

        with pytest.raises(ValidationError):
            validate_nonempty(None)


def test_validate_doc_type(app):
    _, app = app
    with app.test_request_context():
        validate_doc_type('application/pdf')
        validate_doc_type('application/xml')
        validate_doc_type('text/xml')

        with pytest.raises(ValidationError):
            validate_doc_type('text/plain')


def test_validate_sig_type(app):
    _, app = app
    with app.test_request_context():
        validate_sig_type('bankid')
        validate_sig_type('freja')

        with pytest.raises(ValidationError):
            validate_sig_type('email')


def test_validate_uuid4(app):
    _, app = app
    with app.test_request_context():
        validate_uuid4(str(uuid.uuid4()))

        with pytest.raises(ValidationError):
            validate_uuid4('not-an-uuid')

        # valid UUID but not in canonical form
        with pytest.raises(ValidationError):
            validate_uuid4(str(uuid.uuid4()).upper())


def test_validate_sign_requirement(app):
    _, app = app
    with app.test_request_context():
        validate_sign_requirement('')
        validate_sign_requirement('not-needed-for-non-pdf')
        validate_sign_requirement(json.dumps({'fieldValues': {}, 'signerName': 'Test'}))

        with pytest.raises(ValidationError):
            validate_sign_requirement('not json')

        with pytest.raises(ValidationError):
            validate_sign_requirement(json.dumps({'signerName': 'Test'}))

        with pytest.raises(ValidationError):
            validate_sign_requirement(json.dumps({'fieldValues': {}}))


def test_validate_language(app):
    _, app = app
    with app.test_request_context():
        for lang in app.config['SUPPORTED_LANGUAGES']:
            validate_language(lang)

        with pytest.raises(ValidationError):
            validate_language('tlh')


def test_validate_swedish_ssn():
    # the classic test personnummer, valid per the Luhn algorithm
    assert validate_swedish_ssn('8112189876')
    assert validate_swedish_ssn('811218-9876')
    assert validate_swedish_ssn('198112189876')
    assert validate_swedish_ssn('19811218-9876')

    # empty is allowed
    assert validate_swedish_ssn('')

    # wrong check digit
    assert not validate_swedish_ssn('8112189877')
    # wrong length
    assert not validate_swedish_ssn('81121898')
    # non-digits
    assert not validate_swedish_ssn('81121a9876')
