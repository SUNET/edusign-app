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

import yaml

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

HASH_METHOD = 'scrypt'
SALT_LENGTH = 8

BABEL_DEFAULT_LOCALE = 'sv'
BABEL_DEFAULT_TIMEZONE = 'UTC'
BABEL_TRANSLATION_DIRECTORIES = os.path.join(HERE, 'translations')
BABEL_DOMAIN = 'messages'
RAW_SUPPORTED_LANGUAGES = os.environ.get("SUPPORTED_LANGUAGES", default="en,English;sv,Svenska")
SUPPORTED_LANGUAGES = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_SUPPORTED_LANGUAGES.split(';')}

EDUSIGN_API_BASE_URL = os.environ.get('EDUSIGN_API_BASE_URL', default='https://sig.idsec.se/signint/v1/')
EDUSIGN_API_PROFILE_20 = os.environ.get('EDUSIGN_API_PROFILE_20', default='edusign-test')
EDUSIGN_API_USERNAME_20 = os.environ.get('EDUSIGN_API_USERNAME_20', default='dummy')
EDUSIGN_API_PASSWORD_20 = os.environ.get('EDUSIGN_API_PASSWORD_20', default='dummy')
EDUSIGN_API_PROFILE_11 = os.environ.get('EDUSIGN_API_PROFILE_11', default='edusign-test')
EDUSIGN_API_USERNAME_11 = os.environ.get('EDUSIGN_API_USERNAME_11', default='dummy')
EDUSIGN_API_PASSWORD_11 = os.environ.get('EDUSIGN_API_PASSWORD_11', default='dummy')

SIGN_REQUESTER_ID = os.environ.get('SIGN_REQUESTER_ID', default="https://sig.idsec.se/edusign-test")

VALIDATOR_API_BASE_URL = os.environ.get('VALIDATOR_API_BASE_URL', default='https://sig.idsec.se/sigval/')

MULTISIGN_BUTTONS = os.environ.get('MULTISIGN_BUTTONS', default="yes")

RAW_SIGNER_ATTRIBUTES_11 = os.environ.get(
    'SIGNER_ATTRIBUTES_11',
    default='urn:mace:dir:attribute-def:displayName,displayName',
)

SIGNER_ATTRIBUTES_11 = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_SIGNER_ATTRIBUTES_11.split(';')}

RAW_SIGNER_ATTRIBUTES_20 = os.environ.get(
    'SIGNER_ATTRIBUTES_20',
    default='urn:oid:2.16.840.1.113730.3.1.241,displayName',
)

SIGNER_ATTRIBUTES_20 = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_SIGNER_ATTRIBUTES_20.split(';')}

RAW_AUTHN_ATTRIBUTES_11 = os.environ.get(
    'AUTHN_ATTRIBUTES_11',
    default='urn:mace:dir:attribute-def:eduPersonPrincipalName,eduPersonPrincipalName',
)

AUTHN_ATTRIBUTES_11 = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_AUTHN_ATTRIBUTES_11.split(';')}

RAW_AUTHN_ATTRIBUTES_20 = os.environ.get(
    'AUTHN_ATTRIBUTES_20',
    default='urn:oid:1.3.6.1.4.1.5923.1.1.1.6,eduPersonPrincipalName',
)

AUTHN_ATTRIBUTES_20 = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_AUTHN_ATTRIBUTES_20.split(';')}

RAW_SCOPE_WHITELIST = os.environ.get('SCOPE_WHITELIST', default='eduid.se, sunet.se')

SCOPE_WHITELIST = [scope.lower().strip() for scope in RAW_SCOPE_WHITELIST.split(',')]

RAW_USER_BLACKLIST = os.environ.get('USER_BLACKLIST', default='blacklisted@eduid.se')

USER_BLACKLIST = [eppn.lower().strip() for eppn in RAW_USER_BLACKLIST.split(',')]

