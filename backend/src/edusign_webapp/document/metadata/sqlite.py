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
import logging
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Union

from flask import current_app, g

from edusign_webapp.doc_store import ABCMetadata

DB_SCHEMA = """
CREATE TABLE [Users]
(      [userID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [email] VARCHAR(255) NOT NULL
);
CREATE TABLE [Documents]
(      [documentID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [key] VARCHAR(255) NOT NULL,
       [name] VARCHAR(255) NOT NULL,
       [size] INTEGER NOT NULL,
       [type] VARCHAR(50) NOT NULL,
       [created] TEXT DEFAULT CURRENT_TIMESTAMP,
       [updated] TEXT DEFAULT CURRENT_TIMESTAMP,
       [owner] INTEGER NOT NULL,
            FOREIGN KEY ([owner]) REFERENCES [Users] ([userID])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE TABLE [Invites]
(      [inviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [userID] INTEGER NOT NULL,
       [documentID] INTEGER NOT NULL,
            FOREIGN KEY ([userID]) REFERENCES [Users] ([userID])
              ON DELETE NO ACTION ON UPDATE NO ACTION,
            FOREIGN KEY ([documentID]) REFERENCES [Documents] ([documentID])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS [EmailIX] ON [Users] ([email]);
CREATE UNIQUE INDEX IF NOT EXISTS [KeyIX] ON [Documents] ([key]);
CREATE INDEX IF NOT EXISTS [OwnerIX] ON [Documents] ([owner]);
CREATE INDEX IF NOT EXISTS [InviteeIX] ON [Invites] ([userID]);
CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([documentID]);
"""


USER_INSERT = "INSERT INTO Users (email) VALUES (?);"
USER_QUERY_ID = "SELECT userID FROM Users WHERE email = ?;"
USER_QUERY = "SELECT email FROM Users WHERE userID = ?;"
DOCUMENT_INSERT = "INSERT INTO Documents (key, name, size, type, owner) VALUES (?, ?, ?, ?, ?);"
DOCUMENT_QUERY_ID = "SELECT documentID FROM Documents WHERE key = ?;"
DOCUMENT_QUERY = "SELECT key, name, size, type, owner FROM Documents WHERE documentID = ?;"
DOCUMENT_QUERY_FROM_OWNER = "SELECT d.documentID, d.key, d.name, d.size, d.type FROM Documents as d, Users WHERE Users.email = ? and d.owner = Users.userID;"
DOCUMENT_UPDATE = "UPDATE Documents SET updated = ? WHERE key = ?;"
DOCUMENT_DELETE = "DELETE FROM Documents WHERE key = ?;"
INVITE_INSERT = "INSERT INTO Invites (documentID, userID) VALUES (?, ?)"
INVITE_QUERY = "SELECT documentID FROM Invites WHERE userID = ?;"
INVITE_QUERY_FROM_EMAIL = "SELECT Invites.documentID FROM Invites, Users WHERE Users.email = ? and Invites.userID = Users.userID;"
INVITE_QUERY_FROM_DOC = "SELECT userID FROM Invites WHERE documentID = ?;"
INVITE_DELETE = "DELETE FROM Invites WHERE userID = ? and documentID = ?;"


def make_dicts(cursor, row):
    """
    See https://flask.palletsprojects.com/en/1.1.x/patterns/sqlite3
    """
    return dict((cursor.description[idx][0], value)
                for idx, value in enumerate(row))


def get_db(db_path):
    db = getattr(g, '_database', None)
    if db is None:
        exists = os.path.isfile(db_path)
        db = g._database = sqlite3.connect(db_path)

        if not exists:
            db.cursor().executescript(DB_SCHEMA)
            db.commit()

        db.row_factory = make_dicts

        @current_app.teardown_appcontext
        def close_connection(exception):
            db = getattr(g, '_database', None)
            if db is not None:
                db.close()

    return db


# XXX Work on the SQL, compounding queries and statements


