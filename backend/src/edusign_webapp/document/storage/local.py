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
import base64
import os
import uuid

from edusign_webapp.doc_store import ABCStorage


class LocalStorage(ABCStorage):
    """
    Store documents locally in the fs of the backend,
    so that they can be consecutively signedby more than one user.
    """

    def __init__(self, config: dict):
        """
        :param config: Dict like object with the configuration parameters provided to the Flask app.
        """
        self.config = config
        self.base_dir = config['LOCAL_STORAGE_BASE_DIR']

    def add(self, content: str) -> uuid.UUID:
        """
        Store a new document.

        :param content: Contents of the document, as a base64 string.
        :return: A key that uniquely identifies the document in the store.
        """
        key = uuid.uuid4()
        path = os.path.join(self.base_dir, str(key))
        bcontent = base64.b64decode(content.encode('utf8'))
        with open(path, 'wb') as f:
            f.write(bcontent)
        return key

    def get_content(self, key: uuid.UUID) -> str:
        """
        Get the content of some document identified by the `key`,
        as a base64 string.

        :param key: The key identifying the document.
        :return: base64 string with the contents of the document.
        """
        path = os.path.join(self.base_dir, str(key))
        with open(path, 'rb') as f:
            bcontent = f.read()
        return base64.b64encode(bcontent).decode('utf8')

    def update(self, key: uuid.UUID, content: str):
        """
        Update a document, usually because a new signature has been added.

        :param key: The key identifying the document.
        :param content: base64 string with the contents of the new version of the document.
        """
        path = os.path.join(self.base_dir, str(key))
        bcontent = base64.b64decode(content.encode('utf8'))
        with open(path, 'wb') as f:
            f.write(bcontent)

    def remove(self, key: uuid.UUID):
        """
        Remove a document from the store

        :param key: The key identifying the document.
        """
        path = os.path.join(self.base_dir, str(key))
        if os.path.isfile(path):
            os.remove(path)