RAW_USER_WHITELIST = os.environ.get('USER_WHITELIST', default='whitelisted@eduid.se')

USER_WHITELIST = [eppn.lower().strip() for eppn in RAW_USER_WHITELIST.split(',')]

POLLING = os.environ.get('POLLING', default='always')  # always|inviter|never

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
    default='http://www.swamid.se/;http://www.swamid.se/policy/assurance/al1,http://www.swamid.se/policy/assurance/al2,http://www.swamid.se/policy/assurance/al3|'
    'default;https://refeds.org/assurance/IAP/low,https://refeds.org/assurance/IAP/medium,https://refeds.org/assurance/IAP/high;',
)

_PRE_LOAS = RAW_AVAILABLE_LOAS.strip().strip('|').split('|')

AVAILABLE_LOAS = {}

for pre_loa in _PRE_LOAS:
    AVAILABLE_LOAS[pre_loa.split(";")[0].strip()] = pre_loa.split(";")[1].strip().strip(',').split(',')

MAX_CONTENT_LENGTH = int(os.environ.get('MAX_FILE_SIZE', default=28730982))

MAX_FILE_SIZE_FRONT = int(os.environ.get('MAX_FILE_SIZE_FRONT', default=20971520))

MAX_SIGNATURES = int(os.environ.get('MAX_SIGNATURES', default=10))

CUSTOMIZATION_DIR = os.environ.get('CUSTOMIZATION_DIR', default="/etc/edusign/")

COMPANY_LINK = os.environ.get('COMPANY_LINK', 'https://sunet.se')

RAW_UI_SEND_SIGNED = os.environ.get('UI_SEND_SIGNED', default=True)

UI_SEND_SIGNED = get_boolean(RAW_UI_SEND_SIGNED)

RAW_UI_SKIP_FINAL = os.environ.get('UI_SKIP_FINAL', default=False)

UI_SKIP_FINAL = get_boolean(RAW_UI_SKIP_FINAL)

RAW_UI_ORDERED_INVITATIONS = os.environ.get('UI_ORDERED_INVITATIONS', default=False)

UI_ORDERED_INVITATIONS = get_boolean(RAW_UI_ORDERED_INVITATIONS)

CUSTOM_FORMS_DEFAULTS_FILE = os.environ.get('CUSTOM_FORMS_DEFAULTS_FILE', default="/etc/edusign-forms.yaml")

MD_ENTITY_ID = os.environ.get('MD_ENTITY_ID', default="https://edusign.sunet.se/shibboleth")

RAW_MD_ENTITY_CATEGORIES = os.environ.get(
    'MD_ENTITY_CATEGORIES',
    default="http://www.geant.net/uri/dataprotection-code-of-conduct/v1,https://refeds.org/category/code-of-conduct/v2,http://refeds.org/category/research-and-scholarship",
)
MD_ENTITY_CATEGORIES = RAW_MD_ENTITY_CATEGORIES.split(',')

RAW_MD_DISPLAY_NAMES = os.environ.get(
    'MD_DISPLAY_NAMES', default="sv,SUNET eduSIGN - tjänst för e-signaturer;en,SUNET eduSIGN Service"
)
MD_DISPLAY_NAMES = {
    dname.split(",")[0].strip(): dname.split(",")[1].strip()
    for dname in RAW_MD_DISPLAY_NAMES.strip().strip(';').split(';')
}

RAW_MD_DESCRIPTIONS = os.environ.get(
    'MD_DESCRIPTIONS',
    default="sv,SUNET eduSIGN gör det enkelt att arbeta med e-signaturer;en,SUNET eduSIGN Service makes it easy to electronically sign documents",
)
MD_DESCRIPTIONS = {
    desc.split(",")[0].strip(): desc.split(",")[1].strip() for desc in RAW_MD_DESCRIPTIONS.strip().strip(';').split(';')
}

