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

from edusign_webapp.validators import validate_doc_type, validate_nonempty, validate_sign_requirement, validate_uuid4


class ConfigSchema(Schema):
    """
    Schema to marshall configuration sent to the frontend,
    basically consisting on the signer attributes.
    """

    class SignerAttribute(Schema):
        name = fields.String(required=True, validate=[validate_nonempty])
        value = fields.String(required=True, validate=[validate_nonempty])

    signer_attributes = fields.List(fields.Nested(SignerAttribute))


class DocumentSchema(Schema):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    name = fields.String(required=True, validate=[validate_nonempty])
    size = fields.Integer(required=True)
    type = fields.String(required=True, validate=[validate_nonempty, validate_doc_type])
    blob = fields.Raw(required=True, validate=[validate_nonempty])


class ReferenceSchema(Schema):
    """
    Schema to marshal data returned from the `prepare` API endpoint
    referencing a document just prepared for signing.
    """

    ref = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
    sign_requirement = fields.String(required=True, validate=[validate_nonempty, validate_sign_requirement])


class ToSignSchema(Schema):
    """
    Schema to unmarshal (already prepared) documents to be included in a sign request.
    """

    class ToSignDocumentSchema(ReferenceSchema):
        name = fields.String(required=True, validate=[validate_nonempty])
        type = fields.String(required=True, validate=[validate_nonempty, validate_doc_type])

    documents = fields.List(fields.Nested(ToSignDocumentSchema))


class ToRestartSigningSchema(Schema):
    """
    Schema to unmarshal documents sent to be prepared for signing,
    after an attempt to create a sign request has failed due to (some of the) documents
    having been evicted from the API's cache.
    """

    documents = fields.List(fields.Nested(DocumentSchema))


class SignRequestSchema(Schema):
    """
    Schema to marshal a sign request to the API.
    """

    relay_state = fields.String(required=True, validate=[validate_nonempty])
    sign_request = fields.String(required=True, validate=[validate_nonempty])
    binding = fields.String(required=True, validate=[validate_nonempty])
    destination_url = fields.String(required=True, validate=[validate_nonempty])

    class DocumentWithIdSchema(ReferenceSchema):
        name = fields.String(required=True, validate=[validate_nonempty])
        id = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])

    documents = fields.List(fields.Nested(DocumentWithIdSchema))


class SigningSchema(Schema):
    """
    Schema to unmarshal a request to get the contents of already signed documents.
    """

    sign_response = fields.String(required=True, validate=[validate_nonempty])
    relay_state = fields.String(required=True, validate=[validate_nonempty])


class SignedDocumentsSchema(Schema):
    """
    Schema to marshal the contents of signed documents.
    """

    class SignedDocumentSchema(Schema):
        id = fields.String(required=True, validate=[validate_nonempty])
        signed_content = fields.Raw(required=True, validate=[validate_nonempty])

    documents = fields.List(fields.Nested(SignedDocumentSchema))
