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
import uuid

from moto import mock_aws


def _create_bucket(app):
    app.extensions['doc_store'].storage.s3.create_bucket(Bucket='edusign-storage')


@mock_aws
def test_add(s3_app, sample_pdf_data, sample_binary_pdf_data):
    _create_bucket(s3_app)
    key = str(uuid.uuid4())

    s3_app.extensions['doc_store'].storage.add(key, sample_pdf_data)

    assert list(s3_app.extensions['doc_store'].storage.s3_bucket.objects.all())[0].key == key


@mock_aws
def test_add_and_retrieve(s3_app, sample_pdf_data):
    _create_bucket(s3_app)
    key = str(uuid.uuid4())
    s3_app.extensions['doc_store'].storage.add(key, sample_pdf_data)
    content = s3_app.extensions['doc_store'].storage.get_content(key)

    assert content == sample_pdf_data


@mock_aws
def test_add_update_and_retrieve(s3_app, sample_pdf_data, sample_pdf_data_2):
    _create_bucket(s3_app)
    key = str(uuid.uuid4())
    s3_app.extensions['doc_store'].storage.add(key, sample_pdf_data)

    s3_app.extensions['doc_store'].storage.update(key, sample_pdf_data_2)

    content = s3_app.extensions['doc_store'].storage.get_content(key)

    assert content != sample_pdf_data
    assert content == sample_pdf_data_2


@mock_aws
def test_add_two_update_and_retrieve(s3_app, sample_pdf_data, sample_pdf_data_2):
    _create_bucket(s3_app)
    key1 = str(uuid.uuid4())
    key2 = str(uuid.uuid4())
    s3_app.extensions['doc_store'].storage.add(key1, sample_pdf_data)
    s3_app.extensions['doc_store'].storage.add(key2, sample_pdf_data_2)

    s3_app.extensions['doc_store'].storage.update(key1, sample_pdf_data_2)

    content1 = s3_app.extensions['doc_store'].storage.get_content(key1)
    content2 = s3_app.extensions['doc_store'].storage.get_content(key2)

    assert content1 == sample_pdf_data_2
    assert content1 == content2


@mock_aws
def test_add_and_remove(s3_app, sample_pdf_data):
    _create_bucket(s3_app)
    key = str(uuid.uuid4())
    s3_app.extensions['doc_store'].storage.add(key, sample_pdf_data)

    s3_app.extensions['doc_store'].storage.remove(key)

    assert len(list(s3_app.extensions['doc_store'].storage.s3_bucket.objects.all())) == 0


@mock_aws
def test_add_2_and_remove_1(s3_app, sample_pdf_data, sample_pdf_data_2):
    _create_bucket(s3_app)
    key = str(uuid.uuid4())
    s3_app.extensions['doc_store'].storage.add(key, sample_pdf_data)
    key2 = str(uuid.uuid4())
    s3_app.extensions['doc_store'].storage.add(key2, sample_pdf_data_2)

    s3_app.extensions['doc_store'].storage.remove(key)

    assert len(list(s3_app.extensions['doc_store'].storage.s3_bucket.objects.all())) == 1

    content2 = s3_app.extensions['doc_store'].storage.get_content(key2)

    assert content2 == sample_pdf_data_2