class SqliteMD(ABCMetadata):
    """
    Sqlite backend to deal with the metadata associated to documents
    to be signed by more than one user.

    This metadata includes data about the document (name, size, type),
    data about its owner (who has uploaded the document and invited other users to sign it),
    and data about the users who have been invited to sign the document.
    """

    def __init__(self, config: dict, logger: logging.Logger):
        """
        :param config: Dict like object with the configuration parameters provided to the Flask app.
        :param logger: Logger
        """
        self.config = config
        self.logger = logger
        self.db_path = config['SQLITE_MD_DB_PATH']

    def _db_execute(self, stmt: str, args: tuple = ()):
        db = get_db(self.db_path)
        db.execute(stmt, args)

    def _db_query(
        self, query: str, args: tuple = (), one: bool = False
    ) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
        cur = get_db(self.db_path).execute(query, args)
        rv = cur.fetchall()
        cur.close()
        return (rv[0] if rv else None) if one else rv

    def _db_commit(self):
        db = get_db(self.db_path)
        db.commit()

    def add(self, key: uuid.UUID, document: Dict[str, Any], owner: str, invites: List[str]):
        """
        Store metadata for a new document.

        :param key: The uuid that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + size: Size of the doc
                         + type: Content type of the doc
        :param owner: email address of the user that has uploaded the document.
        :param invites: List of the emails of the users that have been invited to sign the document.
        """
        owner_result = self._db_query(USER_QUERY_ID, (owner,), one=True)
        if owner_result is None:
            self.logger.info(f"Adding new (owning) user: {owner}")
            self._db_execute(USER_INSERT, (owner,))
            owner_result = self._db_query(USER_QUERY_ID, (owner,), one=True)

        if owner_result is None or isinstance(owner_result, list):  # This should never happen, it's just to please mypy
            return

        owner_id = owner_result['userID']

        self._db_execute(DOCUMENT_INSERT, (key.bytes, document['name'], document['size'], document['type'], owner_id))
        document_result = self._db_query(DOCUMENT_QUERY_ID, (key.bytes,), one=True)

        if document_result is None or isinstance(document_result, list):  # This should never happen, it's just to please mypy
            return

        document_id = document_result['documentID']

        for email in invites:
            user_result = self._db_query(USER_QUERY_ID, (email,), one=True)
            if user_result is None:
                self._db_execute(USER_INSERT, (email,))
                user_result = self._db_query(USER_QUERY_ID, (email,), one=True)

            if user_result is None or isinstance(user_result, list):  # This should never happen, it's just to please mypy
                continue

            user_id = user_result['userID']
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
        invites = self._db_query(INVITE_QUERY_FROM_EMAIL, (email,))
        if invites is None or isinstance(invites, dict):
            return []

        pending = []
        for invite in invites:
            document_id = invite['documentID']
            document = self._db_query(DOCUMENT_QUERY, (document_id,), one=True)
            if document is None or isinstance(document, list):
                self.logger.error(f"Db seems corrupted, an invite for {email}"
                                  f" references a non existing document with id {document_id}")
                continue

            owner = document['owner']
            email_result = self._db_query(USER_QUERY, (owner,), one=True)
            if email_result is None or isinstance(email_result, list):
                self.logger.error(f"Db seems corrupted, a document references a non existing owner {owner}")
                continue

            document['owner'] = email_result['email']
            document['key'] = uuid.UUID(bytes=document['key'])
            pending.append(document)

        return pending

    def update(self, key: uuid.UUID, email: str):
        """
        Update the metadata of a document to which a new signature has been added.
        This is, remove corresponding entry in the Invites table.

        :param key: The key identifying the document in the `storage`.
        :param email: email address of the user that has just signed the document.
        """
        user_result = self._db_query(USER_QUERY_ID, (email,), one=True)
        if user_result is None or isinstance(user_result, list):
            self.logger.error(f"Trying to update a document with the signature of non-existing {email}")
            return

        user_id = user_result['userID']

        document_result = self._db_query(DOCUMENT_QUERY_ID, (key.bytes,), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to update a non-existing document with the signature of {email}")
            return

        document_id = document_result['documentID']

        self.logger.info(f"Removing invite for {email} to sign {key}")
        self._db_execute(INVITE_DELETE, (user_id, document_id))
        self._db_execute(DOCUMENT_UPDATE, (datetime.now().isoformat(), key.bytes,))
        self._db_commit()

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
        documents = self._db_query(DOCUMENT_QUERY_FROM_OWNER, (email,))
        if documents is None or isinstance(documents, dict):
            return []

        for document in documents:
            document['key'] = uuid.UUID(bytes=document['key'])
            document['pending'] = []
            document_id = document['documentID']
            invites = self._db_query(INVITE_QUERY_FROM_DOC, (document_id,))
            del document['documentID']
            if invites is None or isinstance(invites, dict):
                continue
            for invite in invites:
                user_id = invite['userID']
                email_result = self._db_query(USER_QUERY, (user_id,), one=True)
                if email_result is None or isinstance(email_result, list):
                    self.logger.error(f"Db seems corrupted, an invite for {document_id}"
                                      f" references a non existing user with id {user_id}")
                    continue
                document['pending'].append(email_result['email'])

        return documents

    def remove(self, key: uuid.UUID, force: bool = False):
        """
        Remove from the store the metadata corresponding to the document identified by the `key`,
        typically because it has already been signed by all requested parties and has been handed to the owner.

        :param key: The key identifying the document.
        """
        document_result = self._db_query(DOCUMENT_QUERY_ID, (key.bytes,), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to delete a non-existing document with key {key}")
            return

        if not force:
            document_id = document_result['documentID']
            invites = self._db_query(INVITE_QUERY_FROM_DOC, (document_id,))
            if invites is None or isinstance(invites, dict):  # This should never happen, it's just to please mypy
                pass
            elif len(invites) != 0:
                self.logger.error(f"Refusing to remove document {key} with pending emails")
                return

        self._db_execute(DOCUMENT_DELETE, (key.bytes,))
        self._db_commit()
