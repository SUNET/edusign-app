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
from typing import Callable, Type
from urllib.parse import urlsplit

from flask import current_app, jsonify, request, session
from flask_babel import gettext
from marshmallow import Schema, ValidationError, fields, post_load, pre_dump, validates
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.wrappers import Response as WerkzeugResponse


def csrf_check_headers() -> None:
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
        raise ValidationError(
            gettext('CSRF cross origin request, origin: %(origin)s, target: %(target)s', origin=origin, target=target)
        )


class ResponseSchema(Schema):

    message = fields.String(required=False)
    error = fields.Boolean(default=False)
    csrf_token = fields.String(required=True)

    @pre_dump
    def get_csrf_token(self, out_data: dict, sess=None, **kwargs) -> dict:
        # Generate a new csrf token for every response
        method = current_app.config['HASH_METHOD']
        secret = current_app.config['SECRET_KEY']
        salt_length = current_app.config['SALT_LENGTH']
        if sess is None:
            sess = session
        sess['user_key'] = str(os.urandom(16))
        token_hash = generate_password_hash(sess['user_key'] + secret, method=method, salt_length=salt_length)
        token = token_hash.replace(method + '$', '')
        out_data['csrf_token'] = token
        return out_data


class Marshal(object):
    """"""

    def __init__(self, schema: Type[Schema]):
        class MarshallingSchema(ResponseSchema):
            payload = fields.Nested(schema)

        self.schema = MarshallingSchema

    def __call__(self, f: Callable) -> Callable:
        @wraps(f)
        def marshal_decorator(*args, **kwargs):

            resp_data = f(*args, **kwargs)
            current_app.logger.debug(f"Data gotten from view {str(f)}: {resp_data}")

            if isinstance(resp_data, WerkzeugResponse):
                # No need to Marshal again, someone else already did that
                return resp_data

            if resp_data.get('error', False):
                processed = ResponseSchema().dump(resp_data)
                current_app.logger.debug(f"Processed data: {processed}")
                response = jsonify(processed)
                current_app.logger.debug(f"And response: {response}")
                return response

            processed = self.schema().dump(resp_data)
            current_app.logger.debug(f"Processed data: {processed}")
            response = jsonify(processed)
            current_app.logger.debug(f"And response: {response}")
            current_app.logger.debug(f"With Headers: {response.headers}")
            return response

        return marshal_decorator


class RequestSchema(Schema):

    csrf_token = fields.String(required=True)

    @validates('csrf_token')
    def verify_csrf_token(self, value: str) -> None:

        csrf_check_headers()

        method = current_app.config['HASH_METHOD']
        token = f'{method}${value}'

        secret = current_app.config['SECRET_KEY']
        key = session['user_key'] + secret

        if not check_password_hash(token, key):
            raise ValidationError(gettext('CSRF token failed to validate'))

    @post_load
    def post_processing(self, in_data: dict, **kwargs) -> dict:
        # Remove token from data forwarded to views
        del in_data['csrf_token']
        return in_data


class UnMarshal(object):
    """"""

    def __init__(self, schema: Type[Schema] = None):

        if schema is None:
            self.schema = RequestSchema
        else:

            class UnMarshallingSchema(RequestSchema):
                payload = fields.Nested(schema)  # type: ignore

            self.schema = UnMarshallingSchema

    def __call__(self, f: Callable) -> Callable:
        @wraps(f)
        def unmarshal_decorator():
            try:
                json_data = request.get_json()
                current_app.logger.debug(f'Data received: {json_data}')
                if json_data is None:
                    json_data = {}
                unmarshal_result = self.schema().load(json_data)
                return f(unmarshal_result['payload'])
            except ValidationError as e:
                error = e.normalized_messages()
                if isinstance(error, dict):
                    error_msgs = []
                    for field, msgs in error['payload'].items():
                        field_msgs = _i18n_marshmallow_validation_errors(msgs)
                        error_msgs.append("{}: {}".format(field, "; ".join(field_msgs)))
                    error_msg = '. '.join(error_msgs)
                else:
                    error_msg = error
                data = {'error': True, 'message': error_msg}
                return ResponseSchema().dump(data)

        return unmarshal_decorator


def _i18n_marshmallow_validation_errors(msgs):
    field_msgs = []
    for msg in msgs:
        msg = msg.strip('.')
        if msg == "Missing data for required field":
            msg = gettext("Missing data for required field")
        field_msgs.append(msg)
    return field_msgs
