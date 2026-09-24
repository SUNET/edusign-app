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

import time
from base64 import b64encode
from datetime import datetime

from edusign_webapp.config import parse_eid_whitelist
from edusign_webapp.utils import add_attributes_to_session_bankid_freja

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


# The admin blueprint's before_request (check_admin_whitelist) identifies the
# user by the Edupersonprincipalname header and 403s / 401s the rest. The test
# client's eppn (dummy-eppn@example.org) is in the conftest ADMIN_WHITELIST.


def test_admin_non_whitelisted(client):
    client.environ_base["HTTP_EDUPERSONPRINCIPALNAME_20"] = 'not-an-admin@example.org'

    response = client.post('/admin/cleanup')
    assert response.status == '403 FORBIDDEN'


def test_admin_no_eppn_header(client):
    del client.environ_base["HTTP_EDUPERSONPRINCIPALNAME_20"]

    response = client.post('/admin/cleanup')
    assert response.status == '401 UNAUTHORIZED'


def test_admin_eppn_header_11(client):
    del client.environ_base["HTTP_EDUPERSONPRINCIPALNAME_20"]
    client.environ_base["HTTP_EDUPERSONPRINCIPALNAME_11"] = 'dummy-eppn@example.org'

    response = client.post('/admin/cleanup')
    assert response.status == '200 OK'


def test_admin_dashboard_empty(client):
    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    assert b'Number of documents</td><td>0</td>' in response.data
    assert b'No documents' in response.data
    # the whitelisted institutions show with no signatures
    assert b'<td>sunet.se</td>' in response.data
    assert b'<td>eduid.se</td>' in response.data
    assert b'<td>dev.eduid.se</td>' in response.data
    assert b'over-quota' not in response.data


def test_admin_dashboard(client, sample_doc_1, sample_owner_1):
    _add_document_as_tester_invite(client, sample_doc_1, sample_owner_1)
    with client.application.test_request_context():
        client.application.extensions['doc_store'].add_signature(
            'bankid', 'Test Org', 'test.pdf', 'owner-eppn@example.org', '199001019876', _now_ms()
        )

    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    assert b'Number of documents</td><td>1</td>' in response.data
    # the document created today shows as a bar of height 180 in the graph
    assert b'id="docs-per-day"' in response.data
    assert b'height="180.0"' in response.data
    # the payable signature shows in the usage table; Test Org is not in
    # EID_WHITELIST, so it has no quota, and its over-quota columns show "-"
    assert b'<td>Test Org</td><td>1</td><td>-</td><td>0</td><td>-</td>' in _terse(response.data)
    # and as the only point of its line in the monthly graph
    assert b'<title>Test Org: 1, ' + datetime.now().strftime('%b %Y').encode() + b'</title>' in response.data
    assert b'>' + datetime.now().strftime('%Y').encode() + b'</text>' in response.data


def test_parse_eid_whitelist():
    parsed = parse_eid_whitelist('eduid.se: 400 :500, sunet.se:500:250, dev.eduid.se:2, Example.org, ')
    assert parsed == {
        'eduid.se': {'bankid': 400, 'freja': 500},
        'sunet.se': {'bankid': 500, 'freja': 250},
        'dev.eduid.se': {'bankid': 2, 'freja': 2},
        'example.org': {'bankid': None, 'freja': None},
    }


def _terse(data):
    """The usage table cells, without inter-tag whitespace."""
    return b''.join(line.strip() for line in data.split(b'\n'))


def _now_ms():
    return int(time.time() * 1000)


def _add_signatures(client, org, sig_type, number, timestamp=None):
    if timestamp is None:
        timestamp = _now_ms()
    with client.application.test_request_context():
        for i in range(number):
            client.application.extensions['doc_store'].add_signature(
                sig_type, org, 'test.pdf', f'owner-eppn@{org}', '199001019876', timestamp + i
            )


