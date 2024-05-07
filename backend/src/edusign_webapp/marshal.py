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

import json
import os
from functools import wraps
from typing import Any, Callable, Dict, Optional, Type
from urllib.parse import urlsplit

from flask import current_app, request, session
from flask_babel import gettext
from marshmallow import Schema, ValidationError, fields, post_load, pre_dump, validates
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.wrappers import Response as WerkzeugResponse


def csrf_check_headers() -> None:
    """
    Validate the http headers of a request that carries a CSRF token.

    :raises ValidationError: In case of a validation errror.
    """
    custom_header = request.headers.get('X-Requested-With', '')
    if custom_header != 'XMLHttpRequest':
        raise ValidationError('CSRF missing custom X-Requested-With header')
    origin = request.headers.get('Origin', None)
    if origin is None:
        origin = request.headers.get('Referer', None)
    if origin is None:
        raise ValidationError('CSRF cannot check origin')
    origin = origin.split()[0]
    origin = urlsplit(origin).hostname
    target = request.headers.get('X-Forwarded-Host', None)
    if target is None:
        raise ValidationError('The X-Forwarded-Host header is missing!!')
    target = target.split(':')[0]
    if origin != target:
        raise ValidationError(f'CSRF cross origin request, origin: {origin}, target: {target}')


class ResponseSchema(Schema):
    """
    Basic Schema for responses to front side app requests,
    that will acquire different payloads depending on the actual request being made.
    These payloads will be constructed from the Schemata that the views use to marshal their responses.
    The basic structure of this schema is:
    * message: a string message informing about the results of the request
    * error: a boolean indicating whether there was any error while processing the request
    * csrf_token: the new CSRF token to be used in the next request
    * payload: an arbitrary structure (optionally) added from the output from the view.
    """

    message = fields.String(required=False)
    error = fields.Boolean(dump_default=False)
    csrf_token = fields.String(required=True)

    @pre_dump
    def get_csrf_token(self, out_data: dict, sess: Optional[Dict[str, Any]] = None, **kwargs) -> dict:
        """
        Generate a new csrf token for every response

        :param out_data: Dict in which to include the CSRF token under the `csrf_token` key.
        :param sess: Mapping to use as session, to be used in tests
        :return: The provided `out_data` dict, with the added `csrf_token` key.
        """
        method = current_app.config['HASH_METHOD']
        secret = current_app.config['SECRET_KEY']
        salt_length = current_app.config['SALT_LENGTH']
        user_key = str(os.urandom(16))
        if sess is None:
            session['user_key'] = user_key
        else:
            sess['user_key'] = user_key
        token_hash = generate_password_hash(user_key + secret, method=method, salt_length=salt_length)
        token = token_hash.replace(method + ':', '')
        out_data['csrf_token'] = token
        return out_data


class Marshal(object):
    """
    Decorator class for Flask views,
    that will grab the return value from said views (generally dicts)
    and marshall them into Flask response objects via marshmallow schemata.
    """

    def __init__(self, schema: Optional[Type[Schema]] = None):
        """
        Instantiate `Marshall` with a Schema class,
        which will give form to the payload of the actual response schema
        used to produce the responses.

        :param schema: Marshmallow schema detailing the structure and type of the data to marshal as payload.
        """

        if schema is None:
            self.schema = ResponseSchema
        else:

            class MarshallingSchema(ResponseSchema):
                payload = fields.Nested(schema)  # type: ignore

            self.schema = MarshallingSchema

    def __call__(self, f: Callable) -> Callable:
        """
        Decorate the view with the Marshalling schema class, so that it will be used
        to serialize any value returned by the view, as the payload of the `ResponseSchema`.

        :param f: The view to decorate
        :return: the decorated view
        """

        @wraps(f)
        def marshal_decorator(*args, **kwargs):
            resp_data = f(*args, **kwargs)

            if isinstance(resp_data, WerkzeugResponse):
                # No need to Marshal again, someone else already did that
                return resp_data

            if resp_data.get('error', False):
                processed = ResponseSchema().dump(resp_data)
                response = current_app.response_class(json.dumps(processed), mimetype='application/json')
                return response

            processed = self.schema().dump(resp_data)
            response = current_app.response_class(json.dumps(processed), mimetype='application/json')
            return response

        return marshal_decorator


