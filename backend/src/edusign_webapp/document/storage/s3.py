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
import io
import uuid
from typing import Optional

import boto3
from flask import Flask

from edusign_webapp.doc_store import ABCStorage


class S3Storage(ABCStorage):
    """
    Store documents in AWS's S3 storage,
    so that they can be consecutively signedby more than one user.
    """

    def __init__(self, app: Flask):
        """
        :param app: flask app
        """
        self.app = app
        self.config = app.config
        self.logger = app.logger
        self.s3_session = boto3.session.Session()
        self.s3 = self.s3_session.resource(
            's3',
            region_name=app.config['AWS_REGION_NAME'],
            aws_access_key_id=app.config['AWS_ACCESS_KEY'],
            aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
        )
        self.s3_bucket = self.s3.Bucket(app.config['AWS_BUCKET_NAME'])

    def add(self, key: uuid.UUID, content: str):
        """
        Store a new document.

        :param key: UUID key identifying the document
        :param content: Contents of the document, as a base64 string.
        """
        bcontent = base64.b64decode(content.encode('utf8'))
        f = io.BytesIO(bcontent)
        self.s3_bucket.upload_fileobj(f, str(key))

        self.logger.info(f"Saved document contents with key {key}")

    def get_content(self, key: uuid.UUID) -> Optional[str]:
        """
        Get the content of some document identified by the `key`,
        as a base64 string.

        :param key: The key identifying the document.
        :return: base64 string with the contents of the document.
        """
        f = io.BytesIO()
        self.s3_bucket.download_fileobj(str(key), f)
        f.seek(0)
        bcontent = f.read()
        f.close()
        return base64.b64encode(bcontent).decode('utf8')

    def update(self, key: uuid.UUID, content: str):
        """
        Update a document, usually because a new signature has been added.

        :param key: The key identifying the document.
        :param content: base64 string with the contents of the new version of the document.
        """
        bcontent = base64.b64decode(content.encode('utf8'))
        f = io.BytesIO(bcontent)
        self.s3_bucket.upload_fileobj(f, str(key))

        self.logger.info(f"Updated document contents with key {key}")

    def remove(self, key: uuid.UUID):
        """
        Remove a document from the store

        :param key: The key identifying the document.
        """
        self.s3_bucket.delete_objects(Delete={'Objects': [{'Key': str(key)}]})

        self.logger.info(f"Removed document contents with key {key}")
