# -*- coding: utf-8 -*-
#
# Copyright (c) 2026 SUNET
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
"""
Tests for the admin dashboard view.
"""

invitation_flags = [
    True,  # sendsigned
    'none',  # loa
    False,  # skipfinal
    False,  # ordered
    False,  # allowbankid
    'Invitation text',  # invitation_text
]


def _add_document_as_tester_invite(client, doc, owner):
    """Add a document to the doc store with the session user among the invited."""
    invites = [{'name': 'Tëster Kid', 'email': 'tester@example.org', 'ssn': '', 'lang': 'en'}]
    app = client.application
    with app.app_context():
        invitations = app.extensions['doc_store'].add_document(doc, owner, invites, *invitation_flags)
    return invitations


def test_admin_dashboard_empty(client):
    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    assert b'Number of documents</td><td>0</td>' in response.data
    assert b'No documents' in response.data
    assert b'No signatures' in response.data


def test_admin_dashboard(client, sample_doc_1, sample_owner_1):
    _add_document_as_tester_invite(client, sample_doc_1, sample_owner_1)
    with client.application.test_request_context():
        client.application.extensions['doc_store'].add_signature(
            'bankid', 'Test Org', 'test.pdf', 'owner-eppn@example.org', '199001019876', 1752000000000
        )

    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    assert b'Number of documents</td><td>1</td>' in response.data
    # the document created today shows as a bar of height 180 in the graph
    assert b'id="docs-per-day"' in response.data
    assert b'height="180.0"' in response.data
    # the payable signature shows in the usage table
    assert b'<td>Test Org</td>' in response.data
    assert b'<td>bankid</td>' in response.data
    assert b'<td>1</td>' in response.data
