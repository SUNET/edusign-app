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

import datetime
import os

HERE = os.path.dirname(__file__)


def get_boolean(raw):
    if isinstance(raw, str):
        if raw in ('t', 'true', 'T', 'True', 'Yes', 'yes'):
            return True
        else:
            return False
    return raw


DEBUG = os.environ.get('DEBUG', default=False)

DEBUG = get_boolean(DEBUG)

ENVIRONMENT = os.environ.get('ENVIRONMENT', default='production')

SECRET_KEY = os.environ.get('SECRET_KEY', default='supersecret')

SESSION_COOKIE_DOMAIN = os.environ.get('SP_HOSTNAME', default='edusign.sunet.se')
SESSION_COOKIE_PATH = os.environ.get('SESSION_COOKIE_PATH', default='/sign')
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', default=True)
SESSION_COOKIE_NAME = os.environ.get('SESSION_COOKIE_NAME', default='session')
SESSION_COOKIE_SAMESITE = 'None'

SERVER_NAME = os.environ.get('SP_HOSTNAME', default='edusign.sunet.se')

PREFERRED_URL_SCHEME = 'https'

HASH_METHOD = 'sha256'
SALT_LENGTH = 8

BABEL_DEFAULT_LOCALE = 'sv'
BABEL_DEFAULT_TIMEZONE = 'UTC'
BABEL_TRANSLATION_DIRECTORIES = os.path.join(HERE, 'translations')
BABEL_DOMAIN = 'messages'
SUPPORTED_LANGUAGES = {'en': 'English', 'sv': 'Svenska'}

EDUSIGN_API_BASE_URL = os.environ.get('EDUSIGN_API_BASE_URL', default='https://sig.idsec.se/signint/v1/')
EDUSIGN_API_PROFILE = os.environ.get('EDUSIGN_API_PROFILE', default='edusign-test')
EDUSIGN_API_USERNAME = os.environ.get('EDUSIGN_API_USERNAME', default='dummy')
EDUSIGN_API_PASSWORD = os.environ.get('EDUSIGN_API_PASSWORD', default='dummy')

SIGN_REQUESTER_ID = os.environ.get('SIGN_REQUESTER_ID', default="https://sig.idsec.se/shibboleth")

MULTISIGN_BUTTONS = os.environ.get('MULTISIGN_BUTTONS', default="yes")

DEBUG_IDP = os.environ.get('DEBUG_IDP', default='https://login.idp.eduid.se/idp.xml')
DEBUG_AUTHN_CONTEXT = os.environ.get('DEBUG_AUTHN_CONTEXT', default='https://refeds.org/profile/mfa')

RAW_SIGNER_ATTRIBUTES = os.environ.get(
    'SIGNER_ATTRIBUTES',
    default='urn:oid:2.16.840.1.113730.3.1.241,displayName',
)

SIGNER_ATTRIBUTES = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_SIGNER_ATTRIBUTES.split(';')}

RAW_SCOPE_WHITELIST = os.environ.get('SCOPE_WHITELIST', default='eduid.se, sunet.se')

SCOPE_WHITELIST = [scope.strip() for scope in RAW_SCOPE_WHITELIST.split(',')]

RAW_USER_BLACKLIST = os.environ.get('USER_BLACKLIST', default='blacklisted@eduid.se')

USER_BLACKLIST = [eppn.strip() for eppn in RAW_USER_BLACKLIST.split(',')]

RAW_USER_WHITELIST = os.environ.get('USER_WHITELIST', default='whitelisted@eduid.se')

USER_WHITELIST = [eppn.strip() for eppn in RAW_USER_WHITELIST.split(',')]

STORAGE_CLASS_PATH = os.environ.get('STORAGE_CLASS_PATH', default='edusign_webapp.document.storage.local.LocalStorage')
LOCAL_STORAGE_BASE_DIR = os.environ.get('LOCAL_STORAGE_BASE_DIR', default='/tmp')

