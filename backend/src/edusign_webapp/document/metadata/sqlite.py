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
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Union

from flask import Flask, current_app, g

from edusign_webapp.doc_store import ABCMetadata

DB_SCHEMA = """
CREATE TABLE [Users]
(      [user_id] INTEGER PRIMARY KEY AUTOINCREMENT,
       [email] VARCHAR(255) NOT NULL,
       [name] VARCHAR(255) NOT NULL
);
CREATE TABLE [Documents]
(      [doc_id] INTEGER PRIMARY KEY AUTOINCREMENT,
       [key] VARCHAR(255) NOT NULL,
       [name] VARCHAR(255) NOT NULL,
       [size] INTEGER NOT NULL,
       [type] VARCHAR(50) NOT NULL,
       [created] TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       [updated] TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       [owner] INTEGER NOT NULL,
       [prev_signatures] TEXT,
       [sendsigned] INTEGER DEFAULT 1,
       [locked] TIMESTAMP DEFAULT NULL,
       [locked_by] INTEGER DEFAULT NULL,
            FOREIGN KEY ([owner]) REFERENCES [Users] ([user_id])
              ON DELETE NO ACTION ON UPDATE NO ACTION
            FOREIGN KEY ([locked_by]) REFERENCES [Users] ([user_id])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE TABLE [Invites]
(      [inviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [key] VARCHAR(255) NOT NULL,
       [user_id] INTEGER NOT NULL,
       [doc_id] INTEGER NOT NULL,
       [signed] INTEGER DEFAULT 0,
       [declined] INTEGER DEFAULT 0,
            FOREIGN KEY ([user_id]) REFERENCES [Users] ([user_id])
              ON DELETE NO ACTION ON UPDATE NO ACTION,
            FOREIGN KEY ([doc_id]) REFERENCES [Documents] ([doc_id])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS [EmailIX] ON [Users] ([email]);
CREATE UNIQUE INDEX IF NOT EXISTS [KeyIX] ON [Documents] ([key]);
CREATE INDEX IF NOT EXISTS [OwnerIX] ON [Documents] ([owner]);
CREATE INDEX IF NOT EXISTS [InviteeIX] ON [Invites] ([user_id]);
CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([doc_id]);
PRAGMA user_version = 2;
"""


USER_INSERT = "INSERT INTO Users (name, email) VALUES (?, ?);"
USER_QUERY_ID = "SELECT user_id FROM Users WHERE email = ?;"
USER_QUERY = "SELECT name, email FROM Users WHERE user_id = ?;"
DOCUMENT_INSERT = "INSERT INTO Documents (key, name, size, type, owner, prev_signatures, sendsigned) VALUES (?, ?, ?, ?, ?, ?, ?);"
DOCUMENT_QUERY_ID = "SELECT doc_id FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_ALL = "SELECT key, name, size, type, doc_id, owner FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_LOCK = "SELECT locked, locked_by FROM Documents WHERE doc_id = ?;"
DOCUMENT_QUERY = "SELECT key, name, size, type, owner, prev_signatures FROM Documents WHERE doc_id = ?;"
DOCUMENT_QUERY_FROM_OWNER = "SELECT d.doc_id, d.key, d.name, d.size, d.type, d.prev_signatures FROM Documents as d, Users WHERE Users.email = ? and d.owner = Users.user_id;"
DOCUMENT_QUERY_SENDSIGNED = "SELECT sendsigned FROM Documents WHERE key = ?;"
DOCUMENT_UPDATE = "UPDATE Documents SET updated = ? WHERE key = ?;"
DOCUMENT_RM_LOCK = "UPDATE Documents SET locked = NULL, locked_by = NULL WHERE doc_id = ?;"
DOCUMENT_ADD_LOCK = "UPDATE Documents SET locked = ?, locked_by = ? WHERE doc_id = ?;"
DOCUMENT_DELETE = "DELETE FROM Documents WHERE key = ?;"
INVITE_INSERT = "INSERT INTO Invites (key, doc_id, user_id) VALUES (?, ?, ?)"
INVITE_QUERY_FROM_EMAIL = "SELECT Invites.doc_id, Invites.key FROM Invites, Users WHERE Users.email = ? AND Invites.user_id = Users.user_id AND Invites.signed = 0 AND Invites.declined = 0;"
INVITE_QUERY_FROM_DOC = "SELECT user_id, signed, declined, key FROM Invites WHERE doc_id = ?;"
INVITE_QUERY_UNSIGNED_FROM_DOC = "SELECT user_id FROM Invites WHERE doc_id = ? AND signed = 0 AND declined = 0;"
INVITE_QUERY_FROM_KEY = "SELECT user_id, doc_id FROM Invites WHERE key = ?;"
INVITE_UPDATE = "UPDATE Invites SET signed = 1 WHERE user_id = ? and doc_id = ?;"
INVITE_DECLINE = "UPDATE Invites SET declined = 1 WHERE user_id = ? and doc_id = ?;"
INVITE_DELETE = "DELETE FROM Invites WHERE user_id = ? and doc_id = ?;"
INVITE_DELETE_ALL = "DELETE FROM Invites WHERE doc_id = ?;"


