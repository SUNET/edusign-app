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
import shutil
from base64 import b64decode
from unittest import mock

import fitz

from edusign_webapp.forms import has_pdf_form, try_pdfa, update_pdf_form


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


class _FakeWidget:
    def __init__(self, name, field_type):
        self.field_name = name
        self.field_type = field_type
        self.field_value = False
        self.field_flags = 0

    def update(self):
        pass


class _FakePage:
    def __init__(self, widgets):
        self._widgets = widgets

    def widgets(self):
        return self._widgets


class _FakeDoc(list):
    def tobytes(self):
        return b'%PDF-fake'


def test_update_pdf_form_radio(app, sample_pdf_data):
    _, app = app
    # PyMuPDF cannot easily create radio buttons, so the radio branch is
    # exercised with fake fitz objects: two widgets of the same radio group,
    # selecting the second
    radio1 = _FakeWidget('Radio Group', 5)
    radio2 = _FakeWidget('Radio Group', 5)
    doc = _FakeDoc([_FakePage([radio1, radio2])])
    orig_doc = _FakeDoc([])
    fields = [{'name': 'Radio Group', 'value': 2}]

    with app.test_request_context():
        with mock.patch('edusign_webapp.forms._load_b64_pdf', side_effect=[doc, orig_doc]):
            with mock.patch('edusign_webapp.forms.try_pdfa', side_effect=lambda orig, filled: filled):
                newpdf = update_pdf_form(sample_pdf_data, fields)

    assert b64decode(newpdf) == b'%PDF-fake'
    assert radio1.field_value is False
    assert radio2.field_value is True


def test_try_pdfa_claims_pdfa(sample_binary_pdf_data):
    doc = fitz.open(stream=sample_binary_pdf_data, filetype='application/pdf')
    orig_doc = fitz.open(stream=sample_binary_pdf_data, filetype='application/pdf')

    # pretend the original claims PDF/A, and replace the expensive ocr step
    # with a copy of its input
    def fake_ocr(input_file=None, output_file=None, **kwargs):
        shutil.copyfile(input_file, output_file)

    with mock.patch('edusign_webapp.forms.file_claims_pdfa', return_value=True):
        with mock.patch('edusign_webapp.forms.ocr', side_effect=fake_ocr):
            new_doc = try_pdfa(orig_doc, doc)

    assert new_doc is not doc
    assert new_doc.page_count == doc.page_count


def test_try_pdfa_does_not_claim_pdfa(sample_binary_pdf_data):
    doc = fitz.open(stream=sample_binary_pdf_data, filetype='application/pdf')
    orig_doc = fitz.open(stream=sample_binary_pdf_data, filetype='application/pdf')

    with mock.patch('edusign_webapp.forms.file_claims_pdfa', return_value=False):
        assert try_pdfa(orig_doc, doc) is doc
