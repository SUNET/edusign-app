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

import os
from functools import wraps

from flask import current_app, jsonify, session
from werkzeug.wrappers import Response as WerkzeugResponse
from werkzeug.security import generate_password_hash
from marshmallow import Schema, fields, pre_dump


class ResponseSchema(Schema):

    message = fields.String(required=False)
    error = fields.Boolean(deafault=False)
    csrf_token = fields.String(required=True)

    @pre_dump
    def get_csrf_token(self, out_data, **kwargs):
        # Generate a new csrf token for every response
        method = current_app.config['HASH_METHOD']
        secret = current_app.config['SECRET_KEY']
        salt_length = current_app.config['SALT_LENGTH']
        session['user_key'] = str(os.urandom(16))
        token_hash = generate_password_hash(session['user_key'] + secret, method=method, salt_length=salt_length)
        token = token_hash.replace(method + '$', '')
        out_data['csrf_token'] = token
        return out_data


class Marshal(object):
    """
    """

    def __init__(self, schema):

        class MarshallingSchema(ResponseSchema):
            payload = fields.Nested(schema)

        self.schema = MarshallingSchema

    def __call__(self, f):
        @wraps(f)
        def marshal_decorator(*args, **kwargs):

            resp = f(*args, **kwargs)

            if isinstance(resp, WerkzeugResponse):
                # No need to Marshal again, someone else already did that
                return resp

            return jsonify(self.schema().dump(resp))

        return marshal_decorator
