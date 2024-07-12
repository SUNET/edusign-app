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
from functools import wraps
from typing import Callable, Optional, Type

from flask import abort, current_app, request, session
from flask_babel import gettext
from marshmallow import Schema, ValidationError, fields

from edusign_webapp.marshal import Marshal, UnMarshal
from edusign_webapp.validators import (
    validate_nonempty,
)


class APIResponseSchema(Schema):
    """
    Basic Schema for responses to API requests,
    that will acquire different payloads depending on the actual request being made.
    These payloads will be constructed from the Schemata that the views use to marshal their responses.
    The basic structure of this schema is:
    * message: a string message informing about the results of the request
    * error: a boolean indicating whether there was any error while processing the request
    * payload: an arbitrary structure (optionally) added from the output from the view.
    """

    message = fields.String(required=False)
    error = fields.Boolean(dump_default=False)


class APIMarshal(object):
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
            self.schema = APIResponseSchema
        else:

            class APIMarshallingSchema(APIResponseSchema):
                payload = fields.Nested(schema)  # type: ignore

            self.schema = APIMarshallingSchema

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

            if resp_data.get('error', False):
                processed = APIResponseSchema().dump(resp_data)
                response = current_app.response_class(json.dumps(processed), mimetype='application/json')
                return response

            processed = self.schema().dump(resp_data)
            response = current_app.response_class(json.dumps(processed), mimetype='application/json')
            return response

        return marshal_decorator


class PersonalDataSchema(Schema):
    eppn = fields.String(required=True, validate=[validate_nonempty])
    display_name = fields.String(required=True, validate=[validate_nonempty])
    mail = fields.List(fields.String())
    assurance = fields.List(fields.String())
    idp = fields.String(required=True, validate=[validate_nonempty])
    authn_context = fields.String(required=True, validate=[validate_nonempty])
    organization = fields.String(required=True, validate=[validate_nonempty])
    registration_authority = fields.String(required=True, validate=[validate_nonempty])
    saml_attr_schema = fields.String(required=True, validate=[validate_nonempty])
    invited_unauthn = fields.Boolean(dump_default=True)
    return_url = fields.String(required=True, validate=[validate_nonempty])


def add_to_session(personal_data):
    session['eppn'] = personal_data['eppn']
    session['eduPersonPrincipalName'] = personal_data['eppn']
    session['displayName'] = personal_data['display_name']
    session['mail'] = personal_data['mail'][0]
    session['mail_aliases'] = personal_data['mail']
    session['eduPersonAssurance'] = personal_data['assurance']
    session['idp'] = personal_data['idp']
    session['authn_context'] = personal_data['authn_context']
    session['organizationName'] = personal_data['organization']
    session['registrationAuthority'] = personal_data['registration_authority']
    session['saml-attr-schema'] = personal_data['saml_attr_schema']
    session['invited-unauthn'] = personal_data['invited_unauthn']
    session['api_return_url'] = personal_data['return_url']


class APIRequestSchema(Schema):
    """
    Basic Schema to validate requests from the front side app,
    that will acquire different payloads depending on the actual request being made.

    The basic structure of this schema is:
    * csrf_token: CSRF token sent from the front side app.
    * payload: (optional) additional data sent from the frontend and specific to the request.
    """
    api_key = fields.String(required=True)
    personal_data = fields.Nested(PersonalDataSchema)


class APIUnMarshal(object):
    """
    Decorator class for Flask views,
    That will extract data from the requests, validate it,
    and provide it to the views in the form of dicts and lists.
    """

    def __init__(self, schema: Optional[Type[Schema]] = None):
        """
        Instantiate the class with a view specific schema,
        that will parse and validate the request data that is specific to the decorated view,
        in the payload.

        :param schema: The schema detailing the expected structure and type of the received data.
        """

        if schema is None:
            self.schema = APIRequestSchema
        else:

            class APIUnMarshallingSchema(APIRequestSchema):
                payload = fields.Nested(schema)  # type: ignore

            self.schema = APIUnMarshallingSchema

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
                if unmarshal_result["api_key"] != current_app.config["API_KEY"]:
                    abort(401)

                add_to_session(unmarshal_result['personal_data'])

                return f(unmarshal_result['payload'])

            except ValidationError as e:
                error = e.normalized_messages()
                current_app.logger.error(f"Errors Unmarshaling data for {session['eppn']}: {error}")
                error_msg = gettext('There was an error. Please try again, or contact the site administrator.')
                data = {'error': True, 'message': error_msg}
                return APIResponseSchema().dump(data)

        return unmarshal_decorator


class Routing(object):

    def __init__(self, marshal=None, unmarshal=None, web_views=None, api_views=None):
        self.marshal = Marshal(marshal)
        self.unmarshal = UnMarshal(unmarshal)
        self.api_marshal = APIMarshal(marshal)
        self.api_unmarshal = APIUnMarshal(unmarshal)
        self.web_views = web_views
        self.api_views = api_views

    def __call__(self, f: Callable):

        if self.web_views is not None:
            for view in self.web_views:

                blueprint = view['blueprint']
                route = view['route']
                methods = view['methods']

                routing = blueprint.route(route, methods=methods)

                marshaled = self.marshal(f)
                unmarshaled = self.unmarshal(marshaled)

                routing(unmarshaled)

        if self.api_views is not None:
            for view in self.api_views:

                blueprint = view['blueprint']
                route = view['route']
                methods = view['methods']

                routing = blueprint.route(route, methods=methods)

                marshaled = self.api_marshal(f)
                unmarshaled = self.api_unmarshal(marshaled)

                routing(unmarshaled)
