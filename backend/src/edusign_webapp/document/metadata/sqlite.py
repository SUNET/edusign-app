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
from typing import Any, Dict, List, Union
import os
import sqlite3

from flask import current_app, g

from edusign_webapp.doc_store import ABCMetadata


DB_SCHEMA = """
CREATE TABLE [Users]
(      [UserID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [Email] VARCHAR(255) NOT NULL
);
CREATE TABLE [Documents]
(      [DocumentID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [Key] INTEGER NOT NULL,
       [Name] VARCHAR(255) NOT NULL,
       [Size] INTEGER NOT NULL,
       [Type] VARCHAR(50) NOT NULL,
       [Created] DATETIME DEFAULT CURRENT_TIMESTAMP,
       [Updated] DATETIME DEFAULT CURRENT_TIMESTAMP,
       [Owner] INTEGER NOT NULL,
            FOREIGN KEY ([Owner]) REFERENCES [Users] ([UserID])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE TABLE [Invites]
(      [InviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [UserID] INTEGER NOT NULL,
       [DocumentID] INTEGER NOT NULL,
            FOREIGN KEY ([UserID]) REFERENCES [Users] ([UserID])
              ON DELETE NO ACTION ON UPDATE NO ACTION,
            FOREIGN KEY ([DocumentID]) REFERENCES [Documents] ([DocumentID])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS [EmailIX] ON [Users] ([Email]);
CREATE INDEX IF NOT EXISTS [KeyIX] ON [Documents] ([Key]);
CREATE INDEX IF NOT EXISTS [OwnerIX] ON [Documents] ([Owner]);
CREATE INDEX IF NOT EXISTS [InviteeIX] ON [Invites] ([UserID]);
CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([DocumentID]);
"""


USER_INSERT = "INSERT INTO Users (Email) VALUES (?);"
USER_QUERY_ID = "SELECT UserID FROM Users WHERE Email = ?;"
USER_QUERY = "SELECT Email FROM Users WHERE UserID = ?;"
DOCUMENT_INSERT = "INSERT INTO Documents (Key, Name, Size, Type, Owner) VALUES (?, ?, ?, ?, ?);"
DOCUMENT_QUERY_ID = "SELECT DocumentID FROM Documents WHERE Key = ?;"
DOCUMENT_QUERY = "SELECT Key, Name, Size, Type, Owner FROM Documents WHERE DocumentID = ?;"
DOCUMENT_QUERY_FROM_OWNER = "SELECT DocumentID, Key, Name, Size, Type FROM Documents WHERE Owner = ?;"
DOCUMENT_DELETE = "DELETE FROM Documents WHERE Key = ?;"
INVITE_INSERT = "INSERT INTO Invites (DocumentID, UserID) VALUES (?, ?)"
INVITE_QUERY = "SELECT DocumentID FROM Invites WHERE UserID = ?;"
INVITE_QUERY_FROM_DOC = "SELECT UserID FROM Invites WHERE DocumentID = ?;"
INVITE_DELETE = "DELETE FROM Invites WHERE UserID = ? and DocumentID = ?;"


def get_db(db_path):
    db = getattr(g, '_database', None)
    if db is None:
        exists = os.isfile(db_path)
        db = g._database = sqlite3.connect(db_path)

        if not exists:
            db.cursor().executescript(DB_SCHEMA)
            db.commit()

        @current_app.teardown_appcontext
        def close_connection(exception):
            db = getattr(g, '_database', None)
            if db is not None:
                db.close()

    return db


