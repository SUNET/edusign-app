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

DEBUG = os.environ.get('DEBUG', default=False)
if isinstance(DEBUG, str):
    if DEBUG in ('t', 'true', 'True'):
        DEBUG = True
    else:
        DEBUG = False

ENVIRONMENT = os.environ.get('ENVIRONMENT', default='production')

SECRET_KEY = os.environ.get('SECRET_KEY', default='supersecret')

SESSION_COOKIE_DOMAIN = os.environ.get('SERVER_NAME', default='sp.edusign.docker')
SESSION_COOKIE_PATH = os.environ.get('SESSION_COOKIE_PATH', default='/sign')
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', default=True)

SERVER_NAME = os.environ.get('SERVER_NAME', default='sp.edusign.docker')

PREFERRED_URL_SCHEME = 'https'

HASH_METHOD = os.environ.get('HASH_METHOD', default='sha256')
SALT_LENGTH = int(os.environ.get('SALT_LENGTH', default='8'))

BABEL_DEFAULT_LOCALE = os.environ.get('BABEL_DEFAULT_LOCALE', default='en')
BABEL_DEFAULT_TIMEZONE = os.environ.get('BABEL_DEFAULT_TIMEZONE', default='UTC')
BABEL_TRANSLATION_DIRECTORIES = 'translations'
BABEL_DOMAIN = 'messages'

EDUSIGN_API_BASE_URL = os.environ.get('EDUSIGN_API_BASE_URL', default='https://sig.idsec.se/signint/v1/')
EDUSIGN_API_PROFILE = os.environ.get('EDUSIGN_API_PROFILE', default='edusign-test')
EDUSIGN_API_USERNAME = os.environ.get('EDUSIGN_API_USERNAME', default='dummy')
EDUSIGN_API_PASSWORD = os.environ.get('EDUSIGN_API_PASSWORD', default='dummy')

ENTITY_ID_URL = os.environ.get('ENTITY_ID_URL', default='/shibboleth')

SIGN_REQUESTER_ID = os.environ.get('SIGN_REQUESTER_ID', default="https://sig.idsec.se/shibboleth")

DEBUG_IDP = os.environ.get('DEBUG_IDP', default='https://login.idp.eduid.se/idp.xml')
DEBUG_AUTHN_CONTEXT = os.environ.get('DEBUG_AUTHN_CONTEXT', default='https://www.swamid.se/specs/id-fido-u2f-ce-transports')
