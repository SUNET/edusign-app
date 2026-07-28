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
Tests for the app factory and WSGI helpers in run.py.
"""
import io
from copy import copy

from werkzeug.test import create_environ

from edusign_webapp import run
from edusign_webapp.tests.conftest import config_dev


def test_get_locale_from_cookie():
    with run.app.test_request_context(headers={'Cookie': 'lang=sv'}):
        assert run.get_locale() == 'sv'


def test_get_locale_from_accept_languages():
    with run.app.test_request_context(headers={'Accept-Language': 'sv'}):
        assert run.get_locale() == 'sv'


def test_e2e_app_has_email_msgs_extension():
    config = copy(config_dev)
    config['ENVIRONMENT'] = 'e2e'
    app = run.edusign_init_app('testing', config)
    assert app.extensions['email_msgs'] == {}


def test_app_in_two_paths_registers_second_blueprint():
    config = copy(config_dev)
    config['APP_IN_TWO_PATHS'] = True
    app = run.edusign_init_app('testing', config)
    assert 'edusign2' in app.blueprints


def test_logging_middleware():
    def wsgi_app(environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return [b'ok']

    middleware = run.LoggingMiddleware(wsgi_app)
    errors = io.StringIO()
    environ = create_environ('/', 'http://test.localhost/')
    environ['wsgi.errors'] = errors

    statuses = []

    def start_response(status, headers, *args):
        statuses.append(status)

    body = middleware(environ, start_response)

    assert body == [b'ok']
    assert statuses == ['200 OK']
    logged = errors.getvalue()
    assert 'REQUEST' in logged
    assert 'RESPONSE' in logged
