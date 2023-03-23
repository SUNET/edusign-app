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
import json
from unittest import TestCase

import pytest

from edusign_webapp.marshal import ResponseSchema


def _test_get_form(app, environ_base, monkeypatch, form_data):
    _, app = app

    client = app.test_client()
    client.environ_base.update(environ_base)

    response1 = client.get('/sign/')

    assert response1.status == '200 OK'

    doc_data = {'payload': {'document': form_data['pdf']}}

    with app.test_request_context():
        with client.session_transaction() as sess:
            csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)['csrf_token']
            user_key = sess['user_key']

    from flask.sessions import SecureCookieSession

    def mock_getitem(self, key):
        if key == 'user_key':
            return user_key
        self.accessed = True
        return super(SecureCookieSession, self).__getitem__(key)

    monkeypatch.setattr(SecureCookieSession, '__getitem__', mock_getitem)

    doc_data['csrf_token'] = csrf_token

    response = client.post(
        '/sign/get-form',
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://test.localhost',
            'X-Forwarded-Host': 'test.localhost',
        },
        json=doc_data,
    )

    assert response.status == '200 OK'

    resp_data = json.loads(response.data)

    d1 = {'fields': resp_data['payload']['fields']}
    d2 = {'fields': form_data['schema']}

    tc = TestCase()
    tc.maxDiff = None
    tc.assertEqual(d1, d2)


@pytest.mark.skip(reason="We do not do this any more. Transform these to test filling in a PDF form")
def test_get_form_1(app, environ_base, monkeypatch, sample_form_1):
    _test_get_form(app, environ_base, monkeypatch, sample_form_1)


@pytest.mark.skip(reason="We do not do this any more. Transform these to test filling in a PDF form")
def test_get_form_2(app, environ_base, monkeypatch, sample_form_2):
    _test_get_form(app, environ_base, monkeypatch, sample_form_2)
