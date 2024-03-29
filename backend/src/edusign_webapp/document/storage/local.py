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
import logging
import os
import uuid
from typing import Optional

from edusign_webapp.doc_store import ABCStorage


class LocalStorage(ABCStorage):
    """
    Store documents locally in the fs of the backend,
    so that they can be consecutively signedby more than one user.
    """

    def __init__(self, config: dict, logger: logging.Logger):
        """
        :param config: Dict like object with the configuration parameters provided to the Flask app.
        :param logger: Logger
        """
        self.config = config
        self.logger = logger
        self.base_dir = config['LOCAL_STORAGE_BASE_DIR']

    def add(self, key: uuid.UUID, content: str):
        """
        Store a new document.

        :param key: UUID key identifying the document
        :param content: Contents of the document, as a base64 string.
        """
        path = os.path.join(self.base_dir, str(key))
        bcontent = base64.b64decode(content.encode('utf8'))
        with open(path, 'wb') as f:
            f.write(bcontent)

        self.logger.info(f"Saved document contents with key {key}")

    def get_content(self, key: uuid.UUID) -> Optional[str]:
        """
        Get the content of some document identified by the `key`,
        as a base64 string.

        :param key: The key identifying the document.
        :return: base64 string with the contents of the document.
        """
        path = os.path.join(self.base_dir, str(key))

        if not os.path.isfile(path):
            return None

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

        self.logger.info(f"Updated document contents with key {key}")

    def remove(self, key: uuid.UUID):
        """
        Remove a document from the store

        :param key: The key identifying the document.
        """
        path = os.path.join(self.base_dir, str(key))
        if os.path.isfile(path):
            os.remove(path)

        self.logger.info(f"Removed document contents with key {key}")
