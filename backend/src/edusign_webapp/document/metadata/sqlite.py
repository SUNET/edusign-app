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
from typing import Any, Dict, List, Union

from flask import Flask, g

from edusign_webapp.document.metadata import sql


sqlite3.register_converter("date", sql.convert_date)
sqlite3.register_converter("datetime", sql.convert_datetime)
sqlite3.register_converter("timestamp", sql.convert_timestamp)


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
            db.cursor().executescript(sql.DB_SCHEMA)
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

    if version == 5:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [owner_lang] VARCHAR(2) DEFAULT \"sv\";")
        cur.execute("ALTER TABLE [Invites] ADD COLUMN [user_lang] VARCHAR(2) DEFAULT \"sv\";")
        cur.execute("PRAGMA user_version = 6;")
        cur.close()
        db.commit()

    if version == 6:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [skipfinal] INTEGER DEFAULT 0;")
        cur.execute("PRAGMA user_version = 7;")
        cur.close()
        db.commit()

    if version == 7:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [ordered_invitations] INTEGER DEFAULT 0;")
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [invitation_text] TEXT DEFAULT \"\";")
        cur.execute("ALTER TABLE [Invites] ADD COLUMN [order_invitation] INTEGER DEFAULT 0;")
        cur.execute("PRAGMA user_version = 8;")
        cur.close()
        db.commit()

    if version == 8:
        cur = db.cursor()
        cur.execute("ALTER TABLE [Documents] DROP COLUMN [loa];")
        cur.execute("ALTER TABLE [Documents] ADD COLUMN [loa] VARCHAR(255) DEFAULT \"low\";")
        cur.execute("PRAGMA user_version = 9;")
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


class SqliteMD(sql.SqlMD):
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
        super().__init__(app)
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
