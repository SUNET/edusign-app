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
from copy import deepcopy
from datetime import timedelta

from edusign_webapp.doc_store import DocStore
from edusign_webapp.marshal import ResponseSchema


def _test_create_invited_signature(
    app_and_client,
    environ_base,
    monkeypatch,
    sample_doc_1,
    sample_invites_1,
    loa,
):
    app, client = app_and_client

    new_doc = deepcopy(sample_doc_1)

    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=1)

    from edusign_webapp.api_client import APIClient

    def mock_post(self, url, *args, **kwargs):
        if "prepare" in url:
            return {
                "policy": "edusign-test",
                "updatedPdfDocumentReference": "ba26478f-f8e0-43db-991c-08af7c65ed58",
                "visiblePdfSignatureRequirement": {
                    "fieldValues": {"idp": "https://login.idp.eduid.se/idp.xml"},
                    "page": 2,
                    "scale": -74,
                    "signerName": {
                        "formatting": None,
                        "signerAttributes": [
                            {"name": "urn:oid:2.5.4.42"},
                            {"name": "urn:oid:2.5.4.4"},
                            {"name": "urn:oid:0.9.2342.19200300.100.1.3"},
                        ],
                    },
                    "templateImageRef": "eduSign-image",
                    "xposition": 37,
                    "yposition": 165,
                },
            }

        return {
            "binding": "POST/XML/1.0",
            "destinationUrl": "https://sig.idsec.se/sigservice-dev/request",
            "relayState": "31dc573b-ab7d-496c-845e-cae8792ba063",
            "signRequest": "DUMMY SIGN REQUEST",
            "state": {"id": "31dc573b-ab7d-496c-845e-cae8792ba063"},
        }

    monkeypatch.setattr(APIClient, "_post", mock_post)

    client.environ_base.update(environ_base)

    response1 = client.get("/sign/")

    assert response1.status == "200 OK"

    with client.session_transaction() as sess:
        csrf_token = ResponseSchema().get_csrf_token({}, sess=sess)["csrf_token"]
        user_key = sess["user_key"]

        from flask.sessions import SecureCookieSession

        def mock_getitem(self, key):
            if key == "user_key":
                return user_key
            self.accessed = True
            return super(SecureCookieSession, self).__getitem__(key)

        monkeypatch.setattr(SecureCookieSession, "__getitem__", mock_getitem)

        doc_data = {
            "csrf_token": csrf_token,
            "payload": {
                "document": new_doc,
                "owner": "tester@example.org",
                "invites": sample_invites_1,
                "text": "text to send",
                "sendsigned": True,
                "skipfinal": True,
                "loa": loa,
                "ordered": False,
            },
        }

        response = client.post(
            "/sign/create-multi-sign",
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Origin": "https://test.localhost",
                "X-Forwarded-Host": "test.localhost",
            },
            json=doc_data,
        )

        assert response.status == "200 OK"

        return client.get(
            '/sign/config',
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Origin": "https://test.localhost",
                "X-Forwarded-Host": "test.localhost",
            },
        )


def test_create_invited_signature(app_and_client, environ_base, monkeypatch, sample_owned_doc_1, sample_invites_1):
    response = _test_create_invited_signature(
        app_and_client, environ_base, monkeypatch, sample_owned_doc_1, sample_invites_1, 'low'
    )

    assert 'test1.pdf' == json.loads(response.data)['payload']['owned_multisign'][0]['name']
    assert 'low,Low' == json.loads(response.data)['payload']['owned_multisign'][0]['loa']


def test_create_invited_signature_insifficient_loa(
    app_and_client, environ_base, monkeypatch, sample_owned_doc_1, sample_invites_1
):
    response = _test_create_invited_signature(
        app_and_client, environ_base, monkeypatch, sample_owned_doc_1, sample_invites_1, 'high'
    )

    assert 'test1.pdf' == json.loads(response.data)['payload']['owned_multisign'][0]['name']
    assert 'high,High' == json.loads(response.data)['payload']['owned_multisign'][0]['loa']
