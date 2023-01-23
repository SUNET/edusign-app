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
CREATE TABLE [Documents]
(      [doc_id] INTEGER PRIMARY KEY AUTOINCREMENT,
       [key] VARCHAR(255) NOT NULL,
       [name] VARCHAR(255) NOT NULL,
       [size] INTEGER NOT NULL,
       [type] VARCHAR(50) NOT NULL,
       [created] TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       [updated] TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       [owner_eppn] VARCHAR(255) NOT NULL,
       [owner_email] VARCHAR(255) NOT NULL,
       [owner_name] VARCHAR(255) NOT NULL,
       [prev_signatures] TEXT,
       [sendsigned] INTEGER DEFAULT 1,
       [loa] VARCHAR(255) DEFAULT "none",
       [locked] TIMESTAMP DEFAULT NULL,
       [locking_email] VARCHAR(255) DEFAULT NULL
);
CREATE TABLE [Invites]
(      [inviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [key] VARCHAR(255) NOT NULL,
       [user_email] VARCHAR(255) NOT NULL,
       [user_name] VARCHAR(255) NOT NULL,
       [doc_id] INTEGER NOT NULL,
       [signed] INTEGER DEFAULT 0,
       [declined] INTEGER DEFAULT 0,
            FOREIGN KEY ([doc_id]) REFERENCES [Documents] ([doc_id])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS [KeyIX] ON [Documents] ([key]);
CREATE INDEX IF NOT EXISTS [OwnerEmailIX] ON [Documents] ([owner_email]);
CREATE INDEX IF NOT EXISTS [OwnerEppnIX] ON [Documents] ([owner_eppn]);
CREATE INDEX IF NOT EXISTS [CreatedIX] ON [Documents] ([created]);
CREATE INDEX IF NOT EXISTS [InviteeEmailIX] ON [Invites] ([user_email]);
CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([doc_id]);
PRAGMA user_version = 5;
"""


DOCUMENT_INSERT = "INSERT INTO Documents (key, name, size, type, owner_email, owner_name, owner_eppn, prev_signatures, sendsigned, loa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
DOCUMENT_QUERY_ID = "SELECT doc_id FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_ALL = "SELECT key, name, size, type, doc_id, owner_email, owner_name FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_LOCK = "SELECT locked, locking_email FROM Documents WHERE doc_id = ?;"
DOCUMENT_QUERY = "SELECT key, name, size, type, owner_email, owner_name, owner_eppn, prev_signatures, loa, created FROM Documents WHERE doc_id = ?;"
DOCUMENT_QUERY_FULL = "SELECT doc_id, name, size, type, owner_email, owner_name, owner_eppn, prev_signatures, sendsigned, loa, created FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_OLD = "SELECT key FROM Documents WHERE date(created) <= date('now', '-%d days');"
DOCUMENT_QUERY_FROM_OWNER = (
    "SELECT doc_id, key, name, size, type, prev_signatures, loa, created FROM Documents WHERE owner_eppn = ?;"
)
DOCUMENT_QUERY_FROM_OWNER_BY_EMAIL = (
    "SELECT doc_id, key, name, size, type, prev_signatures, loa, created FROM Documents WHERE owner_email = ?;"
)
DOCUMENT_QUERY_SENDSIGNED = "SELECT sendsigned FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_LOA = "SELECT loa FROM Documents WHERE key = ?;"
DOCUMENT_UPDATE = "UPDATE Documents SET updated = ? WHERE key = ?;"
DOCUMENT_RM_LOCK = "UPDATE Documents SET locked = NULL, locking_email = '' WHERE doc_id = ?;"
DOCUMENT_ADD_LOCK = "UPDATE Documents SET locked = ?, locking_email = ? WHERE doc_id = ?;"
DOCUMENT_DELETE = "DELETE FROM Documents WHERE key = ?;"
INVITE_INSERT = "INSERT INTO Invites (key, doc_id, user_email, user_name) VALUES (?, ?, ?, ?)"
INVITE_QUERY_FROM_EMAIL = "SELECT doc_id, key FROM Invites WHERE user_email = ? AND signed = 0 AND declined = 0;"
INVITE_QUERY_FROM_DOC = "SELECT user_email, user_name, signed, declined, key FROM Invites WHERE doc_id = ?;"
INVITE_QUERY_UNSIGNED_FROM_DOC = "SELECT inviteID FROM Invites WHERE doc_id = ? AND signed = 0 AND declined = 0;"
INVITE_QUERY_FROM_KEY = "SELECT user_name, user_email, doc_id FROM Invites WHERE key = ?;"
INVITE_UPDATE = "UPDATE Invites SET signed = 1 WHERE user_email IN (%s) and doc_id = ?;"
INVITE_DECLINE = "UPDATE Invites SET declined = 1 WHERE user_email IN (%s) and doc_id = ?;"
INVITE_DELETE = "DELETE FROM Invites WHERE user_id = ? and doc_id = ?;"
INVITE_DELETE_FROM_KEY = "DELETE FROM Invites WHERE key = ?;"
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

    if version == 2:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [loa] VARCHAR(255) DEFAULT \"none\";")
        cur.execute("PRAGMA user_version = 3;")
        cur.close()
        db.commit()

    if version == 3:
        cur = db.cursor()
        cur.execute("CREATE INDEX IF NOT EXISTS [CreatedIX] ON [Documents] ([created]);")
        cur.execute("PRAGMA user_version = 4;")
        cur.close()
        db.commit()
        version = 4

    if version == 4:
        cur = db.cursor()

        cur.execute("ALTER TABLE [Documents] ADD COLUMN [owner_email] VARCHAR(255) DEFAULT \"\";")
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [owner_name] VARCHAR(255) DEFAULT \"\";")
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [owner_eppn] VARCHAR(255) DEFAULT \"\";")
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [locking_email] VARCHAR(255) DEFAULT \"\";")
        cur.execute("ALTER TABLE [Invites] ADD COLUMN [user_email] VARCHAR(255) DEFAULT \"\";")
        cur.execute("ALTER TABLE [Invites] ADD COLUMN [user_name] VARCHAR(255) DEFAULT \"\";")

        cur.execute("UPDATE Documents SET owner_email = (SELECT email FROM Users WHERE user_id = Documents.owner);")
        cur.execute("UPDATE Documents SET owner_name = (SELECT name FROM Users WHERE user_id = Documents.owner);")

        cur.execute("UPDATE Invites SET user_email = (SELECT email FROM Users WHERE user_id = Invites.user_id);")
        cur.execute("UPDATE Invites SET user_name = (SELECT name FROM Users WHERE user_id = Invites.user_id);")

        cur.execute(
            "UPDATE Documents SET locking_email = (SELECT email FROM Users WHERE user_id = Documents.locked_by);"
        )

        cur.execute("DROP INDEX IF EXISTS [EmailIX];")
        cur.execute("DROP INDEX IF EXISTS [KeyIX];")
        cur.execute("DROP INDEX IF EXISTS [OwnerIX];")
        cur.execute("DROP INDEX IF EXISTS [CreatedIX];")
        cur.execute("DROP INDEX IF EXISTS [InviteeIX];")
        cur.execute("DROP INDEX IF EXISTS [InvitedIX];")

        drop_owner_and_locked_by_in_documents(cur)
        drop_user_id_in_invites(cur)
        cur.execute("DROP TABLE [Users];")

        cur.execute("CREATE INDEX IF NOT EXISTS [OwnerEmailIX] ON [Documents] ([owner_email]);")
        cur.execute("CREATE INDEX IF NOT EXISTS [OwnerEppnIX] ON [Documents] ([owner_eppn]);")
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS [KeyIX] ON [Documents] ([key]);")
        cur.execute("CREATE INDEX IF NOT EXISTS [CreatedIX] ON [Documents] ([created]);")
        cur.execute("CREATE INDEX IF NOT EXISTS [InviteeEmailIX] ON [Invites] ([user_email]);")
        cur.execute("CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([doc_id]);")

        cur.execute("PRAGMA user_version = 5;")
        cur.close()
        db.commit()


def drop_owner_and_locked_by_in_documents(cur):
    cur.execute(
        """
        CREATE TABLE [DocumentsNew]
        (      [doc_id] INTEGER PRIMARY KEY AUTOINCREMENT,
               [key] VARCHAR(255) NOT NULL,
               [name] VARCHAR(255) NOT NULL,
               [size] INTEGER NOT NULL,
               [type] VARCHAR(50) NOT NULL,
               [created] TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               [updated] TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               [owner_eppn] VARCHAR(255) NOT NULL,
               [owner_email] VARCHAR(255) NOT NULL,
               [owner_name] VARCHAR(255) NOT NULL,
               [prev_signatures] TEXT,
               [sendsigned] INTEGER DEFAULT 1,
               [loa] VARCHAR(255) DEFAULT "none",
               [locked] TIMESTAMP DEFAULT NULL,
               [locking_email] VARCHAR(255) DEFAULT NULL
        );
    """
    )
    cur.execute(
        """INSERT INTO DocumentsNew
                    (doc_id, key, name, size, type, created, updated, owner_eppn, owner_email, owner_name, prev_signatures, sendsigned, loa, locked, locking_email)
                    SELECT doc_id, key, name, size, type, created, updated, owner_eppn, owner_email, owner_name, prev_signatures, sendsigned, loa, locked, locking_email
                FROM Documents;
    """
    )
    cur.execute("DROP TABLE [Documents];")
    cur.execute("ALTER TABLE [DocumentsNew] RENAME TO [Documents];")


def drop_user_id_in_invites(cur):
    cur.execute(
        """
        CREATE TABLE [InvitesNew]
        (      [inviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
               [key] VARCHAR(255) NOT NULL,
               [user_email] VARCHAR(255) NOT NULL,
               [user_name] VARCHAR(255) NOT NULL,
               [doc_id] INTEGER NOT NULL,
               [signed] INTEGER DEFAULT 0,
               [declined] INTEGER DEFAULT 0,
                    FOREIGN KEY ([doc_id]) REFERENCES [Documents] ([doc_id])
                      ON DELETE NO ACTION ON UPDATE NO ACTION
        );
    """
    )
    cur.execute(
        """INSERT INTO InvitesNew
                    (inviteId, key, user_email, user_name, doc_id, signed, declined)
                    SELECT inviteID, key, user_email, user_name, doc_id, signed, declined
                FROM Invites;
    """
    )
    cur.execute("DROP TABLE [Invites];")
    cur.execute("ALTER TABLE [InvitesNew] RENAME TO [Invites];")


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

    def add(
        self,
        key: uuid.UUID,
        document: Dict[str, Any],
        owner: Dict[str, str],
        invites: List[Dict[str, Any]],
        sendsigned: bool,
        loa: str,
    ):
        """
        Store metadata for a new document.

        :param key: The uuid that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + size: Size of the doc
                         + type: Content type of the doc
                         + prev_signatures: previous signatures
        :param owner: Name and email address and eppn of the user that has uploaded the document.
        :param invites: List of the names and emails of the users that have been invited to sign the document.
        :param sendsigned: Whether to send by email the final signed document to all who signed it.
        :param loa: The "authentication for signature" required LoA.
        :return: The list of invitations as dicts with 3 keys: name, email, and generated key (UUID)
        """
        prev_sigs = document.get("prev_signatures", "")

        self._db_execute(
            DOCUMENT_INSERT,
            (
                str(key),
                document['name'],
                document['size'],
                document['type'],
                owner['email'],
                owner['name'],
                owner['eppn'],
                prev_sigs,
                sendsigned,
                loa,
            ),
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
            invite_key = str(uuid.uuid4())
            self._db_execute(INVITE_INSERT, (invite_key, document_id, user['email'], user['name']))

            updated_invite = {'key': invite_key}
            updated_invite.update(user)
            updated_invites.append(updated_invite)

        self._db_commit()
        return updated_invites

    def add_document_raw(
        self,
        document: Dict[str, str],
        invites: List[Dict[str, Any]],
    ) -> List[Dict[str, str]]:
        """
        Store metadata for a new document.

        :param document: Content and metadata of the document. Dictionary containing keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + owner_email: Email of owner
                 + owner_name: Display name of owner
                 + owner_eppn: eppn of owner
                 + loa: required loa
                 + sendsigned: whether to send the signed document by mail
                 + prev_signatures: previous signatures
                 + created: creation timestamp
        :param invites: List of the names and emails of the users that have been invited to sign the document.
        :return:
        """
        self._db_execute(
            DOCUMENT_INSERT,
            (
                str(document['key']),
                document['name'],
                document['size'],
                document['type'],
                document['email'],
                document['name'],
                document['eppn'],
                document['prev_signatures'],
                document['sendsigned'],
                document['loa'],
            ),
        )

    def get_old(self, days: int) -> List[uuid.UUID]:
        """
        Get the keys identifying stored documents that are older than the provided number of days.

        :param days: max number of days a document is kept in the db.
        :return: A list of UUIDs identifying the documents
        """
        assert isinstance(days, int)
        query = DOCUMENT_QUERY_OLD % days
        old_docs = self._db_query(query, ())

        if old_docs is None or isinstance(old_docs, dict):
            return []

        return [uuid.UUID(doc['key']) for doc in old_docs]

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
                 + owner_email: Email of the user requesting the signature
                 + owner_name: Display name of the user requesting the signature
                 + state: the state of the invitation
                 + pending: List of emails of the users invited to sign the document who have not yet done so.
                 + signed: List of emails of the users invited to sign the document who have already done so.
                 + declined: List of emails of the users invited to sign the document who have declined to do so.
                 + prev_signatures: previous signatures
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
        """
        invites = self._db_query(INVITE_QUERY_FROM_EMAIL, (email,))
        if invites is None or isinstance(invites, dict):
            return []

        pending = []
        doc_ids = []
        for invite in invites:
            document_id = invite['doc_id']
            if document_id in doc_ids:
                self.rm_invitation(uuid.UUID(invite['key']), uuid.UUID(document_id))
                continue
            else:
                doc_ids.append(document_id)

            document = self._db_query(DOCUMENT_QUERY, (document_id,), one=True)
            if document is None or isinstance(document, list):
                self.logger.error(
                    f"Db seems corrupted, an invite for {email}"
                    f" references a non existing document with id {document_id}"
                )
                continue

            document['owner'] = {
                'email': document['owner_email'],
                'name': document['owner_name'],
                'eppn': document['owner_eppn'],
            }
            document['key'] = uuid.UUID(document['key'])
            document['invite_key'] = uuid.UUID(invite['key'])
            document['pending'] = []
            document['signed'] = []
            document['declined'] = []
            document['state'] = "unconfirmed"
            document['created'] = datetime.fromisoformat(document['created']).timestamp() * 1000

            subinvites = self._db_query(INVITE_QUERY_FROM_DOC, (document_id,))

            if subinvites is not None and not isinstance(subinvites, dict):
                for subinvite in subinvites:
                    subemail_result = {'email': subinvite['user_email'], 'name': subinvite['user_name']}
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

    def update(self, key: uuid.UUID, emails: List[str]):
        """
        Update the metadata of a document to which a new signature has been added.
        This is, remove corresponding entry in the Invites table.

        :param key: The key identifying the document in the `storage`.
        :param emails: email addresses of the user that has just signed the document.
        """
        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to update a non-existing document with the signature of {emails}")
            return

        document_id = document_result['doc_id']

        self.logger.info(f"Removing invite for {emails} to sign {key}")
        invite_update = INVITE_UPDATE % " ,".join(["?"] * len(emails))
        self._db_execute(invite_update, (*emails, document_id))
        self._db_execute(
            DOCUMENT_UPDATE,
            (
                datetime.now().isoformat(),
                str(key),
            ),
        )
        self._db_commit()

    def decline(self, key: uuid.UUID, emails: List[str]):
        """
        Update the metadata of a document which an invited user has declined to sign.

        :param key: The key identifying the document in the `storage`.
        :param emails: email addresses of the user that has just signed the document.
        """
        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.error(f"Trying to decline a non-existing document by {emails}")
            return

        document_id = document_result['doc_id']

        self.logger.info(f"Declining invite for {emails} to sign {key}")
        invite_decline = INVITE_DECLINE % " ,".join(["?"] * len(emails))
        self._db_execute(invite_decline, (*emails, document_id))
        self._db_execute(
            DOCUMENT_UPDATE,
            (
                datetime.now().isoformat(),
                str(key),
            ),
        )
        self._db_commit()

    def get_owned(self, eppn: str) -> List[Dict[str, Any]]:
        """
        Get information about the documents that have been added by some user to be signed by other users.

        :param eppn: The eppn of the user
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
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
        """
        documents = self._db_query(DOCUMENT_QUERY_FROM_OWNER, (eppn,))
        if documents is None or isinstance(documents, dict):
            return []

        return self._get_owned(documents)

    def get_owned_by_email(self, email: str) -> List[Dict[str, Any]]:
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
                 + declined: List of emails of the users invited to sign the document who have declined to do so.
                 + prev_signatures: previous signatures
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
        """
        documents = self._db_query(DOCUMENT_QUERY_FROM_OWNER_BY_EMAIL, (email,))
        if documents is None or isinstance(documents, dict):
            return []

        return self._get_owned(documents)

    def _get_owned(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for document in documents:
            document['key'] = uuid.UUID(document['key'])
            document['pending'] = []
            document['signed'] = []
            document['declined'] = []
            document['created'] = datetime.fromisoformat(document['created']).timestamp() * 1000
            state = 'loaded'
            document_id = document['doc_id']
            invites = self._db_query(INVITE_QUERY_FROM_DOC, (document_id,))
            del document['doc_id']
            if invites is None or isinstance(invites, dict):
                document['state'] = state
                continue
            for invite in invites:
                email_result = {'email': invite['user_email'], 'name': invite['user_name']}
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
                 + declined: Whether the user has declined signing the document
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
            email_result = {'email': invite['user_email'], 'name': invite['user_name']}
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
        user = {'name': invite['user_name'], 'email': invite['user_email']}

        return {'document': doc, 'user': user}

    def add_invitation(self, document_key: uuid.UUID, name: str, email: str, invite_key: str = '') -> Dict[str, Any]:
        """
        Create a new invitation to sign

        :param document_key: The key identifying the document to sign
        :param name: The name for the new invitation
        :param email: The email for the new invitation
        :param invite_key: The invite key for the new invitation
        :return: data on the new invitation
        """
        document_result = self._db_query(DOCUMENT_QUERY_ID, (str(document_key),), one=True)
        if document_result is None or isinstance(
            document_result, list
        ):  # This should never happen, it's just to please mypy
            return {}

        document_id = document_result['doc_id']
        if invite_key == '':
            invite_key = str(uuid.uuid4())

        self._db_execute(INVITE_INSERT, (invite_key, document_id, email, name))
        self._db_commit()

        return {'key': invite_key, 'name': name, 'email': email}

    def rm_invitation(self, invite_key: uuid.UUID, document_key: uuid.UUID) -> bool:
        """
        Remove an invitation to sign

        :param invite_key: The key identifying the signing invitation to remove
        :param document_key: The key identifying the signing invitation to remove
        :return: success
        """
        self._db_execute(INVITE_DELETE_FROM_KEY, (str(invite_key),))
        self._db_commit()
        return True

    def get_full_document(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get full information about some document

        :param key: The key identifying the document
        :return: A dictionary with information about the document, with keys:
                 + doc_id: pk of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + owner_email: Email of owner
                 + owner_name: Display name of owner
                 + owner_eppn: eppn of owner
                 + loa: required loa
                 + sendsigned: whether to send the signed document by mail
                 + prev_signatures: previous signatures
                 + created: creation timestamp
        """
        document_result = self._db_query(DOCUMENT_QUERY_FULL, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.debug(f"Trying to find a non-existing document with key {key}")
            return {}

        return document_result

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
                 + owner_email: Email of owner
                 + owner_name: Display name of owner
        """
        document_result = self._db_query(DOCUMENT_QUERY_ALL, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.debug(f"Trying to find a non-existing document with key {key}")
            return {}

        return document_result

    def add_lock(self, doc_id: int, locking_email: str) -> bool:
        """
        Lock document to avoid it being signed by more than one invitee in parallel.
        This will first check that the doc is not already locked.

        :param doc_id: the pk for the document in the documents table
        :param locking_email: Email of the user locking the document
        :return: Whether the document has been locked.
        """
        lock_info = self._db_query(DOCUMENT_QUERY_LOCK, (doc_id,), one=True)
        self.logger.debug(f"Checking lock for {locking_email} in document with id {doc_id}: {lock_info}")
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to lock a non-existing document with id {doc_id}")
            return False

        now = datetime.now()

        if isinstance(lock_info['locked'], str):
            locked = datetime.fromisoformat(lock_info['locked'])
        else:
            locked = lock_info['locked']

        if (
            locked is None
            or (now - locked) > current_app.config['DOC_LOCK_TIMEOUT']
            or lock_info['locking_email'] == locking_email
        ):
            self.logger.debug(f"Adding lock for {locking_email} in document with id {doc_id}: {lock_info}")
            self._db_execute(DOCUMENT_ADD_LOCK, (now, locking_email, doc_id))
            self._db_commit()
            return True

        return False

    def rm_lock(self, doc_id: int, unlocking_email: List[str]) -> bool:
        """
        Remove lock from document. If the document is not locked, do nothing.
        The user unlocking must be that same user that locked it.

        :param doc_id: the pk for the document in the documents table
        :param unlocking_email: Emails of the user unlocking the document
        :return: Whether the document has been unlocked.
        """
        lock_info = self._db_query(DOCUMENT_QUERY_LOCK, (doc_id,), one=True)
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to unlock a non-existing document with id {doc_id}")
            return False

        if lock_info['locked'] is None:
            return True

        now = datetime.now()

        if isinstance(lock_info['locked'], str):
            locked = datetime.fromisoformat(lock_info['locked'])
        else:
            locked = lock_info['locked']

        if (now - locked) < current_app.config['DOC_LOCK_TIMEOUT'] and lock_info['locking_email'] in unlocking_email:
            self._db_execute(DOCUMENT_RM_LOCK, (doc_id,))
            self._db_commit()
            return True

        return False

    def check_lock(self, doc_id: int, locking_email: List[str]) -> bool:
        """
        Check whether the document identified by doc_id is locked.
        This will remove stale locks (older than the configured timeout).

        :param doc_id: the pk for the document in the documents table
        :param locking_email: Email of the user locking the document
        :return: Whether the document is locked by the user with `locking_email` emails
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

        self.logger.debug(f"Checking lock for {doc_id} by {lock_info['locking_email']} for {locking_email}")
        return lock_info['locking_email'] in locking_email

    def get_sendsigned(self, key: uuid.UUID) -> bool:
        """
        Whether the final signed document should be sent by email to signataries

        :param key: The key identifying the document
        :return: whether to send emails
        """
        document_result = self._db_query(DOCUMENT_QUERY_SENDSIGNED, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.debug(f"Trying to find a non-existing document with key {key}")
            return True

        return bool(document_result['sendsigned'])

    def get_loa(self, key: uuid.UUID) -> str:
        """
        Required LoA for signature authn context

        :param key: The key identifying the document
        :return: LoA
        """
        document_result = self._db_query(DOCUMENT_QUERY_LOA, (str(key),), one=True)
        if document_result is None or isinstance(document_result, list):
            self.logger.debug(f"Trying to find loa for a non-existing document with key {key}")
            return "none"

        return str(document_result['loa'])
