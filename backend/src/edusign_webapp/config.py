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
SESSION_COOKIE_SECURE_RAW = os.environ.get('SESSION_COOKIE_SECURE', default=True)
SESSION_COOKIE_NAME = os.environ.get('SESSION_COOKIE_NAME', default='session')
SESSION_COOKIE_SAMESITE = 'None'

SESSION_COOKIE_SECURE = get_boolean(SESSION_COOKIE_SECURE_RAW)

APP_IN_TWO_PATHS_RAW = os.environ.get('APP_IN_TWO_PATHS', default=False)

APP_IN_TWO_PATHS = get_boolean(APP_IN_TWO_PATHS_RAW)

SERVER_NAME = os.environ.get('SP_HOSTNAME', default='edusign.sunet.se')

PREFERRED_URL_SCHEME = os.environ.get('PREFERRED_URL_SCHEME', default='https')

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

SIGN_REQUESTER_ID = os.environ.get('SIGN_REQUESTER_ID', default="https://sig.idsec.se/edusign-test")

MULTISIGN_BUTTONS = os.environ.get('MULTISIGN_BUTTONS', default="yes")

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

MAX_SIGNATURES = int(os.environ.get('MAX_SIGNATURES', default=10))

CUSTOMISATION_DIR = os.environ.get('CUSTOMISATION_DIR', default="/etc/edusign/")

#############################################

CUSTOM_FAVICON = \
"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAA"
"AA3ElEQVQ4y83SMUoEQRCF4a+1AwMjI5nIQJjME6iJYOABBPECgoGBzCFkTDb1DJp5Bw"
"0MTRpBTFyMFzERtk2GZRGn2THRgqapqv4LXvXjryPAuKn3cZFZHQA+VG06il1+jrWQ3S"
"46IAdPECGzErLH6jKdDpUQfyq+NvV64LDAveO6atMk9ujbwKiswR6OY0/7HssF/EawOZ"
"MQmAqMm3r+0fQ7VbVJ92uz3lJ3v8gO8Fk4u6UlngnulH3w3DugatMEV79xYuw0naAewG"
"3hbc5IeUcO2wvbOPiQtf5FfAEKjDf+u4objAAAAABJRU5ErkJggg=="

