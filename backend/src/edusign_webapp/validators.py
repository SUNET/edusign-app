# -*- coding: utf-8 -*-
#
# Copyright (c) 2021 SUNET
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
from typing import Any
from uuid import UUID

from flask_babel import gettext
from marshmallow import ValidationError


def validate_nonempty(value: Any):
    """
    Validate that the concerned value is not an empty string.

    :raises ValidationError: If the value is an empty string.
    """
    if not value:
        raise ValidationError(gettext("Missing value for required field"))

    if isinstance(value, str) and not value.strip():
        raise ValidationError(gettext("Missing value for required field"))


def validate_doc_type(value):
    """
    Validate that the provided value is exactly the string "application/pdf".

    :raises ValidationError: if the value is not the string "application/pdf".
    """
    if value != 'application/pdf':
        raise ValidationError(gettext("Invalid document type"))


def validate_uuid4(value):
    """
    Validate that the provided value is an UUID (RFC 4122)

    :raises ValidationError: if the value does not correspond with an UUID.
    """
    try:
        val = UUID(value)
    except ValueError:
        raise ValidationError(gettext('Invalid UUID value'))

    if str(val) != value:
        raise ValidationError(gettext('Invalid UUID value'))


def validate_sign_requirement(value):
    """
    Validate that the concerned value is a JSON string that contains `fieldValues` and `signerName` keys.

    :raises ValidationError: in case the value doesn't conform to the above.
    """
    try:
        val = json.loads(value)
    except json.decoder.JSONDecodeError:
        raise ValidationError(gettext('Invalid sign requirement value'))

    if 'fieldValues' not in val:
        raise ValidationError(gettext('Invalid sign requirement value'))

    if 'signerName' not in val:
        raise ValidationError(gettext('Invalid sign requirement value'))