RAW_MD_INFORMATION_URLS = os.environ.get(
    'MD_INFORMATION_URLS',
    default="sv,https://www.sunet.se/services/sakerhet/edusign/;en,https://www.sunet.se/services/sakerhet/edusign/",
)
MD_INFORMATION_URLS = {
    url.split(",")[0].strip(): url.split(",")[1].strip()
    for url in RAW_MD_INFORMATION_URLS.strip().strip(';').split(';')
}

RAW_MD_PRIVACY_STATEMENT_URLS = os.environ.get(
    'MD_PRIVACY_STATEMENT_URLS',
    default="sv,https://wiki.sunet.se/display/info/eduSign+Privacy+Policy?showLanguage=sv_SE;en,https://wiki.sunet.se/display/info/eduSign+Privacy+Policy?showLanguage=en_GB",
)
MD_PRIVACY_STATEMENT_URLS = {
    url.split(",")[0].strip(): url.split(",")[1].strip()
    for url in RAW_MD_PRIVACY_STATEMENT_URLS.strip().strip(';').split(';')
}

MD_SHIBBOLETH_LOCATION = os.environ.get('MD_SHIBBOLETH_LOCATION', default="https://edusign.sunet.se/Shibboleth.sso")

MD_SIGNING_CERTIFICATE = os.environ.get(
    'MD_SIGNING_CERTIFICATE',
    default="""MIIEAjCCAmqgAwIBAgIUN8YgaACgKdJIfG5ZniLAZK/3WwMwDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAxMQZWR1c2lnbi5zdW5ldC5zZTAeFw0yMDA0MjkxNDEyNDNa
Fw0zMDA0MjcxNDEyNDNaMBsxGTAXBgNVBAMTEGVkdXNpZ24uc3VuZXQuc2UwggGi
MA0GCSqGSIb3DQEBAQUAA4IBjwAwggGKAoIBgQDKbiClJfmnt5Cc8OhoKZ4MzQHX
7+MS1g7JtDGw1ttkWwGtbn4I80TNuiu9S3FUln3cA1/GgilzYXAPT+TOgxPXHmeC
8PNnuj4yc4rJYEhR61BTpP2sEEju4DcXFGvUy8Kd89VUEJ9siIvUMdzK/jOox/p9
SB7NW8nGsfZsmirWH4N2Emh/gx1co1IJQX6/ZVGRzskQvj9sVIOxCGDQKzyAHbHi
D8YXxlEWbSX7+fak8+dB5AY4CzMtyySr991pQW9wDmfweOq7lWNEdLj9gfPY4c29
y+77gk/RB5wpmdfcITI+pOHxwvylYhOhl02VJBFs884dRb2n4PvzeBjvdhMiolVu
g6S2n3iXy4wZmG6y7c86WJA7rQdBUKzTaLjcGdJ62K0+mi8Q50nkCgtnGyz6w99l
OnJpU/3Vf9H96xsablpPVoh1POo1g8lgSWxf/DqNVJvVRF7EismQp/oVOLYvb3LE
Sudb3ZXFXzjKA1YSBIVD8wfOxrvuUGxa7/qxHX8CAwEAAaM+MDwwGwYDVR0RBBQw
EoIQZWR1c2lnbi5zdW5ldC5zZTAdBgNVHQ4EFgQUu3z8fJer1M/P5NuYK163YkEP
ysswDQYJKoZIhvcNAQELBQADggGBAHRH2ratIcyX8c2ZjL+6ChYPkmhD1wSiXOWj
GOMB8SXqnZx/srsqsGnzJllyv3hv+lIyAwKdzH770w9s7CD4nKnycSpCsEUh/Cwm
Zr20pP7oXRJuk7YlFVIx3mfQ0YERsGA8O6VrFuDOnHVsmHZUpEKSW2nVQcXjMT9E
UzgChgJiR7eBnBxzMvZW44AdSSVuFeLACV7K98MztJHCyPdYdhQGMpc12rZQzZnx
ZXG+mRzFsn/MG2hAVqGxpMOseJu1A7tG88rDrrJ81+7gljQGiqoKo7KTfI7zVuB3
ofmGAkPZhwPTCVfav+lzx2qiHWeTCJSa554MLguc10zXiwqGicZ2cWVn/ObWRtEJ
3IRvnkYciEFPHSR14TXwuaCkUD34c2lutnfOYM65XfNo5jbj/4JtUHhN8ISyp/sy
OgE98IGafmnnEjVe5o5q3bQRB13pjWwSTeXFII8/0FkApV1IENNvNiRyiMAj9VZ4
q6i3w8KKR5Zi4g5QHRTk1QFroyidLA==""",
)

