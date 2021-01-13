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

from marshmallow import Schema, fields


class ConfigSchema(Schema):
    class SignerAttribute(Schema):
        name = fields.String(required=True)
        value = fields.String(required=True)

    signer_attributes = fields.List(fields.Nested(SignerAttribute))
    documents = fields.Raw(required=False)


class DocumentSchema(Schema):
    name = fields.String(required=True)
    size = fields.Integer(required=True)
    type = fields.String(required=True)
    blob = fields.Raw(required=True)


class ReferenceSchema(Schema):
    ref = fields.String(required=True)
    sign_requirement = fields.String(required=True)


class ToSignSchema(Schema):
    class ToSignDocumentSchema(ReferenceSchema):
        name = fields.String(required=True)
        type = fields.String(required=True)

    documents = fields.List(fields.Nested(ToSignDocumentSchema))


class ToRestartSigningSchema(Schema):
    documents = fields.List(fields.Nested(DocumentSchema))


class SignRequestSchema(Schema):
    relay_state = fields.String(required=True)
    sign_request = fields.String(required=True)
    binding = fields.String(required=True)
    destination_url = fields.String(required=True)

    class DocumentWithIdSchema(ReferenceSchema):
        name = fields.String(required=True)
        id = fields.String(required=True)

    documents = fields.List(fields.Nested(DocumentWithIdSchema))


class SigningSchema(Schema):
    sign_response = fields.String(required=True)
    relay_state = fields.String(required=True)


class SignedDocumentsSchema(Schema):
    class SignedDocumentSchema(Schema):
        id = fields.String(required=True)
        signed_content = fields.Raw(required=True)

    documents = fields.List(fields.Nested(SignedDocumentSchema))
