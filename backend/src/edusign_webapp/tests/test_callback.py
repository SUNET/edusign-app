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


def test_sign_service_callback(client):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    sign_response = b64encode(b'Dummy Sign Response')

    data = {
        'Binding': 'POST/XML/1.0',
        'RelayState': '09d91b6f-199c-4388-a4e5-230807dd4ac4',
        'EidSignResponse': sign_response,
    }

    response = client.post(
        '/sign/callback',
        data=data,
    )

    assert response.status == '200 OK'

    assert b"<title>eduSign</title>" in response.data
    assert sign_response in response.data


def test_sign_service_callback_no_sign_response(client):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    data = {
        'Binding': 'POST/XML/1.0',
        'RelayState': '09d91b6f-199c-4388-a4e5-230807dd4ac4',
    }

    response = client.post(
        '/sign/callback',
        data=data,
    )

    assert response.status == '400 BAD REQUEST'


def test_sign_service_callback_no_relay_state(client):
    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    sign_response = b64encode(b'Dummy Sign Response')

    data = {
        'Binding': 'POST/XML/1.0',
        'EidSignResponse': sign_response,
    }

    response = client.post(
        '/sign/callback',
        data=data,
    )

    assert response.status == '400 BAD REQUEST'
