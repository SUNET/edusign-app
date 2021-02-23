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

SESSION_COOKIE_DOMAIN = os.environ.get('SP_HOSTNAME', default='sp.edusign.docker')
SESSION_COOKIE_PATH = os.environ.get('SESSION_COOKIE_PATH', default='/sign')
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', default=True)

SERVER_NAME = os.environ.get('SP_HOSTNAME', default='sp.edusign.docker')

PREFERRED_URL_SCHEME = 'https'

HASH_METHOD = 'sha256'
SALT_LENGTH = 8

BABEL_DEFAULT_LOCALE = 'en'
BABEL_DEFAULT_TIMEZONE = 'UTC'
BABEL_TRANSLATION_DIRECTORIES = 'translations'
BABEL_DOMAIN = 'messages'

EDUSIGN_API_BASE_URL = os.environ.get('EDUSIGN_API_BASE_URL', default='https://sig.idsec.se/signint/v1/')
EDUSIGN_API_PROFILE = os.environ.get('EDUSIGN_API_PROFILE', default='edusign-test')
EDUSIGN_API_USERNAME = os.environ.get('EDUSIGN_API_USERNAME', default='dummy')
EDUSIGN_API_PASSWORD = os.environ.get('EDUSIGN_API_PASSWORD', default='dummy')

SIGN_REQUESTER_ID = os.environ.get('SIGN_REQUESTER_ID', default="https://sig.idsec.se/shibboleth")

DEBUG_IDP = os.environ.get('DEBUG_IDP', default='https://login.idp.eduid.se/idp.xml')
DEBUG_AUTHN_CONTEXT = os.environ.get(
    'DEBUG_AUTHN_CONTEXT', default='https://www.swamid.se/specs/id-fido-u2f-ce-transports'
)

RAW_SIGNER_ATTRIBUTES = os.environ.get(
    'SIGNER_ATTRIBUTES',
    default='urn:oid:2.5.4.42,givenName;urn:oid:2.5.4.4,sn;urn:oid:0.9.2342.19200300.100.1.3,mail;urn:oid:2.16.840.1.113730.3.1.241,displayName',
)

SIGNER_ATTRIBUTES = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_SIGNER_ATTRIBUTES.split(';')}

STORAGE_CLASS_PATH = os.environ.get('STORAGE_CLASS_PATH', default='edusign_webapp.document.storage.local.LocalStorage')
LOCAL_STORAGE_BASE_DIR = os.environ.get('LOCAL_STORAGE_BASE_DIR', default='/tmp')

DOC_METADATA_CLASS_PATH = os.environ.get(
    'DOC_METADATA_CLASS_PATH', default='edusign_webapp.document.metadata.sqlite.SqliteMD'
)
SQLITE_MD_DB_PATH = os.environ.get('SQLITE_MD_DB_PATH', default='/tmp/test.db')

TO_TEAR_DOWN_WITH_APP_CONTEXT = os.environ.get(
    'TO_TEAR_DOWN_WITH_APP_CONTEXT', default='edusign_webapp.document.metadata.sqlite.close_connection'
).split(',')


MAIL_SERVER = os.environ.get('MAIL_SERVER', default='localhost')
MAIL_PORT = os.environ.get('MAIL_PORT', default=25)
MAIL_USERNAME = os.environ.get('MAIL_USERNAME', default='')
MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', default='')
MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', default='no-reply@localhost')

MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', default=False)
MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', default=False)
MAIL_DEBUG = DEBUG
MAIL_MAX_EMAILS = os.environ.get('MAIL_MAX_EMAILS', default=None)
MAIL_SUPPRESS_SEND = os.environ.get('MAIL_SUPPRESS_SEND', default='app.testing')
MAIL_ASCII_ATTACHMENTS = os.environ.get('MAIL_ASCII_ATTACHMENTS', default=False)