def test_admin_dashboard_within_quota(client):
    # sunet.se has quotas 500 (bankid) and 250 (freja) in the default config
    _add_signatures(client, 'sunet.se', 'bankid', 3)
    _add_signatures(client, 'sunet.se', 'freja', 2)

    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    assert b'<td>sunet.se</td><td>3</td><td>0</td><td>2</td><td>0</td>' in _terse(response.data)
    assert b'over-quota' not in response.data


def test_admin_dashboard_over_quota(client):
    # dev.eduid.se has the common quota 2 in the default config; the
    # within-quota column stays at the quota value, the excess goes in the
    # highlighted over-quota column
    _add_signatures(client, 'dev.eduid.se', 'bankid', 5)

    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    terse = _terse(response.data)
    assert (
        b'<td>dev.eduid.se</td><td>2</td>'
        b'<td class="over-quota" style="color: #a00; font-weight: bold;">3</td>'
        b'<td>0</td><td>0</td>' in terse
    )


def test_admin_dashboard_current_month_only(client):
    # 1752000000000 is 2025-07-08: a paid-for month. The table counts the
    # current month only; the graph keeps a point per month since then.
    _add_signatures(client, 'sunet.se', 'bankid', 4, timestamp=1752000000000)
    _add_signatures(client, 'sunet.se', 'freja', 1)

    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    assert b'<td>sunet.se</td><td>0</td><td>0</td><td>1</td><td>0</td>' in _terse(response.data)
    assert b'id="eid-per-month"' in response.data
    # years only on the horizontal axis: under the first month, and under
    # each January
    assert b'class="x-label" x="70" y="226" font-size="10" text-anchor="middle" fill="#455">2025</text>' in response.data
    assert b'>2026</text>' in response.data
    assert b'>2025-07</text>' not in response.data
    # the month and year are in the point's hover
    assert b'<title>sunet.se: 4, Jul 2025</title>' in response.data
    assert b'<title>sunet.se: 1, ' + datetime.now().strftime('%b %Y').encode() + b'</title>' in response.data
    # the months in between are present with no uses
    assert b'<title>sunet.se: 0, ' in response.data
    # vertical axis: a maximum of 4 gives ticks 0 to 4, step 1, and the
    # top tick is the top of the scale, so the maximum sits at y=30
    assert response.data.count(b'class="y-tick"') == 5
    assert b'>4</text>' in response.data
    assert b'cy="30.0"' in response.data
    # one line per institution in the whitelist, even without uses
    assert response.data.count(b'class="eid-series"') == 3
    assert b'<title>eduid.se</title>' in response.data
    # the report dialog offers the years from the earliest row to now, and
    # preselects the previous month
    now = datetime.now()
    prev = datetime(now.year - 1, 12, 1) if now.month == 1 else datetime(now.year, now.month - 1, 1)
    assert b'action="/admin/eid-signatures-report"' in response.data
    assert b'<option value="2025"' in response.data
    assert (b'<option value="%d" selected>' % prev.year) in response.data
    assert (b'<option value="%d" selected>%s</option>' % (prev.month, prev.strftime('%B').encode())) in response.data


def test_admin_dashboard_previous_month(client):
    now = datetime.now()
    prev = datetime(now.year - 1, 12, 1) if now.month == 1 else datetime(now.year, now.month - 1, 1)
    prev_ms = int(prev.timestamp() * 1000)
    _add_signatures(client, 'sunet.se', 'bankid', 3, timestamp=prev_ms)
    _add_signatures(client, 'sunet.se', 'freja', 1)

    response = client.get('/admin/dashboard')
    assert response.status == '200 OK'
    terse = _terse(response.data)
    current = terse.split(b'id="id-service-usage"')[1].split(b'</table>')[0]
    previous = terse.split(b'id="id-service-usage-prev"')[1].split(b'</table>')[0]
    assert b'<td>sunet.se</td><td>0</td><td>0</td><td>1</td><td>0</td>' in current
    assert b'<td>sunet.se</td><td>3</td><td>0</td><td>0</td><td>0</td>' in previous
    assert b'(' + prev.strftime('%b %Y').encode() + b')</h2>' in response.data