def make_dicts(cursor, row):
    """
    See https://flask.palletsprojects.com/en/1.1.x/patterns/sqlite3
    """
    return dict((cursor.description[idx][0], value) for idx, value in enumerate(row))


def get_db(db_path):
    db = getattr(g, '_database', None)
    if db is None:
        exists = os.path.isfile(db_path)
        db = g._database = sqlite3.connect(db_path)

        if not exists:
            db.cursor().executescript(DB_SCHEMA)
            db.commit()

        db.row_factory = make_dicts

        upgrade(db)

    return db


def upgrade(db):
    version = db.execute("PRAGMA user_version;").fetchone()['user_version']

    if version == 0:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [prev_signatures] TEXT;")
        cur.execute("PRAGMA user_version = 1;")
        cur.close()
        db.commit()

    if version == 1:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [sendsigned] INTEGER DEFAULT 1;")
        cur.execute("PRAGMA user_version = 2;")
        cur.close()
        db.commit()


def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


class SqliteMD(ABCMetadata):
    """
    Sqlite backend to deal with the metadata associated to documents
    to be signed by more than one user.

    This metadata includes data about the document (name, size, type),
    data about its owner (who has uploaded the document and invited other users to sign it),
    and data about the users who have been invited to sign the document.
    """

    def __init__(self, app: Flask):
        """
        :param app: flask app
        """
        self.app = app
        self.config = app.config
        self.logger = app.logger
        self.db_path = app.config['SQLITE_MD_DB_PATH']

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

    def add(self, key: uuid.UUID, document: Dict[str, Any], owner: Dict[str, str], invites: List[Dict[str, str]], sendsigned: bool):
        """
        Store metadata for a new document.

        :param key: The uuid that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + size: Size of the doc
                         + type: Content type of the doc
                         + prev_signatures: previous signatures
        :param owner: Name and email address of the user that has uploaded the document.
        :param invites: List of the names and emails of the users that have been invited to sign the document.
        :param sendsigned: Whether to send by email the final signed document to all who signed it.
        :return: The list of invitations as dicts with 3 keys: name, email, and generated key (UUID)
        """
        owner_result = self._db_query(USER_QUERY_ID, (owner['email'],), one=True)
        if owner_result is None:
            self.logger.info(f"Adding new (owning) user: {owner['name']}, {owner['email']}")
            self._db_execute(USER_INSERT, (owner['name'], owner['email']))
            owner_result = self._db_query(USER_QUERY_ID, (owner['email'],), one=True)

        if owner_result is None or isinstance(owner_result, list):  # This should never happen, it's just to please mypy
            self._db_commit()
            return

        owner_id = owner_result['user_id']
        prev_sigs = document.get("prev_signatures", "")

        self._db_execute(
            DOCUMENT_INSERT, (str(key), document['name'], document['size'], document['type'], owner_id, prev_sigs, sendsigned)
        )
        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)

        if document_result is None or isinstance(
            document_result, list
        ):  # This should never happen, it's just to please mypy
            self._db_commit()
            return

        document_id = document_result['doc_id']

        updated_invites = []

        for user in invites:
            user_result = self._db_query(USER_QUERY_ID, (user['email'],), one=True)
            if user_result is None:
                self._db_execute(USER_INSERT, (user['name'], user['email']))
                user_result = self._db_query(USER_QUERY_ID, (user['email'],), one=True)

            if user_result is None or isinstance(
                user_result, list
            ):  # This should never happen, it's just to please mypy
                continue

            user_id = user_result['user_id']
            invite_key = str(uuid.uuid4())
            self._db_execute(INVITE_INSERT, (invite_key, document_id, user_id))

            updated_invite = {'key': invite_key}
            updated_invite.update(user)
            updated_invite['id'] = user_id
            updated_invites.append(updated_invite)

        self._db_commit()
        return updated_invites

    def get_pending(self, email: str) -> List[Dict[str, Any]]:
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
                 + owner: Email and name of the user requesting the signature
                 + state: the state of the invitation
                 + pending: List of emails of the users invited to sign the document who have not yet done so.
                 + signed: List of emails of the users invited to sign the document who have already done so.
                 + declined: List of emails of the users invited to sign the document who have declined to do so.
                 + prev_signatures: previous signatures
        """
        invites = self._db_query(INVITE_QUERY_FROM_EMAIL, (email,))
        if invites is None or isinstance(invites, dict):
            return []

        pending = []
        for invite in invites:
            document_id = invite['doc_id']
            document = self._db_query(DOCUMENT_QUERY, (document_id,), one=True)
            if document is None or isinstance(document, list):
                self.logger.error(
                    f"Db seems corrupted, an invite for {email}"
                    f" references a non existing document with id {document_id}"
                )
                continue

            owner = document['owner']
            email_result = self._db_query(USER_QUERY, (owner,), one=True)
            if email_result is None or isinstance(email_result, list):
                self.logger.error(f"Db seems corrupted, a document references a non existing owner {owner}")
                continue

            document['owner'] = email_result
            document['key'] = uuid.UUID(document['key'])
            document['invite_key'] = uuid.UUID(invite['key'])
            document['pending'] = []
            document['signed'] = []
            document['declined'] = []
            document['state'] = "unconfirmed"

            subinvites = self._db_query(INVITE_QUERY_FROM_DOC, (document_id,))

            if subinvites is not None and not isinstance(subinvites, dict):
                for subinvite in subinvites:
                    user_id = subinvite['user_id']
                    subemail_result = self._db_query(USER_QUERY, (user_id,), one=True)
                    if subemail_result is None or isinstance(subemail_result, list):
                        self.logger.error(
                            f"Db seems corrupted, a subinvite for {document_id}"
                            f" references a non existing user with id {user_id}"
                        )
                        continue
                    if subemail_result['email'] == email:
                        continue
                    if subinvite['declined'] == 1:
                        document['declined'].append(subemail_result)
                    elif subinvite['signed'] == 1:
                        document['signed'].append(subemail_result)
                    else:
                        document['pending'].append(subemail_result)

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

        user_id = user_result['user_id']

        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to update a non-existing document with the signature of {email}")
            return

        document_id = document_result['doc_id']

        self.logger.info(f"Removing invite for {email} to sign {key}")
        self._db_execute(INVITE_UPDATE, (user_id, document_id))
        self._db_execute(
            DOCUMENT_UPDATE,
            (
                datetime.now().isoformat(),
                str(key),
            ),
        )
        self._db_commit()

    def decline(self, key: uuid.UUID, email: str):
        """
        Update the metadata of a document which an invited user has declined to sign.

        :param key: The key identifying the document in the `storage`.
        :param email: email address of the user that has just signed the document.
        """
        user_result = self._db_query(USER_QUERY_ID, (email,), one=True)
        if user_result is None or isinstance(user_result, list):
            self.logger.error(f"Trying to decline a document by non-existing {email}")
            return

        user_id = user_result['user_id']

        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to decline a non-existing document by {email}")
            return

        document_id = document_result['doc_id']

        self.logger.info(f"Declining invite for {email} to sign {key}")
        self._db_execute(INVITE_DECLINE, (user_id, document_id))
        self._db_execute(
            DOCUMENT_UPDATE,
            (
                datetime.now().isoformat(),
                str(key),
            ),
        )
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
                 + signed: List of emails of the users invited to sign the document who have already done so.
                 + state: the state of the invitation
                 + declined: List of emails of the users invited to sign the document who have declined to do so.
                 + prev_signatures: previous signatures
        """
        documents = self._db_query(DOCUMENT_QUERY_FROM_OWNER, (email,))
        if documents is None or isinstance(documents, dict):
            return []

        for document in documents:
            document['key'] = uuid.UUID(document['key'])
            document['pending'] = []
            document['signed'] = []
            document['declined'] = []
            state = 'loaded'
            document_id = document['doc_id']
            invites = self._db_query(INVITE_QUERY_FROM_DOC, (document_id,))
            del document['doc_id']
            if invites is None or isinstance(invites, dict):
                document['state'] = state
                continue
            for invite in invites:
                user_id = invite['user_id']
                email_result = self._db_query(USER_QUERY, (user_id,), one=True)
                if email_result is None or isinstance(email_result, list):
                    self.logger.error(
                        f"Db seems corrupted, an invite for {document_id}"
                        f" references a non existing user with id {user_id}"
                    )
                    continue
                if invite['declined'] == 1:
                    document['declined'].append(email_result)
                elif invite['signed'] == 1:
                    document['signed'].append(email_result)
                else:
                    state = 'incomplete'
                    document['pending'].append(email_result)

            document['state'] = state

        return documents

    def get_invited(self, key: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get information about the users that have been invited to sign the document identified by `key`

        :param key: The key of the document
        :return: A list of dictionaries with information about the users, each of them with keys:
                 + name: The name of the user
                 + email: The email of the user
                 + signed: Whether the user has already signed the document
                 + key: the key identifying the invite
        """
        invitees: List[Dict[str, Any]] = []

        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to remind invitees to sign non-existing document with key {key}")
            return invitees

        invites = self._db_query(INVITE_QUERY_FROM_DOC, (document_result['doc_id'],))
        if invites is None or isinstance(invites, dict):
            self.logger.error(f"Trying to remind non-existing invitees to sign document with key {key}")
            return invitees

        for invite in invites:
            user_id = invite['user_id']
            email_result = self._db_query(USER_QUERY, (user_id,), one=True)
            if email_result is None or isinstance(email_result, list):
                self.logger.error(
                    f"Db seems corrupted, an invite for document {key}"
                    f" references a non existing user with id {user_id}"
                )
                continue

            email_result['signed'] = bool(invite['signed'])
            email_result['declined'] = bool(invite['declined'])
            email_result['key'] = invite['key']
            invitees.append(email_result)

        return invitees

    def remove(self, key: uuid.UUID, force: bool = False) -> bool:
        """
        Remove from the store the metadata corresponding to the document identified by the `key`,
        typically because it has already been signed by all requested parties and has been handed to the owner.

        :param key: The key identifying the document.
        :param force: whether to remove the doc even if there are pending signatures
        :return: whether the document has been removed
        """
        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to delete a non-existing document with key {key}")
            return False

        document_id = document_result['doc_id']
        invites = self._db_query(INVITE_QUERY_UNSIGNED_FROM_DOC, (document_id,))

        if not force:
            if invites is None or isinstance(invites, dict):  # This should never happen, it's just to please mypy
                pass
            elif len(invites) != 0:
                self.logger.error(f"Refusing to remove document {key} with pending emails")
                return False

        else:
            self._db_execute(INVITE_DELETE_ALL, (document_id,))

        self._db_execute(DOCUMENT_DELETE, (str(key),))
        self._db_commit()

        return True

    def get_invitation(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get the invited user's name and email and the data on the document she's been invited to sign

        :param key: The key identifying the signing invitation
        :return: A dict with data on the user and the document
        """
        invite = self._db_query(INVITE_QUERY_FROM_KEY, (str(key),), one=True)
        if invite is None or isinstance(invite, list):
            self.logger.error(f"Retrieving a non-existing invite with key {key}")
            return {}

        doc = self._db_query(DOCUMENT_QUERY, (invite['doc_id'],), one=True)
        if doc is None or isinstance(doc, list):
            self.logger.error(f"Retrieving a non-existing document with key {key}")
            return {}

        doc['doc_id'] = invite['doc_id']
        user = self._db_query(USER_QUERY, (invite['user_id'],), one=True)

        return {'document': doc, 'user': user}

    def get_document(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get information about some document

        :param key: The key identifying the document
        :return: A dictionary with information about the document, with keys:
                 + doc_id: pk of the doc in the storage.
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
        """
        document_result = self._db_query(DOCUMENT_QUERY_ALL, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to find a non-existing document with key {key}")
            return {}

        return document_result

    def add_lock(self, doc_id: int, locked_by: str) -> bool:
        """
        Lock document to avoid it being signed by more than one invitee in parallel.
        This will first check that the doc is not already locked.

        :param doc_id: the pk for the document in the documents table
        :param locked_by: Email of the user locking the document
        :return: Whether the document has been locked.
        """
        lock_info = self._db_query(DOCUMENT_QUERY_LOCK, (doc_id,), one=True)
        self.logger.debug(f"Checking lock for {locked_by} in document with id {doc_id}: {lock_info}")
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to lock a non-existing document with id {doc_id}")
            return False

        user_result = self._db_query(USER_QUERY_ID, (locked_by,), one=True)
        if user_result is None or isinstance(user_result, list):
            self.logger.error(f"Trying to lock a document for non-existing {locked_by}")
            return False

        now = datetime.now()

        if isinstance(lock_info['locked'], str):
            locked = datetime.fromisoformat(lock_info['locked'])
        else:
            locked = lock_info['locked']

        if (
            locked is None
            or (now - locked) > current_app.config['DOC_LOCK_TIMEOUT']
            or lock_info['locked_by'] == user_result['user_id']
        ):
            self.logger.debug(f"Adding lock for {locked_by} in document with id {doc_id}: {lock_info}")
            self._db_execute(DOCUMENT_ADD_LOCK, (now, user_result['user_id'], doc_id))
            self._db_commit()
            return True

        return False

    def rm_lock(self, doc_id: int, unlocked_by: str) -> bool:
        """
        Remove lock from document. If the document is not locked, do nothing.
        The user unlocking must be that same user that locked it.

        :param doc_id: the pk for the document in the documents table
        :param unlocked_by: Email of the user unlocking the document
        :return: Whether the document has been unlocked.
        """
        lock_info = self._db_query(DOCUMENT_QUERY_LOCK, (doc_id,), one=True)
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to unlock a non-existing document with id {doc_id}")
            return False

        if lock_info['locked'] is None:
            return True

        user_result = self._db_query(USER_QUERY_ID, (unlocked_by,), one=True)
        if user_result is None or isinstance(user_result, list):
            self.logger.error(f"Trying to unlock a document for non-existing {unlocked_by}")
            return False

        now = datetime.now()

        if isinstance(lock_info['locked'], str):
            locked = datetime.fromisoformat(lock_info['locked'])
        else:
            locked = lock_info['locked']

        if (now - locked) < current_app.config['DOC_LOCK_TIMEOUT'] and lock_info['locked_by'] == user_result['user_id']:
            self._db_execute(DOCUMENT_RM_LOCK, (doc_id,))
            self._db_commit()
            return True

        return False

    def check_lock(self, doc_id: int, locked_by: str) -> bool:
        """
        Check whether the document identified by doc_id is locked.
        This will remove stale locks (older than the configured timeout).

        :param doc_id: the pk for the document in the documents table
        :param locked_by: Email of the user locking the document
        :return: Whether the document is locked by the user with `locked_by` email
        """
        lock_info = self._db_query(DOCUMENT_QUERY_LOCK, (doc_id,), one=True)
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to check a non-existing document with id {doc_id}")
            return False

        if lock_info['locked'] is None:
            self.logger.debug(f"Check a non-locked document with id {doc_id}")
            return False

        if isinstance(lock_info['locked'], str):
            locked = datetime.fromisoformat(lock_info['locked'])
        else:
            locked = lock_info['locked']

        now = datetime.now()

        if (now - locked) > current_app.config['DOC_LOCK_TIMEOUT']:
            self.logger.debug(f"Lock for document with id {doc_id} has expired")
            self._db_execute(DOCUMENT_RM_LOCK, (doc_id,))
            self._db_commit()
            return False

        user_info = self._db_query(USER_QUERY, (lock_info['locked_by'],), one=True)
        if user_info is None or isinstance(user_info, list):
            self.logger.error(f"Trying to check with a non-existing user with id {lock_info['locked_by']}")
            return False

        self.logger.debug(f"Checking lock for {doc_id} by {user_info['email']} for {locked_by}")
        return locked_by == user_info['email']

    def get_user(self, user_id: int) -> Dict[str, Any]:
        """
        Return information on some user.

        :param user_id: the pk for the user in the users table
        :return: Name and email of the user
        """
        user_info = self._db_query(USER_QUERY, (user_id,), one=True)
        if user_info is None or isinstance(user_info, list):
            self.logger.error(f"Trying to find with a non-existing user with id {user_id}")
            return {}

        return user_info

    def get_sendsigned(self, key: uuid.UUID) -> bool:
        """
        Whether the final signed document should be sent by email to signataries

        :param key: The key identifying the document
        :return: whether to send emails
        """
        document_result = self._db_query(DOCUMENT_QUERY_SENDSIGNED, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to find a non-existing document with key {key}")
            return True

        return bool(document_result['sendsigned'])
