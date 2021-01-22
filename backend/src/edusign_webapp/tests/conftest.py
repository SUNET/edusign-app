# -*- coding: utf-8 -*-
#
# Copyright (c) 2021 SUNET
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
from base64 import b64encode

import pytest

from edusign_webapp import run


config_dev = {
    'TESTING': True,
    'ENVIRONMENT': 'development'
}


config_pro = {
    'TESTING': True,
    'ENVIRONMENT': 'production'
}


@pytest.fixture(params=[config_dev, config_pro])
def client(request):
    run.app.config.update(request.param)

    with run.app.test_client() as client:
        client.environ_base["HTTP_EDUPERSONPRINCIPALNAME"] = 'dummy-eppn'
        client.environ_base["HTTP_GIVENNAME"] = b64encode('<Attribute>Tëster</Attribute>'.encode("utf-8"))
        client.environ_base["HTTP_SN"] = b64encode(b'<Attribute>Testing</Attribute>')
        client.environ_base["HTTP_MAIL"] = b64encode(b'<Attribute>tester@example.org</Attribute>')
        client.environ_base["HTTP_SHIB_IDENTITY_PROVIDER"] = 'https://idp'
        client.environ_base["HTTP_SHIB_AUTHENTICATION_METHOD"] = 'dummy'
        client.environ_base["HTTP_SHIB_AUTHNCONTEXT_CLASS"] = 'dummy'

        yield client
