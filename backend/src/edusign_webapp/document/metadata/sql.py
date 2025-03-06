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
       [owner_lang] VARCHAR(2) NOT NULL,
       [prev_signatures] TEXT,
       [sendsigned] INTEGER DEFAULT 1,
       [loa] VARCHAR(255) DEFAULT "low",
       [skipfinal] INTEGER DEFAULT 0,
       [locked] TIMESTAMP DEFAULT NULL,
       [locking_email] VARCHAR(255) DEFAULT NULL,
       [ordered_invitations] INTEGER DEFAULT 0,
       [invitation_text] TEXT
);
CREATE TABLE [Invites]
(      [inviteID] INTEGER PRIMARY KEY AUTOINCREMENT,
       [key] VARCHAR(255) NOT NULL,
       [user_email] VARCHAR(255) NOT NULL,
       [user_name] VARCHAR(255) NOT NULL,
       [user_lang] VARCHAR(2) NOT NULL,
       [doc_id] INTEGER NOT NULL,
       [signed] INTEGER DEFAULT 0,
       [declined] INTEGER DEFAULT 0,
       [order_invitation] INTEGER DEFAULT 0,
            FOREIGN KEY ([doc_id]) REFERENCES [Documents] ([doc_id])
              ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX IF NOT EXISTS [KeyIX] ON [Documents] ([key]);
CREATE INDEX IF NOT EXISTS [OwnerEmailIX] ON [Documents] ([owner_email]);
CREATE INDEX IF NOT EXISTS [OwnerEppnIX] ON [Documents] ([owner_eppn]);
CREATE INDEX IF NOT EXISTS [CreatedIX] ON [Documents] ([created]);
CREATE INDEX IF NOT EXISTS [InviteeEmailIX] ON [Invites] ([user_email]);
CREATE INDEX IF NOT EXISTS [InvitedIX] ON [Invites] ([doc_id]);
PRAGMA user_version = 9;
"""


DOCUMENT_INSERT = "INSERT INTO Documents (key, name, size, type, owner_email, owner_name, owner_lang, owner_eppn, prev_signatures, sendsigned, loa, skipfinal, ordered_invitations, invitation_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
DOCUMENT_INSERT_RAW = "INSERT INTO Documents (doc_id, key, name, size, type, created, updated, owner_email, owner_name, owner_lang, owner_eppn, prev_signatures, sendsigned, loa, skipfinal, ordered_invitations, invitation_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
DOCUMENT_QUERY_ID = "SELECT doc_id FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_ALL = (
    "SELECT key, name, size, type, doc_id, owner_email, owner_name, owner_lang FROM Documents WHERE key = ?;"
)
DOCUMENT_QUERY_LOCK = "SELECT locked, locking_email FROM Documents WHERE doc_id = ?;"
DOCUMENT_QUERY = "SELECT key, name, size, type, owner_email, owner_name, owner_lang, owner_eppn, prev_signatures, loa, created, ordered_invitations FROM Documents WHERE doc_id = ?;"
DOCUMENT_QUERY_FULL = "SELECT doc_id, key, name, size, type, owner_email, owner_name, owner_lang, owner_eppn, prev_signatures, sendsigned, loa, skipfinal, updated, created, ordered_invitations, invitation_text FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_OLD = "SELECT key FROM Documents WHERE date(created) <= date('now', '-%d days');"
DOCUMENT_QUERY_FROM_OWNER = "SELECT doc_id, key, name, size, type, prev_signatures, loa, created, skipfinal, ordered_invitations, sendsigned FROM Documents WHERE owner_eppn = ?;"
DOCUMENT_QUERY_FROM_OWNER_BY_EMAIL = "SELECT doc_id, key, name, size, type, prev_signatures, loa, created, skipfinal, ordered_invitations, sendsigned FROM Documents WHERE owner_email = ?;"
DOCUMENT_QUERY_SENDSIGNED = "SELECT sendsigned FROM Documents WHERE key = ?;"
DOCUMENT_SET_SENDSIGNED = "UPDATE Documents SET sendsigned = ? WHERE key = ?;"
DOCUMENT_QUERY_SKIPFINAL = "SELECT skipfinal FROM Documents WHERE key = ?;"
DOCUMENT_SET_SKIPFINAL = "UPDATE Documents SET skipfinal = ? WHERE key = ?;"
DOCUMENT_QUERY_ORDERED = "SELECT ordered_invitations FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_INVITATION_TEXT = "SELECT invitation_text FROM Documents WHERE key = ?;"
DOCUMENT_QUERY_LOA = "SELECT loa FROM Documents WHERE key = ?;"
DOCUMENT_UPDATE = "UPDATE Documents SET updated = ? WHERE key = ?;"
DOCUMENT_RM_LOCK = "UPDATE Documents SET locked = NULL, locking_email = '' WHERE doc_id = ?;"
DOCUMENT_ADD_LOCK = "UPDATE Documents SET locked = ?, locking_email = ? WHERE doc_id = ?;"
DOCUMENT_DELETE = "DELETE FROM Documents WHERE key = ?;"
INVITE_INSERT = (
    "INSERT INTO Invites (key, doc_id, user_email, user_name, user_lang, order_invitation) VALUES (?, ?, ?, ?, ?, ?)"
)
INVITE_INSERT_RAW = "INSERT INTO Invites (key, doc_id, user_email, user_name, user_lang, signed, declined, order_invitation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
INVITE_QUERY_FROM_EMAIL = (
    "SELECT doc_id, key FROM Invites WHERE user_email = ? AND signed = 0 AND declined = 0 ORDER BY order_invitation;"
)
INVITE_QUERY_FROM_DOC = "SELECT user_email, user_name, user_lang, signed, declined, key, order_invitation FROM Invites WHERE doc_id = ? ORDER BY order_invitation;"
INVITE_QUERY_UNSIGNED_FROM_DOC = (
    "SELECT inviteID FROM Invites WHERE doc_id = ? AND signed = 0 AND declined = 0 ORDER BY order_invitation;"
)
INVITE_QUERY_FROM_KEY = "SELECT user_name, user_email, user_lang, doc_id FROM Invites WHERE key = ?;"
INVITE_UPDATE = "UPDATE Invites SET signed = 1 WHERE user_email IN (%s) and doc_id = ?;"
INVITE_DECLINE = "UPDATE Invites SET declined = 1 WHERE user_email IN (%s) and doc_id = ?;"
INVITE_DELETE_FROM_KEY = "DELETE FROM Invites WHERE key = ?;"
INVITE_DELETE_ALL = "DELETE FROM Invites WHERE doc_id = ?;"