MD_ENCRYPTION_CERTIFICATE = os.environ.get(
    'MD_ENCRYPTION_CERTIFICATE',
    default="""MIIEAjCCAmqgAwIBAgIUN8YgaACgKdJIfG5ZniLAZK/3WwMwDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAxMQZWR1c2lnbi5zdW5ldC5zZTAeFw0yMDA0MjkxNDEyNDNa
Fw0zMDA0MjcxNDEyNDNaMBsxGTAXBgNVBAMTEGVkdXNpZ24uc3VuZXQuc2UwggGi
MA0GCSqGSIb3DQEBAQUAA4IBjwAwggGKAoIBgQDKbiClJfmnt5Cc8OhoKZ4MzQHX
7+MS1g7JtDGw1ttkWwGtbn4I80TNuiu9S3FUln3cA1/GgilzYXAPT+TOgxPXHmeC
8PNnuj4yc4rJYEhR61BTpP2sEEju4DcXFGvUy8Kd89VUEJ9siIvUMdzK/jOox/p9
SB7NW8nGsfZsmirWH4N2Emh/gx1co1IJQX6/ZVGRzskQvj9sVIOxCGDQKzyAHbHi
D8YXxlEWbSX7+fak8+dB5AY4CzMtyySr991pQW9wDmfweOq7lWNEdLj9gfPY4c29
y+77gk/RB5wpmdfcITI+pOHxwvylYhOhl02VJBFs884dRb2n4PvzeBjvdhMiolVu
g6S2n3iXy4wZmG6y7c86WJA7rQdBUKzTaLjcGdJ62K0+mi8Q50nkCgtnGyz6w99l
OnJpU/3Vf9H96xsablpPVoh1POo1g8lgSWxf/DqNVJvVRF7EismQp/oVOLYvb3LE
Sudb3ZXFXzjKA1YSBIVD8wfOxrvuUGxa7/qxHX8CAwEAAaM+MDwwGwYDVR0RBBQw
EoIQZWR1c2lnbi5zdW5ldC5zZTAdBgNVHQ4EFgQUu3z8fJer1M/P5NuYK163YkEP
ysswDQYJKoZIhvcNAQELBQADggGBAHRH2ratIcyX8c2ZjL+6ChYPkmhD1wSiXOWj
GOMB8SXqnZx/srsqsGnzJllyv3hv+lIyAwKdzH770w9s7CD4nKnycSpCsEUh/Cwm
Zr20pP7oXRJuk7YlFVIx3mfQ0YERsGA8O6VrFuDOnHVsmHZUpEKSW2nVQcXjMT9E
UzgChgJiR7eBnBxzMvZW44AdSSVuFeLACV7K98MztJHCyPdYdhQGMpc12rZQzZnx
ZXG+mRzFsn/MG2hAVqGxpMOseJu1A7tG88rDrrJ81+7gljQGiqoKo7KTfI7zVuB3
ofmGAkPZhwPTCVfav+lzx2qiHWeTCJSa554MLguc10zXiwqGicZ2cWVn/ObWRtEJ
3IRvnkYciEFPHSR14TXwuaCkUD34c2lutnfOYM65XfNo5jbj/4JtUHhN8ISyp/sy
OgE98IGafmnnEjVe5o5q3bQRB13pjWwSTeXFII8/0FkApV1IENNvNiRyiMAj9VZ4
q6i3w8KKR5Zi4g5QHRTk1QFroyidLA==""",
)

