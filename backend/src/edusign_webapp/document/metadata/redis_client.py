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
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List

from flask import Flask, current_app
from flask_redis import FlaskRedis

from edusign_webapp.doc_store import ABCMetadata


class RedisStorageBackend:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.transaction = None

    def pipeline(self):
        self.transaction = self.redis.pipeline()

    def commit(self):
        self.transaction.execute()
        self.transaction = None

    def abort(self):
        self.transaction.reset()
        self.transaction = None

    def insert_user(self, name, email):
        user_id = self.redis.incr('user-counter')
        self.transaction.hset(f"user:{user_id}", mapping=dict(name=name, email=email))
        self.transaction.set(f"user:email:{email}", user_id)
        return user_id

    def query_user_id(self, email):
        user_id = self.redis.get(f'user:email:{email}')
        if user_id is not None:
            return int(user_id)

    def query_user(self, user_id):
        b_user = self.redis.hgetall(f"user:{user_id}")
        if not b_user:
            return
        user = {
            'name': b_user[b'name'].decode('utf8'),
            'email': b_user[b'email'].decode('utf8'),
            'user_id': user_id,
        }
        return user

    def query_user_name(self, email):
        user_id = self.query_user_id(email)
        if user_id is not None:
            user = self.query_user(user_id)
            if user is not None:
                return user['name']

    def insert_document(self, key, name, size, type, owner, prev_signatures, sendsigned, loa):
        doc_id = self.redis.incr('doc-counter')
        now = datetime.now().timestamp()
        mapping = dict(
            key=key,
            name=name,
            size=size,
            type=type,
            owner=owner,
            created=now,
            updated=now,
            prev_signatures=prev_signatures,
            sendsigned=int(sendsigned),
            loa=loa,
        )
        self.transaction.hset(f"doc:{doc_id}", mapping=mapping)
        self.transaction.set(f"doc:key:{key}", doc_id)
        self.transaction.sadd(f"doc:owner:{owner}", doc_id)
        self.transaction.zadd("doc:created", {key: now})
        return doc_id

    def query_document_id(self, key):
        doc_id = self.redis.get(f"doc:key:{key}")
        if doc_id is not None:
            return int(doc_id)

    def query_document_all(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        doc = dict(
            key=key,
            name=b_doc[b'name'].decode('utf8'),
            size=int(b_doc[b'size']),
            type=b_doc[b'type'].decode('utf8'),
            doc_id=doc_id,
            owner=int(b_doc[b'owner']),
        )
        return doc

    def query_document_lock(self, doc_id):
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        doc = dict(
            locked=None
            if b'locked' not in b_doc or b_doc[b'locked'] is None
            else datetime.fromtimestamp(float(b_doc[b'locked'])),
            locked_by=None if b'locked_by' not in b_doc or b_doc[b'locked_by'] is None else int(b_doc[b'locked_by']),
        )
        return doc

    def query_document(self, doc_id):
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        doc = dict(
            key=uuid.UUID(b_doc[b'key'].decode('utf8')),
            name=b_doc[b'name'].decode('utf8'),
            size=int(b_doc[b'size']),
            type=b_doc[b'type'].decode('utf8'),
            owner=int(b_doc[b'owner']),
            prev_signatures=b_doc[b'prev_signatures'].decode('utf8'),
            loa=b_doc[b'loa'].decode('utf8'),
        )
        return doc

    def query_documents_old(self, days):
        now = datetime.now()
        delta = timedelta(days=days)
        then = now - delta
        ts = then.timestamp()
        keys = self.redis.zrange("doc:created", 0, ts)
        return [uuid.UUID(b_doc[b'key'].decode('utf8')) for b_doc in keys]

    def query_documents_from_owner(self, email):
        docs = []
        raw_user_id = self.redis.get(f'user:email:{email}')
        if raw_user_id is None:
            return docs
        user_id = int(raw_user_id)
        doc_ids = self.redis.smembers(f'doc:owner:{user_id}')
        for b_doc_id in doc_ids:
            doc_id = int(b_doc_id)
            b_doc = self.redis.hgetall(f"doc:{doc_id}")
            doc = dict(
                doc_id=doc_id,
                key=uuid.UUID(b_doc[b'key'].decode('utf8')),
                name=b_doc[b'name'].decode('utf8'),
                size=int(b_doc[b'size']),
                type=b_doc[b'type'].decode('utf8'),
                prev_signatures=b_doc[b'prev_signatures'].decode('utf8'),
                loa=b_doc[b'loa'].decode('utf8'),
            )
            docs.append(doc)
        return docs

    def query_sendsigned(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return True
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        return bool(b_doc[b'sendsigned'])

    def query_loa(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return "none"
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        return str(b_doc.get(b'loa', "none"))

    def update_document(self, key, updated):
        doc_id = int(self.redis.get(f"doc:key:{key}"))
        self.transaction.hset(f"doc:{doc_id}", mapping=dict(updated=updated))

    def rm_document_lock(self, doc_id):
        self.transaction.hdel(f"doc:{doc_id}", 'locked')
        self.transaction.hdel(f"doc:{doc_id}", 'locked_by')

    def add_document_lock(self, doc_id, locked, locked_by):
        self.transaction.hset(f"doc:{doc_id}", mapping=dict(locked=locked, locked_by=locked_by))

    def delete_document(self, key):
        doc_id = int(self.redis.get(f"doc:key:{key}"))
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        owner = int(b_doc[b'owner'])
        self.transaction.delete(f"doc:{doc_id}")
        self.transaction.delete(f"doc:key:{key}")
        self.transaction.srem(f"doc:owner:{owner}", doc_id)
        self.transaction.zrem("doc:created", key)

    def insert_invite(self, key, doc_id, user_id, owner_id):
        invite_id = self.redis.incr('invite-counter')
        mapping = dict(
            key=key,
            doc_id=doc_id,
            user_id=user_id,
            owner_id=owner_id,
            signed=0,
            declined=0,
        )
        self.transaction.hset(f"invite:{invite_id}", mapping=mapping)
        self.transaction.set(f"invite:key:{key}", invite_id)
        self.transaction.sadd(f"invites:unsigned:owner:{owner_id}", invite_id)
        self.transaction.sadd(f"invites:unsigned:document:{doc_id}", invite_id)
        self.transaction.sadd(f"invites:unsigned:invited:{user_id}", invite_id)
        return invite_id

    def delete_invites_all(self, doc_id):
        invite_ids = self.redis.sunion(f"invites:unsigned:document:{doc_id}", f"invites:signed:document:{doc_id}")
        for b_invite_id in invite_ids:
            invite_id = int(b_invite_id)
            owner_id = int(self.redis.hget(f"invite:{invite_id}", 'owner_id'))
            user_id = int(self.redis.hget(f"invite:{invite_id}", 'user_id'))
            self.transaction.delete(f"invite:{invite_id}")
            self.transaction.srem(f"invites:unsigned:owner:{owner_id}", invite_id)
            self.transaction.delete(f"invites:unsigned:document:{doc_id}")
            self.transaction.srem(f"invites:unsigned:invited:{user_id}", invite_id)
            self.transaction.srem(f"invites:signed:owner:{owner_id}", invite_id)
            self.transaction.delete(f"invites:signed:document:{doc_id}")
            self.transaction.srem(f"invites:signed:invited:{user_id}", invite_id)
            self.transaction.srem(f"invites:declined:owner:{owner_id}", invite_id)
            self.transaction.delete(f"invites:declined:document:{doc_id}")
            self.transaction.srem(f"invites:declined:invited:{user_id}", invite_id)

    def query_invites_from_email(self, email):
        b_user_id = self.redis.get(f'user:email:{email}')
        invites = []
        if b_user_id is not None:
            user_id = int(b_user_id)
            invite_ids = self.redis.smembers(f'invites:unsigned:invited:{user_id}')
            for invite_id in invite_ids:
                b_invite = self.redis.hgetall(f"invite:{int(invite_id)}")
                invites.append(
                    {
                        'doc_id': int(b_invite[b'doc_id']),
                        'key': b_invite[b'key'].decode('utf8'),
                    }
                )
        return invites

    def query_invites_from_doc(self, doc_id):
        """"""
        invite_ids = self.redis.sunion(
            f'invites:unsigned:document:{doc_id}',
            f'invites:signed:document:{doc_id}',
            f'invites:declined:document:{doc_id}',
        )
        invites = []
        for invite_id in invite_ids:
            b_invite = self.redis.hgetall(f"invite:{int(invite_id)}")
            invites.append(
                {
                    'user_id': int(b_invite[b'user_id']),
                    'key': b_invite[b'key'].decode('utf8'),
                    'signed': int(b_invite[b'signed']),
                    'declined': int(b_invite[b'declined']),
                }
            )
        return invites

    def query_unsigned_invites_from_doc(self, doc_id):
        """"""
        invite_ids = self.redis.smembers(f'invites:unsigned:document:{doc_id}')
        invites = []
        for invite_id in invite_ids:
            b_invite = self.redis.hgetall(f"invite:{int(invite_id)}")
            invites.append(
                {
                    'user_id': int(b_invite[b'user_id']),
                    'key': b_invite[b'key'].decode('utf8'),
                }
            )
        return invites

    def query_invite_id(self, key):
        invite_id = self.redis.get(f"invite:key:{key}")
        if invite_id is not None:
            return int(invite_id)

    def query_invite_from_key(self, key):
        """"""
        invite_id = self.query_invite_id(key)
        if invite_id is not None:
            b_invite = self.redis.hgetall(f"invite:{invite_id}")
            invite = dict(
                user_id=int(b_invite[b'user_id']),
                doc_id=int(b_invite[b'doc_id']),
            )
            return invite

    def update_invite(self, user_id, doc_id):
        invite_ids = self.redis.sinter(f"invites:unsigned:document:{doc_id}", f"invites:unsigned:invited:{user_id}")
        assert len(invite_ids) == 1
        invite_id = int(list(invite_ids)[0])
        self.transaction.hset(f"invite:{invite_id}", mapping={'signed': 1})
        owner_id = int(self.redis.hget(f"invite:{invite_id}", 'owner_id'))
        self.transaction.smove(f"invites:unsigned:owner:{owner_id}", f"invites:signed:owner:{owner_id}", invite_id)
        self.transaction.smove(f"invites:unsigned:invited:{user_id}", f"invites:signed:invited:{user_id}", invite_id)
        self.transaction.smove(f"invites:unsigned:document:{doc_id}", f"invites:signed:document:{doc_id}", invite_id)

    def decline_invite(self, user_id, doc_id):
        invite_ids = self.redis.sinter(f"invites:unsigned:document:{doc_id}", f"invites:unsigned:invited:{user_id}")
        assert len(invite_ids) == 1
        invite_id = int(list(invite_ids)[0])
        self.transaction.hset(f"invite:{invite_id}", mapping={'declined': 1})
        owner_id = int(self.redis.hget(f"invite:{invite_id}", 'owner_id'))
        self.transaction.smove(f"invites:unsigned:owner:{owner_id}", f"invites:declined:owner:{owner_id}", invite_id)
        self.transaction.smove(f"invites:unsigned:invited:{user_id}", f"invites:declined:invited:{user_id}", invite_id)
        self.transaction.smove(f"invites:unsigned:document:{doc_id}", f"invites:declined:document:{doc_id}", invite_id)


class RedisMD(ABCMetadata):
    """
    Redis backend to deal with the metadata associated to documents
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
        if app.testing:
            from fakeredis import FakeStrictRedis

            client = FlaskRedis.from_custom_provider(FakeStrictRedis)
        else:
            client = FlaskRedis()
        client.init_app(app)
        self.client = RedisStorageBackend(client)

    def add(
        self,
        key: uuid.UUID,
        document: Dict[str, Any],
        owner: Dict[str, str],
        invites: List[Dict[str, str]],
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
        :param owner: Name and email address of the user that has uploaded the document.
        :param invites: List of the names and emails of the users that have been invited to sign the document.
        :param sendsigned: Whether to send by email the final signed document to all who signed it.
        :param loa: The "authentication for signature" required LoA.
        :return: The list of invitations as dicts with 3 keys: name, email, and generated key (UUID)
        """
        self.client.pipeline()
        owner_id = self.client.query_user_id(owner['email'])
        if owner_id is None:
            self.logger.info(f"Adding new (owning) user: {owner['name']}, {owner['email']}")
            owner_id = self.client.insert_user(owner['name'], owner['email'])

        if owner_id is None:  # This should never happen, it's just to please mypy
            self.client.abort()
            return

        document_id = self.client.insert_document(
            str(key),
            document['name'],
            document['size'],
            document['type'],
            owner_id,
            document.get('prev_signatures', ''),
            sendsigned,
            loa,
        )

        if document_id is None:  # This should never happen, it's just to please mypy
            self.client.abort()
            return

        updated_invites = []

        for user in invites:
            user_id = self.client.query_user_id(user['email'])
            if user_id is None:
                user_id = self.client.insert_user(user['name'], user['email'])

            if user_id is None:  # This should never happen, it's just to please mypy
                continue

            invite_key = str(uuid.uuid4())
            self.client.insert_invite(invite_key, document_id, user_id, owner_id)

            updated_invite = {'key': invite_key}
            updated_invite.update(user)
            updated_invite['id'] = user_id
            updated_invites.append(updated_invite)

        self.client.commit()
        return updated_invites

    def get_old(self, days: int) -> List[uuid.UUID]:
        """
        Get the keys identifying stored documents that are older than the provided number of days.

        :param days: max number of days a document is kept in the db.
        :return: A list of UUIDs identifying the documents
        """
        return self.client.query_documents_old(days)

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
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
        """
        invites = self.client.query_invites_from_email(email)
        if invites is None or isinstance(invites, dict):
            return []

        pending = []
        for invite in invites:
            doc_id = invite['doc_id']
            document = self.client.query_document(doc_id)
            if document is None or isinstance(document, list):
                self.logger.error(
                    f"Db seems corrupted, an invite for {email}" f" references a non existing document with id {doc_id}"
                )
                continue

            owner = document['owner']
            email_result = self.client.query_user(owner)
            if email_result is None:
                self.logger.error(f"Db seems corrupted, a document references a non existing owner {owner}")
                continue

            document['owner'] = email_result
            document['invite_key'] = invite['key']
            document['pending'] = []
            document['signed'] = []
            document['declined'] = []
            document['state'] = "unconfirmed"

            subinvites = self.client.query_invites_from_doc(doc_id)

            if subinvites is not None and not isinstance(subinvites, dict):
                for subinvite in subinvites:
                    user_id = subinvite['user_id']
                    subemail_result = self.client.query_user(user_id)
                    if subemail_result is None or isinstance(subemail_result, list):
                        self.logger.error(
                            f"Db seems corrupted, a subinvite for {doc_id}"
                            f" references a non existing user with id {user_id}"
                        )
                        continue
                    if subemail_result['email'] == email:
                        continue
                    if subinvite['signed'] == 1:
                        document['signed'].append(subemail_result)
                    elif subinvite['declined'] == 1:
                        document['declined'].append(subemail_result)
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
        self.client.pipeline()
        user_id = self.client.query_user_id(email)
        if user_id is None:
            self.logger.error(f"Trying to update a document with the signature of non-existing {email}")
            self.client.abort()
            return

        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to update a non-existing document with the signature of {email}")
            self.client.abort()
            return

        self.logger.info(f"Removing invite for {email} to sign {key}")
        self.client.update_invite(user_id, document_id)

        self.client.update_document(str(key), datetime.now().timestamp())
        self.client.commit()

    def decline(self, key: uuid.UUID, email: str):
        """
        Update the metadata of a document which an invited user has declined to sign.

        :param key: The key identifying the document in the `storage`.
        :param email: email address of the user that has just signed the document.
        """
        self.client.pipeline()
        user_id = self.client.query_user_id(email)
        if user_id is None:
            self.logger.error(f"Trying to decline a document by non-existing {email}")
            self.client.abort()
            return

        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to decline a non-existing document by {email}")
            self.client.abort()
            return

        self.logger.info(f"Declining invite for {email} to sign {key}")
        self.client.decline_invite(user_id, document_id)

        self.client.update_document(str(key), datetime.now().timestamp())
        self.client.commit()

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
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
        """
        documents = self.client.query_documents_from_owner(email)
        if documents is None or isinstance(documents, dict):
            return []

        for document in documents:
            document['key'] = document['key']
            document['pending'] = []
            document['signed'] = []
            document['declined'] = []
            state = 'loaded'
            document_id = document['doc_id']
            invites = self.client.query_invites_from_doc(document_id)
            del document['doc_id']
            if invites is None or isinstance(invites, dict):
                document['state'] = state
                continue
            for invite in invites:
                user_id = invite['user_id']
                email_result = self.client.query_user(user_id)
                if email_result is None:
                    self.logger.error(
                        f"Db seems corrupted, an invite for {document_id}"
                        f" references a non existing user with id {user_id}"
                    )
                    continue
                if invite['signed'] == 1:
                    document['signed'].append(email_result)
                elif invite['declined'] == 1:
                    document['declined'].append(email_result)
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

        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to remind invitees to sign non-existing document with key {key}")
            return invitees

        invites = self.client.query_invites_from_doc(document_id)
        if invites is None or isinstance(invites, dict):
            self.logger.error(f"Trying to remind non-existing invitees to sign document with key {key}")
            return invitees

        for invite in invites:
            user_id = invite['user_id']
            email_result = self.client.query_user(user_id)
            if email_result is None or isinstance(email_result, list):
                self.logger.error(
                    f"Db seems corrupted, an invite for document {key}"
                    f" references a non existing user with id {user_id}"
                )
                continue

            email_result['signed'] = bool(invite['signed'])
            email_result['declined'] = bool(invite['signed'])
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
        self.client.pipeline()
        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to delete a non-existing document with key {key}")
            self.client.abort()
            return False

        invites = self.client.query_unsigned_invites_from_doc(document_id)

        if not force:
            if invites is None or isinstance(invites, dict):  # This should never happen, it's just to please mypy
                pass
            elif len(invites) != 0:
                self.logger.error(f"Refusing to remove document {key} with pending emails")
                self.client.abort()
                return False

        else:
            self.client.delete_invites_all(document_id)

        self.client.delete_document(str(key))

        self.client.commit()
        return True

    def get_invitation(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get the invited user's name and email and the data on the document she's been invited to sign

        :param key: The key identifying the signing invitation
        :return: A dict with data on the user and the document
        """
        invite = self.client.query_invite_from_key(str(key))
        if invite is None or isinstance(invite, list):
            self.logger.error(f"Retrieving a non-existing invite with key {key}")
            return {}

        doc = self.client.query_document(invite['doc_id'])
        if doc is None or isinstance(doc, list):
            self.logger.error(f"Retrieving a non-existing document with key {key}")
            return {}

        doc['doc_id'] = invite['doc_id']
        user = self.client.query_user(invite['user_id'])
        if not user:
            self.logger.error(f"Retrieving a non-existing user with id {invite['user_id']}")
            return {}

        return {'document': doc, 'user': user}

    def add_invitation(self, document_key: uuid.UUID, name: str, email: str) -> Dict[str, Any]:
        """
        Create a new invitation to sign

        :param document_key: The key identifying the document to sign
        :param name: The name for the new invitation
        :param email: The email for the new invitation
        :return: data on the new invitation
        """
        self.client.pipeline()
        user_id = self.client.query_user_id(email)
        if user_id is None:
            self.logger.info(f"Adding new user: {name}, {email}")
            user_id = self.client.insert_user(name, email)

        if user_id is None:  # This should never happen, it's just to please mypy
            self.client.abort()
            return {}

        document_id = self.client.query_document_id(str(document_key))
        if document_id is None:
            self.logger.error(f"Trying to find a non-existing document with key {document_key}")
            self.client.abort()
            return {}

        document = self.client.query_document(document_id)
        if document is None or isinstance(document, list):
            self.logger.error(
                f"Db seems corrupted, {document_key} references a non existing document with id {document_id}"
            )
            self.client.abort()
            return {}

        owner_id = document['owner']

        invite_key = str(uuid.uuid4())
        self.client.insert_invite(invite_key, document_id, user_id, owner_id)

        self.client.commit()

        return {'key': invite_key, 'name': name, 'email': email, 'id': user_id}

    def rm_invitation(self, invite_key: uuid.UUID, document_key: uuid.UUID) -> bool:
        """
        Remove an invitation to sign

        :param invite_key: The key identifying the signing invitation to remove
        :param document_key: The key identifying the signing invitation to remove
        :return: success
        """
        # XXX this belongs in the client class
        self.client.pipeline()
        invite_id = self.client.query_invite_id(invite_key)
        owner_id = int(self.client.redis.hget(f"invite:{invite_id}", 'owner_id'))
        user_id = int(self.client.redis.hget(f"invite:{invite_id}", 'user_id'))
        doc_id = self.client.query_document_id(str(document_key))
        self.client.transaction.delete(f"invite:{invite_id}")
        self.client.transaction.srem(f"invites:unsigned:owner:{owner_id}", invite_id)
        self.client.transaction.delete(f"invites:unsigned:document:{doc_id}")
        self.client.transaction.srem(f"invites:unsigned:invited:{user_id}", invite_id)
        self.client.transaction.srem(f"invites:signed:owner:{owner_id}", invite_id)
        self.client.transaction.delete(f"invites:signed:document:{doc_id}")
        self.client.transaction.srem(f"invites:signed:invited:{user_id}", invite_id)
        self.client.transaction.srem(f"invites:declined:owner:{owner_id}", invite_id)
        self.client.transaction.delete(f"invites:declined:document:{doc_id}")
        self.client.transaction.srem(f"invites:declined:invited:{user_id}", invite_id)

        self.client.commit()
        return True

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
        document_result = self.client.query_document_all(key)
        if document_result is None:
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
        self.client.pipeline()
        lock_info = self.client.query_document_lock(doc_id)
        self.logger.debug(f"Checking lock for {locked_by} in document with id {doc_id}: {lock_info}")
        if lock_info is None:
            self.logger.error(f"Trying to lock a non-existing document with id {doc_id}")
            self.client.abort()
            return False

        user_id = self.client.query_user_id(locked_by)
        if user_id is None:
            self.logger.error(f"Trying to lock a document for non-existing {locked_by}")
            self.client.abort()
            return False

        now = datetime.now()

        locked = None if lock_info['locked'] is None else lock_info['locked']

        now_ts = now.timestamp()

        if (
            locked is None
            or (now - locked) > current_app.config['DOC_LOCK_TIMEOUT']
            or lock_info['locked_by'] == user_id
        ):
            self.logger.debug(f"Adding lock for {locked_by} in document with id {doc_id}: {lock_info}")
            self.client.add_document_lock(doc_id, now_ts, user_id)
            self.client.commit()
            return True

        self.client.abort()
        return False

    def rm_lock(self, doc_id: int, unlocked_by: str) -> bool:
        """
        Remove lock from document. If the document is not locked, do nothing.
        The user unlocking must be that same user that locked it.

        :param doc_id: the pk for the document in the documents table
        :param unlocked_by: Email of the user unlocking the document
        :return: Whether the document has been unlocked.
        """
        self.client.pipeline()
        lock_info = self.client.query_document_lock(doc_id)
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to unlock a non-existing document with id {doc_id}")
            self.client.abort()
            return False

        if lock_info['locked'] is None:
            self.client.abort()
            return True

        user_id = self.client.query_user_id(unlocked_by)
        if user_id is None:
            self.logger.error(f"Trying to unlock a document for non-existing {unlocked_by}")
            self.client.abort()
            return False

        now = datetime.now()
        user_result = self.client.query_user(user_id)
        if not user_result:
            self.logger.error(f"The user record with mail {unlocked_by} seems corrupted")
            self.client.abort()
            return False

        if isinstance(lock_info['locked'], str):
            locked = datetime.fromisoformat(lock_info['locked'])
        else:
            locked = lock_info['locked']

        if (now - locked) < current_app.config['DOC_LOCK_TIMEOUT'] and lock_info['locked_by'] == user_result['user_id']:
            self.client.rm_document_lock(doc_id)
            self.client.commit()
            return True

        self.client.abort()
        return False

    def check_lock(self, doc_id: int, locked_by: str) -> bool:
        """
        Check whether the document identified by doc_id is locked.
        This will remove stale locks (older than the configured timeout).

        :param doc_id: the pk for the document in the documents table
        :param locked_by: Email of the user locking the document
        :return: Whether the document is locked by the user with `locked_by` email
        """
        lock_info = self.client.query_document_lock(doc_id)
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
            self.client.pipeline()
            self.client.rm_document_lock(doc_id)
            self.client.commit()
            return False

        user_id = lock_info['locked_by']
        if user_id is None:
            self.logger.error(f"Trying to check with a non-existing user with id {lock_info['locked_by']}")
            return False

        self.logger.debug(f"Checking lock for {doc_id} by {user_id} for {locked_by}")
        locker_id = self.client.query_user_id(locked_by)
        return locker_id == user_id

    def get_sendsigned(self, key: uuid.UUID) -> bool:
        """
        Whether the final signed document should be sent by email to signataries

        :param key: The key identifying the document
        :return: whether to send emails
        """
        return self.client.query_sendsigned(key)

    def get_loa(self, key: uuid.UUID) -> str:
        """
        Required LoA for signature authn context

        :param key: The key identifying the document
        :return: LoA
        """
        return self.client.query_loa(key)