# XXX Lower case fields
# XXX Make sure error conditions are handled sensibly
# XXX Work on the SQL, compounding queries and statements


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
        self.db_path = os.path.join(config['SQLITE_MD_DB_PATH'], config['SQLITE_MD_DB_NAME'])

    def _db_execute(self, stmt: str, args: tuple = ()):
        db = get_db(self.db_path)
        db.execute(stmt, args)

    def _db_query(self, query: str, args: tuple = (), one: bool = False) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
        cur = get_db(self.db_path).execute(query, args)
        rv = cur.fetchall()
        cur.close()
        return (rv[0] if rv else None) if one else rv

    def _db_commit(self):
        db = get_db(self.db_path)
        db.commit()

    def add(self, key: str, document: Dict[str, str], owner: str, invites: List[str]):
        """
        Store metadata for a new document.

        :param key: The key that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + size: Size of the doc
                         + type: Content type of the doc
                         + blob: Contents of the document, as a base64 string.
        :param owner: Email address of the user that has uploaded the document.
        :param invites: List of the emails of the users that have been invited to sign the document.
        """
        self._db_execute(USER_INSERT, (owner,))
        owner_result = self._db_query(USER_QUERY_ID, (owner,), one=True)
        if owner_result is None:
            return
        elif isinstance(owner_result, dict):
            owner_id = owner_result['UserID']

        self._db_execute(DOCUMENT_INSERT, (key, document['name'], document['size'], document['type'], owner_id))
        document_result = self._db_query(DOCUMENT_QUERY_ID, (key,), one=True)
        if document_result is None or isinstance(document_result, list):
            return
        document_id = document_result['DocumentID']

        for email in invites:
            self._db_execute(USER_INSERT, (email,))
            user_result = self._db_query(USER_QUERY_ID, (email,), one=True)
            if user_result is None:
                continue
            elif isinstance(user_result, dict):
                user_id = user_result['UserID']
            self._db_execute(INVITE_INSERT, (document_id, user_id))

        self._db_commit()

    def get_pending(self, email: str) -> List[Dict[str, str]]:
        """
        Given the email address of some user, return information about the documents
        she has been invited to sign, and has not yet signed.

        :param email: The email of the user
        :return: A list of dictionaries with information about the documents pending to be signed,
                 each of them with keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + size: Size of the doc
                 + type: Content type of the doc
                 + owner: Email of the user requesting the signature
        """
        user_result = self._db_query(USER_QUERY_ID, (email,))
        if user_result is None:
            return []
        elif isinstance(user_result, dict):
            user_id = user_result['UserID']

        invites = self._db_query(INVITE_QUERY, user_id)
        pending = []
        if invites is None or isinstance(invites, dict):
            return []

        for invite in invites:
            document = self._db_query(DOCUMENT_QUERY, (invite['DocumentID'],), one=True)
            if document is None or isinstance(document, list):
                continue
            email_result = self._db_query(USER_QUERY, (document['Owner'],), one=True)
            if email_result is None or isinstance(email_result, list):
                continue
            document['Owner'] = email_result['Email']
            pending.append(document)

        return pending

    def update(self, key: str, email: str):
        """
        Update the metadata of a document to which a new signature has been added.
        This is, remove corresponding entry in the Invites table.

        :param key: The key identifying the document in the `storage`.
        :param email: email address of the user that has just signed the document.
        """
        user_result = self._db_query(USER_QUERY_ID, (email,))
        if user_result is None:
            return []
        elif isinstance(user_result, dict):
            user_id = user_result['UserID']

        document_result = self._db_query(DOCUMENT_QUERY_ID, (key,), one=True)
        if document_result is None or isinstance(document_result, list):
            return
        document_id = document_result['DocumentID']

        self._db_execute(INVITE_DELETE, (user_id, document_id))

    def get_owned(self, email: str) -> List[Dict[str, Any]]:
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
        user_result = self._db_query(USER_QUERY_ID, (email,))
        if user_result is None:
            return []
        elif isinstance(user_result, dict):
            user_id = user_result['UserID']

        documents = self._db_query(DOCUMENT_QUERY_FROM_OWNER, (user_id,))
        if documents is None or isinstance(documents, dict):
            return []

        for document in documents:
            document['pending'] = []
            invites = self._db_query(INVITE_QUERY_FROM_DOC, (document['DocumentID'],))
            del document['DocumentID']
            if invites is None or isinstance(invites, dict):
                continue
            for invite in invites:
                email_result = self._db_query(USER_QUERY, (invite['UserID'],), one=True)
                if email_result is None or isinstance(email_result, list):
                    continue
                document['pending'].append(email_result['Email'])

        return documents

    def remove(self, key):
        """
        Remove from the store the metadata corresponding to the document identified by the `key`,
        typically because it has already been signed by all requested parties and has been handed to the owner.

        :param key: The key identifying the document.
        """
        self._db_execute(DOCUMENT_DELETE, (key,))