CUSTOM_EDUSIGN_LOGO = \
"data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0"
"iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9y"
"Zy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDI3LjIgOC43IiBzdHlsZ"
"T0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNy4yIDguNzsiIHhtbDpzcGFjZT0icHJlc2Vydm"
"UiPiA8c3R5bGUgdHlwZT0idGV4dC9jc3MiPiAuc3Qwe2VuYWJsZS1iYWNrZ3JvdW5kOm5ldyAgICA"
"7fSAuc3Qxe2ZpbGw6IzkwOTA5MDt9IC5zdDJ7ZmlsbDojRkY1MDBEO30gPC9zdHlsZT4gPGcgaWQ9"
"ImVkdVNpZ25fMV8iPiA8ZyBjbGFzcz0ic3QwIj4gPHBhdGggY2xhc3M9InN0MSIgZD0iTTIuMyw2L"
"jdjLTAuNiwwLTEuMS0wLjItMS41LTAuNlMwLjMsNS4yLDAuMyw0LjZWNC41YzAtMC40LDAuMS0wLj"
"gsMC4yLTEuMVMxLDIuNywxLjMsMi42czAuNi0wLjMsMS0wLjMgYzAuNiwwLDEsMC4yLDEuMywwLjZ"
"TNCwzLjcsNCw0LjR2MC40SDEuM2MwLDAuMywwLjEsMC42LDAuMywwLjhzMC41LDAuMywwLjgsMC4z"
"YzAuNCwwLDAuOC0wLjIsMS4xLTAuNUw0LDUuOSBDMy44LDYuMSwzLjYsNi4zLDMuMyw2LjVTMi43L"
"DYuNywyLjMsNi43eiBNMi4yLDNDMiwzLDEuOCwzLjEsMS42LDMuM1MxLjMsMy44LDEuMyw0LjFoMS"
"44VjRjMC0wLjMtMC4xLTAuNi0wLjMtMC43UzIuNSwzLDIuMiwzeiAiLz4gPHBhdGggY2xhc3M9InN"
"0MSIgZD0iTTQuMyw0LjRjMC0wLjcsMC4yLTEuMiwwLjUtMS42czAuNy0wLjYsMS4yLTAuNmMwLjQs"
"MCwwLjgsMC4yLDEuMSwwLjVWMC42SDh2Nkg3LjFsMC0wLjQgQzYuOCw2LjUsNi40LDYuNyw1LjksN"
"i43QzUuNCw2LjcsNSw2LjUsNC43LDYuMVM0LjMsNS4xLDQuMyw0LjR6IE01LjIsNC41YzAsMC40LD"
"AuMSwwLjgsMC4yLDFzMC40LDAuNCwwLjcsMC40IGMwLjQsMCwwLjctMC4yLDAuOS0wLjVWMy42QzY"
"uOSwzLjIsNi42LDMuMSw2LjIsMy4xYy0wLjMsMC0wLjUsMC4xLTAuNywwLjRTNS4yLDQsNS4yLDQu"
"NXoiLz4gPHBhdGggY2xhc3M9InN0MSIgZD0iTTExLjIsNi4yYy0wLjMsMC4zLTAuNywwLjUtMS4yL"
"DAuNWMtMC41LDAtMC44LTAuMS0xLTAuNFM4LjYsNS42LDguNiw1LjFWMi40aDAuOXYyLjdjMCwwLj"
"UsMC4yLDAuOCwwLjcsMC44IGMwLjUsMCwwLjgtMC4yLDAuOS0wLjV2LTNoMC45djQuMmgtMC45TDE"
"xLjIsNi4yeiIvPiA8L2c+IDxnIGNsYXNzPSJzdDAiPiA8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTUu"
"OCw1LjFjMC0wLjItMC4xLTAuNC0wLjMtMC42cy0wLjUtMC4zLTEtMC40Yy0wLjUtMC4xLTAuOC0wL"
"jMtMS4xLTAuNWMtMC41LTAuMy0wLjgtMC44LTAuOC0xLjMgYzAtMC41LDAuMi0wLjgsMC42LTEuMX"
"MwLjktMC40LDEuNS0wLjRjMC40LDAsMC43LDAuMSwxLjEsMC4yYzAuMywwLjEsMC42LDAuNCwwLjc"
"sMC42YzAuMiwwLjMsMC4zLDAuNiwwLjMsMC45aC0xIGMwLTAuMy0wLjEtMC41LTAuMy0wLjdjLTAu"
"Mi0wLjItMC41LTAuMy0wLjgtMC4zYy0wLjMsMC0wLjYsMC4xLTAuOCwwLjJjLTAuMiwwLjEtMC4zL"
"DAuMy0wLjMsMC42YzAsMC4yLDAuMSwwLjQsMC4zLDAuNSBjMC4yLDAuMSwwLjUsMC4zLDEsMC40Yz"
"AuNCwwLjEsMC44LDAuMywxLjEsMC40YzAuMywwLjIsMC41LDAuNCwwLjYsMC42czAuMiwwLjUsMC4"
"yLDAuOGMwLDAuNS0wLjIsMC45LTAuNSwxLjFzLTAuOSwwLjQtMS41LDAuNCBjLTAuNCwwLTAuOC0w"
"LjEtMS4xLTAuMnMtMC42LTAuNC0wLjgtMC42cy0wLjMtMC42LTAuMy0wLjloMWMwLDAuMywwLjEsM"
"C42LDAuMywwLjhjMC4yLDAuMiwwLjUsMC4zLDAuOSwwLjMgYzAuMywwLDAuNi0wLjEsMC44LTAuMk"
"MxNS44LDUuNSwxNS44LDUuMywxNS44LDUuMXoiLz4gPHBhdGggY2xhc3M9InN0MiIgZD0iTTE3LjM"
"sMS4zYzAtMC4xLDAtMC4zLDAuMS0wLjRjMC4xLTAuMSwwLjItMC4xLDAuNC0wLjFzMC4zLDAsMC40"
"LDAuMXMwLjEsMC4yLDAuMSwwLjRjMCwwLjEsMCwwLjMtMC4xLDAuNCBTMTgsMS44LDE3LjgsMS44c"
"y0wLjMsMC0wLjQtMC4xQzE3LjMsMS41LDE3LjMsMS40LDE3LjMsMS4zeiBNMTguMyw2LjZoLTAuOV"
"YyLjRoMC45VjYuNnoiLz4gPHBhdGggY2xhc3M9InN0MiIgZD0iTTE4LjgsNC40YzAtMC43LDAuMi0"
"xLjIsMC41LTEuNnMwLjctMC42LDEuMi0wLjZjMC41LDAsMC45LDAuMiwxLjEsMC41bDAtMC40aDAu"
"OXY0LjFjMCwwLjYtMC4yLDEtMC41LDEuMyBjLTAuMywwLjMtMC44LDAuNS0xLjQsMC41Yy0wLjMsM"
"C0wLjYtMC4xLTAuOS0wLjJjLTAuMy0wLjEtMC41LTAuMy0wLjctMC41TDE5LjUsN2MwLjMsMC4zLD"
"AuNywwLjUsMS4xLDAuNSBjMC4zLDAsMC42LTAuMSwwLjctMC4zYzAuMi0wLjIsMC4zLTAuNCwwLjM"
"tMC44VjYuMmMtMC4zLDAuMy0wLjYsMC41LTEuMSwwLjVjLTAuNSwwLTAuOS0wLjItMS4yLTAuNkMx"
"OSw1LjcsMTguOCw1LjEsMTguOCw0LjR6IE0xOS44LDQuNWMwLDAuNCwwLjEsMC44LDAuMywxYzAuM"
"iwwLjIsMC40LDAuNCwwLjcsMC40YzAuNCwwLDAuNy0wLjIsMC45LTAuNVYzLjVjLTAuMi0wLjMtMC"
"41LTAuNS0wLjgtMC41IGMtMC4zLDAtMC42LDAuMS0wLjcsMC40QzE5LjksMy43LDE5LjgsNCwxOS4"
"4LDQuNXoiLz4gPHBhdGggY2xhc3M9InN0MiIgZD0iTTI0LjEsMi40bDAsMC41YzAuMy0wLjQsMC43"
"LTAuNiwxLjItMC42YzAuOSwwLDEuMywwLjUsMS4zLDEuNXYyLjhoLTAuOVYzLjhjMC0wLjMtMC4xL"
"TAuNS0wLjItMC42IGMtMC4xLTAuMS0wLjMtMC4yLTAuNi0wLjJjLTAuNCwwLTAuNywwLjItMC45LD"
"AuNXYzaC0wLjlWMi40SDI0LjF6Ii8+IDwvZz4gPC9nPiA8L3N2Zz4="

CUSTOM_COMPANY_LOGO = \
"data:image/png;base64,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"
