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
import os
import uuid


def test_add(local_storage, sample_pdf_data):
    _, storage = local_storage
    key = str(uuid.uuid4())
    storage.add(key, sample_pdf_data)

    assert os.listdir(storage.base_dir) == [str(key)]


def test_add_and_retrieve(local_storage, sample_pdf_data):
    _, storage = local_storage
    key = str(uuid.uuid4())
    storage.add(key, sample_pdf_data)
    content = storage.get_content(key)

    assert content == sample_pdf_data


def test_add_update_and_retrieve(local_storage, sample_pdf_data, sample_pdf_data_2):
    _, storage = local_storage
    key = str(uuid.uuid4())
    storage.add(key, sample_pdf_data)

    storage.update(key, sample_pdf_data_2)

    content = storage.get_content(key)

    assert content != sample_pdf_data
    assert content == sample_pdf_data_2


def test_add_two_update_and_retrieve(local_storage, sample_pdf_data, sample_pdf_data_2):
    _, storage = local_storage
    key1 = str(uuid.uuid4())
    key2 = str(uuid.uuid4())
    storage.add(key1, sample_pdf_data)
    storage.add(key2, sample_pdf_data_2)

    storage.update(key1, sample_pdf_data_2)

    content1 = storage.get_content(key1)
    content2 = storage.get_content(key2)

    assert content1 == sample_pdf_data_2
    assert content1 == content2


def test_add_and_remove(local_storage, sample_pdf_data):
    _, storage = local_storage
    key = str(uuid.uuid4())
    storage.add(key, sample_pdf_data)

    storage.remove(key)

    assert os.listdir(storage.base_dir) == []


def test_add_two_and_remove(local_storage, sample_pdf_data, sample_pdf_data_2):
    _, storage = local_storage
    key1 = str(uuid.uuid4())
    key2 = str(uuid.uuid4())
    storage.add(key1, sample_pdf_data)
    storage.add(key2, sample_pdf_data_2)

    storage.remove(key1)

    assert os.listdir(storage.base_dir) == [str(key2)]