def test_eid_signatures_report(client):
    # 1752000000000 is 2025-07-08. dev.eduid.se has quota 2, sunet.se 500,
    # Test Org none; the row from the current month stays out.
    _add_signatures(client, 'dev.eduid.se', 'bankid', 5, timestamp=1752000000000)
    _add_signatures(client, 'sunet.se', 'bankid', 4, timestamp=1752000000000)
    _add_signatures(client, 'Test Org', 'freja', 1, timestamp=1752000000000)
    _add_signatures(client, 'sunet.se', 'freja', 1)

    response = client.get('/admin/eid-signatures-report?year=2025&month=7')
    assert response.status == '200 OK'
    assert response.headers['Content-Type'] == 'text/csv; charset=utf-8'
    assert response.headers['Content-Disposition'] == 'attachment; filename="eid-signatures-2025-07.csv"'
    assert response.data.decode().splitlines() == [
        'institution,bankid_within_quota,bankid_over_quota,freja_within_quota,freja_over_quota',
        'Test Org,0,,1,',
        'dev.eduid.se,2,3,0,0',
        'eduid.se,0,0,0,0',
        'sunet.se,4,0,0,0',
    ]


def test_eid_signatures_report_empty_month(client):
    response = client.get('/admin/eid-signatures-report?year=2025&month=1')
    assert response.status == '200 OK'
    assert response.data.decode().splitlines()[1:] == [
        'dev.eduid.se,0,0,0,0',
        'eduid.se,0,0,0,0',
        'sunet.se,0,0,0,0',
    ]


def test_eid_signatures_report_bad_parameters(client):
    for query in ('', '?year=2025', '?month=7', '?year=2025&month=13', '?year=x&month=7'):
        response = client.get('/admin/eid-signatures-report' + query)
        assert response.status == '400 BAD REQUEST', query
        assert b'year and month are required' in response.data


# The eID login, as the Shibboleth SP presents it to the app


def _b64attr(value):
    return b64encode(f'<Attribute>{value}</Attribute>'.encode('utf-8')).decode('ascii')


_eid_headers = {
    'Personalidentitynumber-20': _b64attr('199001019876'),
    'Displayname-20': _b64attr('Invited Kid'),
    'Shib-Identity-Provider': 'https://bankid',
    'Shib-Authncontext-Class': 'dummy',
    'Md-Organizationname': 'Test Org',
}


def test_eid_login_recorded(client, sample_doc_1, sample_owner_1):
    # allowbankid=True so the document accepts eID logins
    flags = invitation_flags[:4] + [True, 'Invitation text']
    invites = [{'name': 'Invited Kid', 'email': 'invite0@example.org', 'ssn': '199001019876', 'lang': 'en'}]
    app = client.application
    with app.app_context():
        invite_key = app.extensions['doc_store'].add_document(sample_doc_1, sample_owner_1, invites, *flags)[0]['key']

    with app.test_request_context(f'/sign/bankid/{invite_key}', headers=_eid_headers):
        add_attributes_to_session_bankid_freja(invite_key, 'bankid')
        # the login is billed to the scope of the inviter's eppn
        recorded = app.extensions['doc_store'].get_signatures('example.org', 'bankid')

    assert len(recorded) == 1
    assert recorded[0]['owner_eppn'] == ''
    assert recorded[0]['user_eppn'] == ''
    assert abs(recorded[0]['timestamp'] - _now_ms()) < 60 * 1000

    response = client.get('/admin/dashboard')
    assert b'<td>example.org</td><td>1</td><td>-</td><td>0</td><td>-</td>' in _terse(response.data)