class RequestSchema(Schema):
    """
    Basic Schema to validate requests from the front side app,
    that will acquire different payloads depending on the actual request being made.

    The basic structure of this schema is:
    * csrf_token: CSRF token sent from the front side app.
    * payload: (optional) additional data sent from the frontend and specific to the request.
    """

    csrf_token = fields.String(required=True)

    @validates('csrf_token')
    def verify_csrf_token(self, value: str) -> None:
        """
        validate the CSRF token in requests from the front side app.

        :param value: The CSRF token to validate
        :raises ValidationError: When the provided CRF token does not validate.
        """

        csrf_check_headers()

        method = current_app.config['HASH_METHOD']
        token = f'{method}:{value}'

        secret = current_app.config['SECRET_KEY']
        key = session['user_key'] + secret

        if not check_password_hash(token, key):
            raise ValidationError('CSRF token failed to validate')

    @post_load
    def post_processing(self, in_data: dict, **kwargs) -> dict:
        """
        Remove csrf token from data forwarded to views, once it has been validated.

        :param in_data: The data about to be returned from the schema
        :return: The provided data, without the csrf_token key
        """
        del in_data['csrf_token']
        return in_data


class _UnMarshal(object):
    """
    Decorator class for Flask views,
    That will extract data from the requests, deserialize it, validate it,
    and provide it to the views in the form of dicts and lists.

    We provide 2 subclasses of this, that share the `__call__` method defined hre:
    * UnMarshal: To unmarshal requests to views protected by a CSRF token
    * UnMarshalNoCSRF: To unmarshal requests to views not protected by a CSRF token
    """

    def __call__(self, f: Callable) -> Callable:
        """
        Decorate the view with the UnMarshalling schema class, so that it will be used
        to deserialize any value sent to the view, aan set it as the payload of the
        `RequestSchema`.

        :param f: The view to decorate
        :return: the decorated view
        """

        @wraps(f)
        def unmarshal_decorator():
            try:
                json_data = request.get_json()
                current_app.logger.debug(f'Data received: {str(json_data)[:100]}')
                if json_data is None:
                    json_data = {}
                unmarshal_result = self.schema().load(json_data)
                return f(unmarshal_result['payload'])
            except ValidationError as e:
                error = e.normalized_messages()
                current_app.logger.error(f"Errors Unmarshaling data for {session['eppn']}: {error}")
                error_msg = gettext('There was an error. Please try again, or contact the site administrator.')
                data = {'error': True, 'message': error_msg}
                return ResponseSchema().dump(data)

        return unmarshal_decorator


class UnMarshal(_UnMarshal):
    """
    Decorator class for Flask views,
    That will extract data from the requests, deserialize it, validate it,
    and provide it to the views in the form of dicts and lists.

    The unmarshalling will check for a valid CSRF token in the request, and raise
    a ValidationError in case there is no such token.
    """

    def __init__(self, schema: Optional[Type[Schema]] = None):
        """
        Instantiate the class with a view specific schema,
        that will parse and validate the request data that is specific to the decorated view,
        in the payload.

        :param schema: The schema detailing the expected structure and type of the received data.
        """

        if schema is None:
            self.schema = RequestSchema
        else:

            class UnMarshallingSchema(RequestSchema):
                payload = fields.Nested(schema)  # type: ignore

            self.schema = UnMarshallingSchema


class UnMarshalNoCSRF(_UnMarshal):
    """
    Decorator class for Flask views,
    That will extract data from the requests, validate it,
    and provide it to the views in the form of dicts and lists.

    The unmarshalling will not check for a valid CSRF token in the request.
    """

    def __init__(self, schema: Type[Schema]):
        """
        Instantiate the class with a view specific schema,
        that will parse and validate the request data that is specific to the decorated view,
        in the payload.

        :param schema: The schema detailing the expected structure and type of the received data.
        """

        class UnMarshallingSchema(Schema):
            payload = fields.Nested(schema)  # type: ignore

        self.schema = UnMarshallingSchema
