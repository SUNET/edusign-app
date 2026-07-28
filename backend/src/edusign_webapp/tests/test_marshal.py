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
"""
Tests for the request/response marshalling helpers in marshal.py.
"""
import pytest
from flask import session
from marshmallow import ValidationError

from edusign_webapp.marshal import Marshal, RequestSchema, ResponseSchema, UnMarshal, csrf_check_headers


def test_csrf_check_headers_ok(app):
    _, app = app
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://test.localhost',
        'X-Forwarded-Host': 'test.localhost',
    }
    with app.test_request_context(headers=headers):
        csrf_check_headers()


def test_csrf_check_headers_missing_custom_header(app):
    _, app = app
    with app.test_request_context():
        with pytest.raises(ValidationError, match='X-Requested-With'):
            csrf_check_headers()


def test_csrf_check_headers_origin_from_referer(app):
    _, app = app
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://test.localhost/sign/',
        'X-Forwarded-Host': 'test.localhost',
    }
    with app.test_request_context(headers=headers):
        csrf_check_headers()


def test_csrf_check_headers_no_origin(app):
    _, app = app
    with app.test_request_context(headers={'X-Requested-With': 'XMLHttpRequest'}):
        with pytest.raises(ValidationError, match='cannot check origin'):
            csrf_check_headers()


def test_csrf_check_headers_no_forwarded_host(app):
    _, app = app
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://test.localhost',
    }
    with app.test_request_context(headers=headers):
        with pytest.raises(ValidationError, match='X-Forwarded-Host'):
            csrf_check_headers()


def test_csrf_check_headers_cross_origin(app):
    _, app = app
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://evil.example.com',
        'X-Forwarded-Host': 'test.localhost',
    }
    with app.test_request_context(headers=headers):
        with pytest.raises(ValidationError, match='cross origin'):
            csrf_check_headers()


def test_unmarshal_null_json_gives_error_response(app):
    _, app = app

    @UnMarshal()
    def view(payload):  # pragma: no cover
        return {'payload': payload}

    # a body of 'null' parses to None, which the decorator replaces with {};
    # the empty dict then fails validation (missing csrf_token)
    with app.test_request_context(method='POST', data='null', content_type='application/json'):
        session['eppn'] = 'dummy-eppn@example.org'
        response = view()

    assert response['error'] is True
    assert 'message' in response


def test_unmarshal_default_schema():
    assert UnMarshal().schema is RequestSchema


def test_marshal_default_schema():
    assert Marshal().schema is ResponseSchema
