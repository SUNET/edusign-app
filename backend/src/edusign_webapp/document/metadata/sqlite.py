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
from typing import Any, Dict, List
import os
import sqlite3

from edusign_webapp.doc_store import ABCMetadata


DB_SCHEMA = """
CREATE TABLE [Users]
(      [UserID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [Email] TEXT NOT NULL,
);
CREATE TABLE [Documents]
(      [DocumentID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [Name] TEXT NOT NULL,
       [Size] INTEGER NOT NULL,
       [Type] TEXT NOT NULL,
       [Created] DATETIME DEFAULT CURRENT_TIMESTAMP,
       [Updated] DATETIME DEFAULT CURRENT_TIMESTAMP,
       [Owner] INTEGER NOT NULL,
            FOREIGN KEY ([Owner]) REFERENCES [Users] ([UserID])
              ON DELETE NO ACTION ON UPDATE NO ACTION,
);
CREATE TABLE [Invites]
(      [InviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [UserID] INTEGER NOT NULL,
       [DocumentID] INTEGER NOT NULL,
            FOREIGN KEY ([UserID]) REFERENCES [Users] ([UserID])
              ON DELETE NO ACTION ON UPDATE NO ACTION,
            FOREIGN KEY ([DocumentID]) REFERENCES [Documents] ([DocumentID])
              ON DELETE NO ACTION ON UPDATE NO ACTION,
);
CREATE INDEX IF NOT EXISTS [EmailIX] ON [Users] ([Email]);
CREATE INDEX IF NOT EXISTS [OwnerIX] ON [Documents] ([Owner]);
CREATE INDEX IF NOT EXISTS [InviteeIX] ON [Invites] ([UserID]);
CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([DocumentID]);
"""


class SqliteMD(ABCMetadata):
    """
    Sqlite backend to deal with the metadata associated to documents
    to be signed by more than one user.

    This metadata includes data about the document (name, size, type),
    data about its owner (who has uploaded the document and invited other users to sign it),
    and data about the users who have been invited to sign the document.
    """

    def __init__(self, config: dict):
        """
        :param config: Dict like object with the configuration parameters provided to the Flask app.
        """
        self.config = config
        dbpath = os.path.join(config['SQLITE_MD_DB_PATH'], config['SQLITE_MD_DB_NAME'])
        self.conn = sqlite3.connect(dbpath)

    def add(self, key: str, document: Dict[str, str], owner: str, invites: List[str]):
        """
        Store metadata for a new document.

        :param key: The key that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + type: Content type of the doc
                         + size: Size of the doc
                         + blob: Contents of the document, as a base64 string.
        :param owner: Email address of the user that has uploaded the document.
        :param invites: List of the emails of the users that have been invited to sign the document.
        """

    def get_pending(self, email: str) -> Dict[str, str]:
        """
        Given the email address of some user, return information about the documents
        she has been invited to sign, and has not yet signed.

        :param email: The email of the user
        :return: A list of dictionaries with information about the documents pending to be signed,
                 each of them with keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + owner: Email of the user requesting the signature
        """

    def update(self, key: str, email: str):
        """
        Update the metadata of a document to which a new signature has been added.

        :param key: The key identifying the document in the `storage`.
        :param email: email address of the user that has just signed the document.
        """

    def get_owned(self, email: str) -> Dict[str, Any]:
        """
        Get information about the documents that have been added by some user to be signed by other users.

        :param email: The email of the user
        :return: A list of dictionaries with information about the documents, each of them with keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + pending: List of emails of the users invited to sign the document who have not yet done so.
        """

    def remove(self, key):
        """
        Remove from the store the metadata corresponding to the document identified by the `key`,
        typically because it has already been signed by all requested parties and has been handed to the owner.

        :param key: The key identifying the document.
        """