RAW_MD_SERVICE_NAMES = os.environ.get(
    'MD_SERVICE_NAMES', default="sv,SUNET eduSIGN - tjänst för e-signaturer;en,SUNET eduSIGN Service"
)
MD_SERVICE_NAMES = {
    name.split(",")[0].strip(): name.split(",")[1].strip()
    for name in RAW_MD_SERVICE_NAMES.strip().strip(';').split(';')
}

RAW_MD_ATTRIBUTES = os.environ.get(
    'MD_ATTRIBUTES',
    default='eduPersonPrincipalName,urn:oid:1.3.6.1.4.1.5923.1.1.1.6;sn,urn:oid:2.5.4.4;givenName,urn:oid:2.5.4.42;displayName,urn:oid:2.16.840.1.113730.3.1.241;eduPersonAssurance,urn:oid:1.3.6.1.4.1.5923.1.1.1.11;mail,urn:oid:0.9.2342.19200300.100.1.3;mailLocalAddress,urn:oid:2.16.840.1.113730.3.1.13',
)

MD_ATTRIBUTES = {attr.split(',')[0]: attr.split(',')[1] for attr in RAW_MD_ATTRIBUTES.split(';')}

RAW_MD_ORGANIZATION_NAMES = os.environ.get(
    'MD_ORGANIZATION_NAMES', default="sv,Vetenskapsrådet;en,The Swedish Research Council"
)
MD_ORGANIZATION_NAMES = {
    name.split(",")[0].strip(): name.split(",")[1].strip()
    for name in RAW_MD_ORGANIZATION_NAMES.strip().strip(';').split(';')
}

RAW_MD_ORGANIZATION_DISPLAY_NAMES = os.environ.get('MD_ORGANIZATION_DISPLAY_NAMES', default="sv,Sunet;en,Sunet")
MD_ORGANIZATION_DISPLAY_NAMES = {
    name.split(",")[0].strip(): name.split(",")[1].strip()
    for name in RAW_MD_ORGANIZATION_DISPLAY_NAMES.strip().strip(';').split(';')
}

RAW_MD_ORGANIZATION_URLS = os.environ.get(
    'MD_ORGANIZATION_URLS', default="sv,https://www.sunet.se;en,https://www.sunet.se"
)
MD_ORGANIZATION_URLS = {
    name.split(",")[0].strip(): name.split(",")[1].strip()
    for name in RAW_MD_ORGANIZATION_URLS.strip().strip(';').split(';')
}

MD_TECHNICAL_CONTACT_NAME = os.environ.get('MD_TECHNICAL_CONTACT_NAME', default="SUNET")

MD_TECHNICAL_CONTACT_EMAIL = os.environ.get('MD_TECHNICAL_CONTACT_EMAIL', default="mailto:noc@sunet.se")

MD_ADMINISTRATIVE_CONTACT_NAME = os.environ.get('MD_ADMINISTRATIVE_CONTACT_NAME', default="SUNET")

MD_ADMINISTRATIVE_CONTACT_EMAIL = os.environ.get('MD_ADMINISTRATIVE_CONTACT_EMAIL', default="mailto:noc@sunet.se")

MD_SUPPORT_CONTACT_NAME = os.environ.get('MD_SUPPORT_CONTACT_NAME', default="SUNET")

MD_SUPPORT_CONTACT_EMAIL = os.environ.get('MD_SUPPORT_CONTACT_EMAIL', default="mailto:noc@sunet.se")

MD_SECURITY_CONTACT_NAME = os.environ.get('MD_SECURITY_CONTACT_NAME', default="SUNET")

MD_SECURITY_CONTACT_EMAIL = os.environ.get('MD_SECURITY_CONTACT_EMAIL', default="mailto:cert@cert.sunet.se")
