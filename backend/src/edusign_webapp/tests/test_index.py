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
from flask import session


def test_index(client):
    """"""

    response = client.get('/sign/')

    assert response.status == '200 OK'

    assert b"<title>eduSign</title>" in response.data

    assert session.get('eppn') == 'dummy-eppn'
    assert session.get('givenName') == 'Tëster'
    assert session.get('sn') == 'Testing'
    assert session.get('mail') == 'tester@example.org'
    assert session.get('idp') == 'https://idp'
    assert session.get('authn_method') == 'dummy'
    assert session.get('authn_context') == 'dummy'


def test_index_twice(client):
    """"""

    client.get('/sign/')

    response = client.get('/sign/')

    assert response.status == '200 OK'

    assert b"<title>eduSign</title>" in response.data

    assert session.get('eppn') == 'dummy-eppn'
    assert session.get('givenName') == 'Tëster'
    assert session.get('sn') == 'Testing'
    assert session.get('mail') == 'tester@example.org'
    assert session.get('idp') == 'https://idp'
    assert session.get('authn_method') == 'dummy'
    assert session.get('authn_context') == 'dummy'


def test_index_non_whitelisted(client_non_whitelisted):
    """"""

    response = client_non_whitelisted.get('/sign/')

    assert response.status == '200 OK'

    assert b"You are not allowed to create sign requests at eduSign" in response.data

    assert 'eppn' not in session
