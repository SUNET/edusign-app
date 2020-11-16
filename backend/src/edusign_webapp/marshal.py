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
from urllib.parse import urlsplit

from flask import current_app, jsonify, session, request
from flask_babel import gettext
from werkzeug.wrappers import Response as WerkzeugResponse
from werkzeug.security import generate_password_hash, check_password_hash
from marshmallow import Schema, fields, pre_dump, post_load, validates, ValidationError


def csrf_check_hesders():
    custom_header = request.headers.get('X-Requested-With', '')
    if custom_header != 'XMLHttpRequest':
        raise ValidationError(gettext('CSRF missing custom X-Requested-With header'))
    origin = request.headers.get('Origin', None)
    if origin is None:
        origin = request.headers.get('Referer', None)
    if origin is None:
        raise ValidationError(gettext('CSRF cannot check origin'))
    origin = origin.split()[0]
    origin = urlsplit(origin).hostname
    target = request.headers.get('X-Forwarded-Host', None)
    if target is None:
        current_app.logger.error('The X-Forwarded-Host header is missing!!')
        raise ValidationError(gettext('CSRF cannot check target'))
    target = target.split(':')[0]
    if origin != target:
        raise ValidationError(gettext('CSRF cross origin request, origin: %(origin)s, target: %(target)s', origin=origin, target=target))


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


class RequestSchema(Schema):

    csrf_token = fields.String(required=True)

    @validates('csrf_token')
    def verify_csrf_token(self, value):

        csrf_check_hesders()

        method = current_app.config['HASH_METHOD']
        token = f'{method}${value}'

        secret = current_app.config['SECRET_KEY']
        key = session['user_key'] + secret

        if not check_password_hash(token, key):
            raise ValidationError(gettext('CSRF token failed to validate'))

    @post_load
    def post_processing(self, in_data, **kwargs):
        # Remove token from data forwarded to views
        del in_data['csrf_token']
        return in_data


class UnMarshal(object):
    """
    """

    def __init__(self, schema):

        class UnMarshallingSchema(RequestSchema):
            payload = fields.Nested(schema)

        self.schema = UnMarshallingSchema

    def __call__(self, f):
        @wraps(f)
        def unmarshal_decorator(*args, **kwargs):
            try:
                json_data = request.get_json()
                if json_data is None:
                    json_data = {}
                unmarshal_result = self.schema().load(json_data)
                kwargs.update(unmarshal_result)
                return f(*args, **kwargs)
            except ValidationError as e:
                data = {
                    'error': True,
                    'message': e.normalized_messages()
                }
                return jsonify(ResponseSchema(data).to_dict())

        return unmarshal_decorator
