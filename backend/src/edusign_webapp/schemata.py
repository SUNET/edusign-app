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


class _DocumentSchema(Schema):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    name = fields.String(required=True, validate=[validate_nonempty])
    size = fields.Integer(required=True)
    type = fields.String(required=True, validate=[validate_nonempty, validate_doc_type])


class Invitee(Schema):
    email = fields.Email(required=True, validate=[validate_nonempty])
    name = fields.String(required=True, validate=[validate_nonempty])


class InvitationsSchema(Schema):
    """
    Schema to marshall invitations configuration sent to the frontend.
    """

    class PendingDocument(_DocumentSchema):
        key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
        invite_key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
        owner = fields.Nested(Invitee)
        pending = fields.List(fields.Nested(Invitee))
        signed = fields.List(fields.Nested(Invitee))
        declined = fields.List(fields.Nested(Invitee))
        state = fields.String(required=True, validate=[validate_nonempty])
        prev_signatures = fields.String(default="")

    class OwnedDocument(_DocumentSchema):
        key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
        pending = fields.List(fields.Nested(Invitee))
        signed = fields.List(fields.Nested(Invitee))
        declined = fields.List(fields.Nested(Invitee))
        state = fields.String(required=True, validate=[validate_nonempty])
        prev_signatures = fields.String(default="")

    pending_multisign = fields.List(fields.Nested(PendingDocument))
    owned_multisign = fields.List(fields.Nested(OwnedDocument))
    poll = fields.Boolean(default=False)


class ConfigSchema(InvitationsSchema):
    """
    Schema to marshall configuration sent to the frontend.
    """

    class SignerAttributes(Schema):
        eppn = fields.String(required=True, validate=[validate_nonempty])
        name = fields.String(required=True, validate=[validate_nonempty])
        mail = fields.String(required=True, validate=[validate_nonempty])

    class AvailableLoa(Schema):
        name = fields.String(required=True, validate=[validate_nonempty])
        uri = fields.String(required=True, validate=[validate_nonempty])

    signer_attributes = fields.Nested(SignerAttributes)
    multisign_buttons = fields.String(required=True)
    available_loas = fields.List(fields.Nested(AvailableLoa))
    unauthn = fields.Boolean(default=True)


class DocumentSchema(_DocumentSchema):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    blob = fields.Raw(required=True, validate=[validate_nonempty])


class BlobSchema(Schema):
    """
    Schema to marshal a document's contents sent to the frontend for preview.
    """

    blob = fields.Raw(required=True, validate=[validate_nonempty])


class _DocumentSchemaWithKey(_DocumentSchema):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
    blob = fields.Raw(required=True, validate=[validate_nonempty])


class DocumentSchemaWithKey(_DocumentSchemaWithKey):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    prev_signatures = fields.String()


class DocumentSchemaWithKeyNoBlob(_DocumentSchema):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])


class DocumentSchemaWithKeyInvite(_DocumentSchema):
    """
    Schema to unmarshal a document's data sent from the frontend to be prepared for signing.
    """

    key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
    invite_key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])


class _ReferenceSchema(Schema):
    """"""

    key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
    ref = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
    sign_requirement = fields.String(required=True, validate=[validate_nonempty, validate_sign_requirement])


class ReferenceSchema(_ReferenceSchema):
    """
    Schema to marshal data returned from the `prepare` API endpoint
    referencing a document just prepared for signing.
    """

    prev_signatures = fields.String(default="")


class ToSignSchema(Schema):
    """
    Schema to unmarshal (already prepared) documents to be included in a sign request.
    """

    class ToSignDocumentSchema(_ReferenceSchema):
        name = fields.String(required=True, validate=[validate_nonempty])
        type = fields.String(required=True, validate=[validate_nonempty, validate_doc_type])

    documents = fields.List(fields.Nested(ToSignDocumentSchema))


class ToRestartSigningSchema(Schema):
    """
    Schema to unmarshal documents sent to be prepared for signing,
    after an attempt to create a sign request has failed due to (some of the) documents
    having been evicted from the API's cache.
    """

    class AllDocuments(Schema):
        local = fields.List(fields.Nested(_DocumentSchemaWithKey))
        invited = fields.List(fields.Nested(DocumentSchemaWithKeyInvite))
        owned = fields.List(fields.Nested(DocumentSchemaWithKeyNoBlob))

    documents = fields.Nested(AllDocuments)


class SignRequestSchema(Schema):
    """
    Schema to marshal a sign request to the API.
    """

    relay_state = fields.String(required=True, validate=[validate_nonempty])
    sign_request = fields.String(required=True, validate=[validate_nonempty])
    binding = fields.String(required=True, validate=[validate_nonempty])
    destination_url = fields.String(required=True, validate=[validate_nonempty])

    class DocumentWithIdSchema(_ReferenceSchema):
        name = fields.String(required=True, validate=[validate_nonempty])
        size = fields.Integer(required=False)
        type = fields.String(required=False)
        blob = fields.Raw(required=False)

    documents = fields.List(fields.Nested(DocumentWithIdSchema))


class ReSignRequestSchema(SignRequestSchema):
    class FailedDocument(Schema):
        key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
        state = fields.String(required=True, validate=[validate_nonempty])
        message = fields.String(required=True, validate=[validate_nonempty])

    failed = fields.List(fields.Nested(FailedDocument))


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


class MultiSignSchema(Schema):
    """
    Schema to unmarshal requests for multi signatures.
    """
    document = fields.Nested(DocumentSchemaWithKey, many=False)
    text = fields.String()
    sendsigned = fields.Boolean()
    invites = fields.List(fields.Nested(Invitee))
    owner = fields.Email(required=True)
    loa = fields.String()


class KeyedMultiSignSchema(Schema):
    """
    Schema to unmarshal requests for removing multi signatures.
    """

    key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])


class ResendMultiSignSchema(KeyedMultiSignSchema):
    """
    Schema to unmarshal requests for re-sending invitations for multi signatures.
    """

    text = fields.String(default="")


class DelegationSchema(Invitee):
    """
    Schema to unmarshal requests to delegate an invitation
    """
    invite_key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
    document_key = fields.String(required=True, validate=[validate_nonempty, validate_uuid4])