# Do not set AWS_ENDPOINT_URL if you use AWS
AWS_ENDPOINT_URL = os.environ.get('AWS_ENDPOINT_URL', default=None)
if AWS_ENDPOINT_URL == 'none':
    AWS_ENDPOINT_URL = None
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY', default='dummy')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', default='dummy')
AWS_REGION_NAME = os.environ.get('AWS_REGION_NAME', default='eu-north-1')
AWS_BUCKET_NAME = os.environ.get('AWS_BUCKET_NAME', default='edusign-storage')

DOC_METADATA_CLASS_PATH = os.environ.get(
    'DOC_METADATA_CLASS_PATH', default='edusign_webapp.document.metadata.sqlite.SqliteMD'
)
SQLITE_MD_DB_PATH = os.environ.get('SQLITE_MD_DB_PATH', default='/tmp/test.db')

REDIS_URL = os.environ.get('REDIS_URL', default='redis://localhost:6379/0')

DOC_LOCK_TIMEOUT_RAW = os.environ.get('DOC_LOCK_TIMEOUT', default='300')

DOC_LOCK_TIMEOUT = datetime.timedelta(seconds=int(DOC_LOCK_TIMEOUT_RAW))

# Max document age as number of days
MAX_DOCUMENT_AGE_RAW = os.environ.get('MAX_DOCUMENT_AGE', default='30')

MAX_DOCUMENT_AGE = int(MAX_DOCUMENT_AGE_RAW)

TO_TEAR_DOWN_WITH_APP_CONTEXT = os.environ.get(
    'TO_TEAR_DOWN_WITH_APP_CONTEXT', default='edusign_webapp.document.metadata.sqlite.close_connection'
).split(',')

MAIL_DEBUG = DEBUG

MAIL_BACKEND = os.environ.get('MAIL_BACKEND', default='smtp')
MAIL_SERVER = os.environ.get('MAIL_SERVER', default='localhost')
MAIL_PORT = os.environ.get('MAIL_PORT', default=25)
MAIL_USERNAME = os.environ.get('MAIL_USERNAME', default='')
MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', default='')
MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', default='no-reply@localhost')
MAIL_MAX_EMAILS = os.environ.get('MAIL_MAX_EMAILS', default=None)

# Mail timeout in seconds. Set to 55, just above
# the nginx default of 60 for proxy_connect_timeout
MAIL_TIMEOUT = os.environ.get('MAIL_TIMEOUT', default=55)

RAW_MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', default=False)
MAIL_USE_TLS = get_boolean(RAW_MAIL_USE_TLS)

RAW_MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', default=False)
MAIL_USE_SSL = get_boolean(RAW_MAIL_USE_SSL)

RAW_MAIL_SUPPRESS_SEND = os.environ.get('MAIL_SUPPRESS_SEND', default=False)
MAIL_SUPPRESS_SEND = get_boolean(RAW_MAIL_SUPPRESS_SEND)

RAW_MAIL_ASCII_ATTACHMENTS = os.environ.get('MAIL_ASCII_ATTACHMENTS', default=False)
MAIL_ASCII_ATTACHMENTS = get_boolean(RAW_MAIL_ASCII_ATTACHMENTS)

RAW_AVAILABLE_LOAS = os.environ.get(
    'AVAILABLE_LOAS',
    default=(
        'http://www.swamid.se/policy/assurance/al1,Low;'
        'http://www.swamid.se/policy/assurance/al2,Medium;'
        'http://www.swamid.se/policy/assurance/al3,High;'
    ),
)

AVAILABLE_LOAS = {
    loa.split(",")[0].strip(): loa.split(",")[1].strip() for loa in RAW_AVAILABLE_LOAS.strip().strip(';').split(';')
}

MAX_CONTENT_LENGTH = int(os.environ.get('MAX_FILE_SIZE', default=20971520))
