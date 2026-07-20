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
from base64 import b64decode

import fitz

from edusign_webapp.forms import has_pdf_form, update_pdf_form


def test_has_pdf_form(sample_form_1, sample_pdf_data):
    assert has_pdf_form(sample_form_1['pdf'])
    assert not has_pdf_form(sample_pdf_data)


def test_has_pdf_form_with_data_url_prefix(sample_form_1):
    assert has_pdf_form('data:application/pdf;base64,' + sample_form_1['pdf'])


def test_update_pdf_form(app, sample_form_1):
    _, app = app
    fields = [
        {'name': 'Given Name Text Box', 'value': 'Tester'},
        {'name': 'Family Name Text Box', 'value': 'Kid'},
        {'name': 'Driving License Check Box', 'value': 'on'},
        {'name': 'Language 1 Check Box', 'value': 'Off'},
    ]

    with app.test_request_context():
        newpdf = update_pdf_form(sample_form_1['pdf'], fields)

    doc = fitz.open(stream=b64decode(newpdf), filetype='application/pdf')
    values = {}
    for page in doc:
        for widget in page.widgets():
            values[widget.field_name] = widget.field_value

    assert values['Given Name Text Box'] == 'Tester'
    assert values['Family Name Text Box'] == 'Kid'
    assert values['Driving License Check Box'] not in ('Off', '', None, False)
    assert values['Language 1 Check Box'] in ('Off', '', None, False)


def test_update_pdf_form_2(app, sample_form_2):
    _, app = app
    fields = [
        {'name': 'Name', 'value': 'Tester'},
        {'name': 'email', 'value': 'tester@example.org'},
    ]

    with app.test_request_context():
        newpdf = update_pdf_form(sample_form_2['pdf'], fields)

    doc = fitz.open(stream=b64decode(newpdf), filetype='application/pdf')
    values = {}
    for page in doc:
        for widget in page.widgets():
            values[widget.field_name] = widget.field_value

    assert values['Name'] == 'Tester'
    assert values['email'] == 'tester@example.org'
