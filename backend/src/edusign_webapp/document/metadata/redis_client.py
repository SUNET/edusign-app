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
from redis.exceptions import ResponseError

from edusign_webapp.doc_store import ABCMetadata


class RedisStorageBackend:
    def __init__(self, redis_client):
        self.redis = redis_client
        self._transaction = None

    def pipeline(self):
        self._transaction = self.redis.pipeline()

    def commit(self):
        assert self._transaction is not None
        self._transaction.execute()
        self._transaction = None

    def abort(self):
        assert self._transaction is not None
        self._transaction.reset()
        self._transaction = None

    @property
    def transaction(self):
        assert self._transaction is not None
        return self._transaction

    def insert_document(
        self,
        key,
        name,
        size,
        type,
        owner_email,
        owner_name,
        owner_lang,
        owner_eppn,
        prev_signatures,
        sendsigned,
        loa,
        skipfinal,
        ordered,
        invitation_text,
    ):
        doc_id = self.redis.incr('doc-counter')
        now = datetime.now().timestamp()
        mapping = dict(
            key=key,
            name=name,
            size=size,
            type=type,
            owner_email=owner_email,
            owner_name=owner_name,
            owner_lang=owner_lang,
            owner_eppn=owner_eppn,
            created=now,
            updated=now,
            prev_signatures=prev_signatures,
            sendsigned=int(sendsigned),
            loa=loa,
            skipfinal=int(skipfinal),
            ordered_invitations=int(ordered),
            invitation_text=invitation_text,
        )
        self.transaction.hset(f"doc:{doc_id}", mapping=mapping)
        self.transaction.set(f"doc:key:{key}", doc_id)
        self.transaction.zadd("doc:created", {key: now})
        self.transaction.sadd(f"doc:email:{owner_email}", doc_id)
        self.transaction.sadd(f"doc:eppn:{owner_eppn}", doc_id)
        current_app.logger.debug(f"Added new document {name} with key{key}")
        return doc_id

    def insert_document_raw(
        self,
        key,
        name,
        size,
        type,
        created,
        updated,
        owner_email,
        owner_name,
        owner_lang,
        owner_eppn,
        prev_signatures,
        sendsigned,
        loa,
        skipfinal,
        ordered,
        invitation_text,
    ):
        mapping = dict(
            key=key,
            name=name,
            size=size,
            type=type,
            owner_email=owner_email,
            owner_name=owner_name,
            owner_lang=owner_lang,
            owner_eppn=owner_eppn,
            created=created,
            updated=updated,
            prev_signatures=prev_signatures,
            sendsigned=int(sendsigned),
            loa=loa,
            skipfinal=int(skipfinal),
            ordered_invitations=int(ordered),
            invitation_text=invitation_text,
        )
        doc_id = self.redis.incr('doc-counter')
        self.transaction.hset(f"doc:{doc_id}", mapping=mapping)
        self.transaction.set(f"doc:key:{key}", doc_id)
        self.transaction.zadd("doc:created", {key: created})
        self.transaction.sadd(f"doc:email:{owner_email}", doc_id)
        self.transaction.sadd(f"doc:eppn:{owner_eppn}", doc_id)
        current_app.logger.debug(f"Added raw document {name} with key{key}")
        return int(doc_id)

    def add_document_lock(self, doc_id, locked, locking_email):
        self.transaction.hset(f"doc:{doc_id}", mapping=dict(locked=locked, locking_email=locking_email))
        current_app.logger.debug(f"Added lock to document with id {doc_id} for {locking_email}")

    def rm_document_lock(self, doc_id):
        self.transaction.hdel(f"doc:{doc_id}", 'locked')
        self.transaction.hdel(f"doc:{doc_id}", 'locking_email')
        current_app.logger.debug(f"Removed lock from document with id {doc_id}")

    def delete_document(self, key):
        doc_id = int(self.redis.get(f"doc:key:{key}"))
        document = self.query_document(doc_id)
        email = document['owner_email']
        eppn = document['owner_eppn']
        self.transaction.delete(f"doc:{doc_id}")
        self.transaction.delete(f"doc:key:{key}")
        self.transaction.zrem("doc:created", key)
        self.transaction.srem(f"doc:email:{email}", doc_id)
        self.transaction.srem(f"doc:eppn:{eppn}", doc_id)
        current_app.logger.debug(f"Removed document {document}")

    def update_document(self, key, updated):
        doc_id = int(self.redis.get(f"doc:key:{key}"))
        self.transaction.hset(f"doc:{doc_id}", mapping=dict(updated=updated))
        current_app.logger.debug(f"Updated document with key {key} to {updated}")

    def query_document_id(self, key):
        doc_id = self.redis.get(f"doc:key:{key}")
        if doc_id is not None:
            return int(doc_id)

    def query_document_full(self, key):
        doc_id = self.query_document_id(key)
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        created = datetime.fromtimestamp(float(b_doc[b'created']))
        updated = datetime.fromtimestamp(float(b_doc[b'updated']))

        doc = dict(
            doc_id=doc_id,
            key=key,
            name=b_doc[b'name'].decode('utf8'),
            size=int(b_doc[b'size']),
            type=b_doc[b'type'].decode('utf8'),
            owner_email=b_doc[b'owner_email'].decode('utf8'),
            owner_name=b_doc[b'owner_name'].decode('utf8'),
            owner_lang=b_doc[b'owner_lang'].decode('utf8'),
            owner_eppn=b_doc[b'owner_eppn'].decode('utf8'),
            prev_signatures=b_doc[b'prev_signatures'].decode('utf8'),
            sendsigned=bool(b_doc[b'sendsigned']),
            loa=b_doc[b'loa'].decode('utf8'),
            updated=updated,
            created=created,
            skipfinal=bool(b_doc[b'skipfinal']),
            ordered_invitations=bool(b_doc[b'ordered_invitations']),
            invitation_text=b_doc[b'invitation_text'].decode('utf8'),
        )
        return doc

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
            owner_email=b_doc[b'owner_email'].decode('utf8'),
            owner_name=b_doc[b'owner_name'].decode('utf8'),
            owner_lang=b_doc[b'owner_lang'].decode('utf8'),
        )
        return doc

    def query_document_lock(self, doc_id):
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        doc = dict(
            locked=(
                None
                if b'locked' not in b_doc or b_doc[b'locked'] is None
                else datetime.fromtimestamp(float(b_doc[b'locked']))
            ),
            locking_email=(
                None
                if b'locking_email' not in b_doc or b_doc[b'locking_email'] is None
                else b_doc[b'locking_email'].decode('utf8')
            ),
        )
        return doc

    def query_document(self, doc_id):
        b_doc = self.redis.hgetall(f"doc:{doc_id}")

        created = datetime.fromtimestamp(float(b_doc[b'created']))

        doc = dict(
            key=uuid.UUID(b_doc[b'key'].decode('utf8')),
            name=b_doc[b'name'].decode('utf8'),
            size=int(b_doc[b'size']),
            type=b_doc[b'type'].decode('utf8'),
            owner_email=b_doc[b'owner_email'].decode('utf8'),
            owner_name=b_doc[b'owner_name'].decode('utf8'),
            owner_lang=b_doc[b'owner_lang'].decode('utf8'),
            owner_eppn=b_doc[b'owner_eppn'].decode('utf8'),
            prev_signatures=b_doc[b'prev_signatures'].decode('utf8'),
            loa=b_doc[b'loa'].decode('utf8'),
            created=created,
            ordered=int(b_doc[b'ordered_invitations']),
        )
        return doc

    def query_documents_old(self, days):
        now = datetime.now()
        delta = timedelta(days=days)
        then = now - delta
        ts = then.timestamp()
        try:
            keys = self.redis.zrange("doc:created", 0, ts)
            return [uuid.UUID(b_doc[b'key'].decode('utf8')) for b_doc in keys]
        except ResponseError:
            return []

    def query_documents_from_owner(self, eppn):
        docs = []
        doc_ids = self.redis.smembers(f'doc:eppn:{eppn}')
        for b_doc_id in doc_ids:
            doc_id = int(b_doc_id)
            b_doc = self.redis.hgetall(f"doc:{doc_id}")

            created = datetime.fromtimestamp(float(b_doc[b'created']))

            doc = dict(
                doc_id=doc_id,
                key=uuid.UUID(b_doc[b'key'].decode('utf8')),
                name=b_doc[b'name'].decode('utf8'),
                size=int(b_doc[b'size']),
                type=b_doc[b'type'].decode('utf8'),
                prev_signatures=b_doc[b'prev_signatures'].decode('utf8'),
                loa=b_doc[b'loa'].decode('utf8'),
                created=created,
                skipfinal=bool(b_doc[b'skipfinal']),
                ordered=bool(b_doc[b'ordered_invitations']),
                sendsigned=bool(b_doc[b'sendsigned']),
            )
            docs.append(doc)
        return docs

    def query_documents_from_owner_by_email(self, email):
        docs = []
        doc_ids = self.redis.smembers(f'doc:email:{email}')
        for b_doc_id in doc_ids:
            doc_id = int(b_doc_id)
            b_doc = self.redis.hgetall(f"doc:{doc_id}")

            created = datetime.fromtimestamp(float(b_doc[b'created']))

            doc = dict(
                doc_id=doc_id,
                key=uuid.UUID(b_doc[b'key'].decode('utf8')),
                name=b_doc[b'name'].decode('utf8'),
                size=int(b_doc[b'size']),
                type=b_doc[b'type'].decode('utf8'),
                prev_signatures=b_doc[b'prev_signatures'].decode('utf8'),
                loa=b_doc[b'loa'].decode('utf8'),
                created=created,
                skipfinal=bool(b_doc[b'skipfinal']),
                ordered=bool(b_doc[b'ordered_invitations']),
                sendsigned=bool(b_doc[b'sendsigned']),
            )
            docs.append(doc)
        return docs

    def query_sendsigned(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return True
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        return bool(b_doc[b'sendsigned'])

    def set_sendsigned(self, key, value):
        doc_id = int(self.redis.get(f"doc:key:{key}"))
        self.transaction.hset(f"doc:{doc_id}", mapping=dict(sendsigned=int(value)))
        current_app.logger.debug(f"Set sendsigned in document with key {key} to {value}")

    def query_skipfinal(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return True
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        return bool(b_doc[b'skipfinal'])

    def set_skipfinal(self, key, value):
        doc_id = int(self.redis.get(f"doc:key:{key}"))
        self.transaction.hset(f"doc:{doc_id}", mapping=dict(skipfinal=int(value)))
        current_app.logger.debug(f"Set skipfinal in document with key {key} to {value}")

    def query_loa(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return "low"
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        loa = b_doc.get(b"loa", b"low")
        return loa.decode('utf8')

    def query_ordered(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return False
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        return bool(b_doc[b'ordered_invitations'])

    def query_invitation_text(self, key):
        doc_id = self.query_document_id(str(key))
        if doc_id is None:
            return ""
        b_doc = self.redis.hgetall(f"doc:{doc_id}")
        text = b_doc.get(b"invitation_text", b"")
        return text.decode('utf8')

    def insert_invite(self, key, doc_id, user_email, user_name, user_lang, order):
        invite_id = self.redis.incr('invite-counter')
        mapping = dict(
            key=key,
            doc_id=doc_id,
            user_name=user_name,
            user_email=user_email,
            user_lang=user_lang,
            signed=0,
            declined=0,
            order_invitation=int(order),
        )
        self.transaction.hset(f"invite:{invite_id}", mapping=mapping)
        self.transaction.set(f"invite:key:{key}", invite_id)
        self.transaction.sadd(f"invites:unsigned:document:{doc_id}", invite_id)
        self.transaction.sadd(f"invites:unsigned:email:{user_email}", invite_id)
        current_app.logger.debug(f"Added invite for document with id {doc_id} for {user_name} <{user_email}>")
        return invite_id

    def insert_invite_raw(self, key, doc_id, user_email, user_name, user_lang, signed, declined, order):
        invite_id = self.redis.incr('invite-counter')
        mapping = dict(
            key=key,
            doc_id=doc_id,
            user_name=user_name,
            user_lang=user_lang,
            user_email=user_email,
            signed=signed,
            declined=declined,
            order_invitation=int(order),
        )
        self.transaction.hset(f"invite:{invite_id}", mapping=mapping)
        self.transaction.set(f"invite:key:{key}", invite_id)
        subkey = 'unsigned'
        if signed:
            subkey = 'signed'
        elif declined:
            subkey = 'declined'
        self.transaction.sadd(f"invites:{subkey}:document:{doc_id}", invite_id)
        self.transaction.sadd(f"invites:{subkey}:email:{user_email}", invite_id)
        current_app.logger.debug(f"Added raw invite for document with id {doc_id} for {user_name} <{user_email}>")
        return invite_id

    def delete_invites_all(self, doc_id):
        invite_ids = self.redis.sunion(f"invites:unsigned:document:{doc_id}", f"invites:signed:document:{doc_id}")
        emails = []
        for b_invite_id in invite_ids:
            invite_id = int(b_invite_id)
            email = self.redis.hget(f"invite:{invite_id}", 'user_email').decode('utf8')
            key = self.redis.hget(f"invite:{invite_id}", 'key').decode('utf8')
            self.transaction.delete(f"invite:{invite_id}")
            self.transaction.delete(f"invite:key:{key}")
            self.transaction.delete(f"invites:unsigned:document:{doc_id}")
            self.transaction.delete(f"invites:signed:document:{doc_id}")
            self.transaction.delete(f"invites:declined:document:{doc_id}")
            self.transaction.srem(f"invites:unsigned:email:{email}", invite_id)
            self.transaction.srem(f"invites:signed:email:{email}", invite_id)
            self.transaction.srem(f"invites:declined:email:{email}", invite_id)
            emails.append(email)

        current_app.logger.debug(f"Removed all invites for document with id {doc_id}: {emails}")

    def remove_invite(self, doc_id, invite_id, invite_key, email):
        self.transaction.delete(f"invite:{invite_id}")
        self.transaction.delete(f"invite:key:{invite_key}")
        self.transaction.srem(f"invites:unsigned:document:{doc_id}", invite_id)
        self.transaction.srem(f"invites:unsigned:email:{email}", invite_id)
        self.transaction.srem(f"invites:signed:document:{doc_id}", invite_id)
        self.transaction.srem(f"invites:signed:email:{email}", invite_id)
        self.transaction.srem(f"invites:declined:document:{doc_id}", invite_id)
        self.transaction.srem(f"invites:declined:email:{email}", invite_id)
        current_app.logger.debug(f"Removed invite {invite_id} on document {doc_id} for {email}")

    def update_invite(self, emails, doc_id):
        invite_ids = set()
        actual_email = ''
        for email in emails:
            invite_ids = invite_ids.union(
                self.redis.sinter(f"invites:unsigned:document:{doc_id}", f"invites:unsigned:email:{email}")
            )
            if len(invite_ids) == 1:
                actual_email = email
                break
        assert len(invite_ids) == 1
        invite_id = int(list(invite_ids)[0])
        self.transaction.hset(f"invite:{invite_id}", mapping={'signed': 1})
        self.transaction.smove(
            f"invites:unsigned:email:{actual_email}", f"invites:signed:email:{actual_email}", invite_id
        )
        self.transaction.smove(f"invites:unsigned:document:{doc_id}", f"invites:signed:document:{doc_id}", invite_id)
        current_app.logger.debug(f"Updated invite for document with id {doc_id} for {actual_email}")

    def decline_invite(self, emails, doc_id):
        invite_ids = set()
        actual_email = ''
        for email in emails:
            invite_ids = invite_ids.union(
                self.redis.sinter(f"invites:unsigned:document:{doc_id}", f"invites:unsigned:email:{email}")
            )
            if len(invite_ids) == 1:
                actual_email = email
                break
        assert len(invite_ids) == 1
        invite_id = int(list(invite_ids)[0])
        self.transaction.hset(f"invite:{invite_id}", mapping={'declined': 1})
        self.transaction.smove(
            f"invites:unsigned:email:{actual_email}", f"invites:declined:email:{actual_email}", invite_id
        )
        self.transaction.smove(f"invites:unsigned:document:{doc_id}", f"invites:declined:document:{doc_id}", invite_id)
        current_app.logger.debug(f"Declined invite for document with id {doc_id} for {actual_email}")

    def query_invites_from_email(self, email):
        invites = []
        invite_ids = self.redis.smembers(f'invites:unsigned:email:{email}')
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
                    'key': b_invite[b'key'].decode('utf8'),
                    'signed': int(b_invite[b'signed']),
                    'declined': int(b_invite[b'declined']),
                    'user_name': b_invite[b'user_name'].decode('utf8'),
                    'user_email': b_invite[b'user_email'].decode('utf8'),
                    'user_lang': b_invite[b'user_lang'].decode('utf8'),
                    'order': int(b_invite[b'order_invitation']),
                }
            )
        return invites

    def query_unsigned_invites_from_doc(self, doc_id):
        """"""
        invite_ids = self.redis.smembers(f'invites:unsigned:document:{doc_id}')
        invites = [int(invite_id) for invite_id in invite_ids]
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
                doc_id=int(b_invite[b'doc_id']),
                user_name=b_invite[b'user_name'].decode('utf8'),
                user_email=b_invite[b'user_email'].decode('utf8'),
                user_lang=b_invite[b'user_lang'].decode('utf8'),
            )
            return invite


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
        skipfinal: bool,
        ordered: bool,
        invitation_text: str,
    ):
        """
        Store metadata for a new document.

        :param key: The uuid that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + size: Size of the doc
                         + type: Content type of the doc
                         + prev_signatures: previous signatures
        :param owner: Name and email address and language and eppn of the user that has uploaded the document.
        :param invites: List of the names and emails and languages of the users that have been invited to sign the document.
        :param sendsigned: Whether to send by email the final signed document to all who signed it.
        :param loa: The "authentication for signature" required LoA.
        :param skipfinal: Whether to request signature from the user who is inviting.
        :param ordered: Whether to send invitations in order.
        :param invitation_text: The custom text to send in the invitation email
        :return: The list of invitations as dicts with 5 keys: name, email, lang, order, and generated key (UUID)
        """
        self.client.pipeline()

        document_id = self.client.insert_document(
            str(key),
            document['name'],
            document['size'],
            document['type'],
            owner['email'],
            owner['name'],
            owner['lang'],
            owner['eppn'],
            document.get('prev_signatures', ''),
            sendsigned,
            loa,
            skipfinal,
            ordered,
            invitation_text,
        )

        if document_id is None:  # This should never happen, it's just to please mypy
            self.client.abort()
            return

        updated_invites = []

        for order, user in enumerate(invites):
            invite_key = str(uuid.uuid4())
            self.client.insert_invite(invite_key, document_id, user['email'], user['name'], user['lang'], order)

            updated_invite = {'key': invite_key, 'order': order}
            updated_invite.update(user)
            updated_invites.append(updated_invite)

        self.client.commit()
        return updated_invites

    def add_document_raw(
        self,
        document: Dict[str, str],
    ) -> int:
        """
        Store metadata for a new document.

        :param document: Content and metadata of the document. Dictionary containing keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + owner_email: Email of owner
                 + owner_name: Display name of owner
                 + owner_lang: Language of owner
                 + owner_eppn: eppn of owner
                 + loa: required loa
                 + sendsigned: whether to send the signed document by mail
                 + skipfinal: whether to send the signed document by mail
                 + prev_signatures: previous signatures
                 + updated: modification timestamp
                 + created: creation timestamp
                 + ordered: Whether to send invitations in order.
                 + invitation_text: The custom text to send in the invitation email
        :return: new document id
        """
        self.client.pipeline()

        doc_id = self.client.insert_document_raw(
            str(document['key']),
            document['name'],
            document['size'],
            document['type'],
            float(datetime.fromisoformat(document['created']).timestamp()),
            float(datetime.fromisoformat(document['updated']).timestamp()),
            document['owner_email'],
            document['owner_name'],
            document['owner_lang'],
            document['owner_eppn'],
            document['prev_signatures'],
            int(document['sendsigned']),
            document['loa'],
            int(document['skipfinal']),
            int(document['ordered_invitations']),
            document['invitation_text'],
        )
        self.client.commit()
        return doc_id

    def add_invite_raw(self, invite: Dict[str, Any]):
        """
        Add invitation.

        :param invite: invitation data, with keys:
                 + user_name: The name of the user
                 + user_email: The email of the user
                 + user_lang: The language of the user
                 + signed: Whether the user has already signed the document
                 + declined: Whether the user has declined signing the document
                 + key: the key identifying the invite
                 + doc_id: the id of the document.
                 + order: the order of the invitation.
        :return:
        """
        self.client.pipeline()

        self.client.insert_invite_raw(
            invite['key'],
            int(invite['doc_id']),
            invite['email'],
            invite['name'],
            invite['lang'],
            int(invite['signed']),
            int(invite['declined']),
            int(invite['order_invitation']),
        )
        self.client.commit()

    def get_old(self, days: int) -> List[uuid.UUID]:
        """
        Get the keys identifying stored documents that are older than the provided number of days.

        :param days: max number of days a document is kept in the db.
        :return: A list of UUIDs identifying the documents
        """
        return self.client.query_documents_old(days)

    def get_pending(self, emails: List[str]) -> List[Dict[str, Any]]:
        """
        Given the email address of some user, return information about the documents
        she has been invited to sign, and has not yet signed.

        :param emails: The emails of the user
        :return: A list of dictionaries with information about the documents pending to be signed,
                 each of them with keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + size: Size of the doc
                 + type: Content type of the doc
                 + owner: Dict with name, email, eppn and language of the user requesting the signature
                 + state: the state of the invitation
                 + pending: List of emails of the users invited to sign the document who have not yet done so.
                 + signed: List of emails of the users invited to sign the document who have already done so.
                 + declined: List of emails of the users invited to sign the document who have declined to do so.
                 + prev_signatures: previous signatures
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
                 + ordered: Whether to send invitations in order.
        """
        pending = []
        doc_ids = []
        for email in emails:
            invites = self.client.query_invites_from_email(email)
            if invites is None or isinstance(invites, dict):
                return []

            for invite in invites:
                doc_id = invite['doc_id']
                document = self.client.query_document(doc_id)
                if document is None or isinstance(document, list):
                    self.logger.error(
                        f"Db seems corrupted, an invite for {email}"
                        f" references a non existing document with id {doc_id}"
                    )
                    continue

                if doc_id in doc_ids:
                    self.rm_invitation(uuid.UUID(str(invite['key'])), uuid.UUID(str(document['key'])))
                    continue
                else:
                    doc_ids.append(doc_id)

                document['owner'] = {
                    'email': document['owner_email'],
                    'name': document['owner_name'],
                    'lang': document['owner_lang'],
                    'eppn': document['owner_eppn'],
                }
                document['invite_key'] = invite['key']
                document['pending'] = []
                document['signed'] = []
                document['declined'] = []
                document['state'] = "unconfirmed"

                subinvites = self.client.query_invites_from_doc(doc_id)

                if subinvites is not None and not isinstance(subinvites, dict):
                    if document["ordered"]:
                        subinvites.sort(key=lambda i: i["order"])
                        is_next = False
                        for subinvite in subinvites:
                            if not subinvite['signed'] and not subinvite['declined']:
                                if subinvite['user_email'] == email:
                                    is_next = True
                                break
                        if not is_next:
                            continue
                    for subinvite in subinvites:
                        subemail_result = {
                            'email': subinvite['user_email'],
                            'name': subinvite['user_name'],
                            'lang': subinvite['user_lang'],
                            'order': subinvite['order'],
                        }
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

    def update(self, key: uuid.UUID, emails: List[str]):
        """
        Update the metadata of a document to which a new signature has been added.
        This is, remove corresponding entry in the Invites table.

        :param key: The key identifying the document in the `storage`.
        :param emails: email addresses of the user that has just signed the document.
        """
        self.client.pipeline()

        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to update a non-existing document with the signature of {emails}")
            self.client.abort()
            return

        self.logger.info(f"Updating invite for {emails} to sign {key}")
        self.client.update_invite(emails, document_id)

        self.client.update_document(str(key), datetime.now().timestamp())
        self.client.commit()

    def decline(self, key: uuid.UUID, emails: List[str]):
        """
        Update the metadata of a document which an invited user has declined to sign.

        :param key: The key identifying the document in the `storage`.
        :param emails: email addresses of the user that has just signed the document.
        """
        self.client.pipeline()

        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to decline a non-existing document by {emails}")
            self.client.abort()
            return

        self.logger.info(f"Declining invite for {emails} to sign {key}")
        self.client.decline_invite(emails, document_id)

        self.client.update_document(str(key), datetime.now().timestamp())
        self.client.commit()

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
                 + skipfinal: whether to skip the final signature by the inviter user
                 + ordered: Whether to send invitations in order.
                 + sendsigned: Whether to send signed documents in final email
        """
        documents = self.client.query_documents_from_owner(eppn)
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
                 + pending: List of emails, names and languages of the users invited to sign the document who have not yet done so.
                 + signed: List of emails, names and languages of the users invited to sign the document who have already done so.
                 + declined: List of emails, names and languages of the users invited to sign the document who have declined to do so.
                 + prev_signatures: previous signatures
                 + loa: required LoA for the signature
                 + created: creation timestamp for the invitation
                 + skipfinal: whether to skip the final signature by the inviter user
                 + ordered: Whether to send invitations in order.
                 + sendsigned: Whether to send signed documents in final email
        """
        documents = self.client.query_documents_from_owner_by_email(email)
        if documents is None or isinstance(documents, dict):
            return []

        return self._get_owned(documents)

    def _get_owned(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
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
                email_result = {'email': invite['user_email'], 'name': invite['user_name'], 'lang': invite['user_lang']}
                if invite['signed'] == 1:
                    document['signed'].append(email_result)
                elif invite['declined'] == 1:
                    document['declined'].append(email_result)
                else:
                    state = 'incomplete'
                    document['pending'].append(email_result)

            if state == 'loaded' and document['skipfinal']:
                state = 'signed'
            document['state'] = state

        return documents

    def get_full_invites(self, key: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get information about the users that have been invited to sign the document identified by `key`

        :param key: The key of the document
        :return: A list of dictionaries with information about the users, each of them with keys:
                 + name: The name of the user
                 + email: The email of the user
                 + lang: The language of the user
                 + signed: Whether the user has already signed the document
                 + declined: Whether the user has declined signing the document
                 + key: the key identifying the invite
                 + doc_id: the id of the invited document
                 + order: the order of the invitation
        """
        invitees: List[Dict[str, Any]] = []

        document_id = self.client.query_document_id(str(key))
        if document_id is None:
            self.logger.error(f"Trying to retrieve invitees for non-existing document with key {key}")
            return invitees

        invites = self.client.query_invites_from_doc(document_id)
        if invites is None or isinstance(invites, dict):
            self.logger.error(f"Trying to retrieve non-existing invitees for document with key {key}")
            return invitees

        for order, invite in enumerate(invites):
            email_result = {'email': invite['user_email'], 'name': invite['user_name'], 'lang': invite['user_lang']}
            email_result['signed'] = bool(invite['signed'])
            email_result['declined'] = bool(invite['declined'])
            email_result['key'] = invite['key']
            email_result['doc_id'] = document_id
            email_result['order'] = order
            invitees.append(email_result)

        return invitees

    def get_invited(self, key: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get information about the users that have been invited to sign the document identified by `key`

        :param key: The key of the document
        :return: A list of dictionaries with information about the users, each of them with keys:
                 + name: The name of the user
                 + email: The email of the user
                 + lang: The language of the user
                 + signed: Whether the user has already signed the document
                 + declined: Whether the user has declined signing the document
                 + key: the key identifying the invite
                 + order: the order of the invitation
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
            email_result = {'email': invite['user_email'], 'name': invite['user_name'], 'lang': invite['user_lang']}
            email_result['signed'] = bool(invite['signed'])
            email_result['declined'] = bool(invite['declined'])
            email_result['key'] = invite['key']
            email_result['order'] = int(invite['order'])
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
        user = {'name': invite['user_name'], 'email': invite['user_email'], 'lang': invite['user_lang']}

        return {'document': doc, 'user': user}

    def add_invitation(
        self, document_key: uuid.UUID, name: str, email: str, lang: str, invite_key: str = '', order: int = 0
    ) -> Dict[str, Any]:
        """
        Create a new invitation to sign

        :param document_key: The key identifying the document to sign
        :param name: The name for the new invitation
        :param email: The email for the new invitation
        :param lang: The language for the new invitation
        :param invite_key: The invite key for the new invitation
        :param order: The order for the new invitation
        :return: data on the new invitation
        """
        self.client.pipeline()

        document_id = self.client.query_document_id(str(document_key))
        if document_id is None:
            self.logger.error(f"Trying to find a non-existing document with key {document_key}")
            self.client.abort()
            return {}

        if invite_key == '':
            invite_key = str(uuid.uuid4())

        self.client.insert_invite(invite_key, document_id, email, name, lang, order)

        self.client.commit()

        return {'key': invite_key, 'name': name, 'email': email}

    def rm_invitation(self, invite_key: uuid.UUID, document_key: uuid.UUID) -> bool:
        """
        Remove an invitation to sign

        :param invite_key: The key identifying the signing invitation to remove
        :param document_key: The key identifying the signing invitation to remove
        :return: success
        """
        self.client.pipeline()
        invite_id = self.client.query_invite_id(invite_key)
        email = self.client.redis.hget(f"invite:{invite_id}", 'user_email').decode('utf8')
        doc_id = self.client.query_document_id(str(document_key))
        self.client.remove_invite(doc_id, invite_id, invite_key, email)

        self.client.commit()
        return True

    def get_full_document(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get full information about some document

        :param key: The key identifying the document
        :return: A dictionary with information about the document, with keys:
                 + doc_id: pk of the doc in the storage.
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + owner_email: Email of inviter user
                 + owner_name: Name of inviter user
                 + owner_lang: Language of inviter user
                 + owner_eppn: Eppn of inviter user
                 + loa: required loa
                 + sendsigned: whether to send the signed document by mail
                 + prev_signatures: previous signatures
                 + updated: modification timestamp
                 + created: creation timestamp
                 + skipfinal: whether to skip the final signature by the inviter user
                 + ordered_invitations: send invitations in order
                 + invitation_text: The custom text to send in the invitation email
        """
        document_result = self.client.query_document_full(str(key))
        if document_result is None:
            self.logger.error(f"Trying to find a non-existing document with key {key}")
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
                 + owner_lang: Language of owner
        """
        document_result = self.client.query_document_all(key)
        if document_result is None:
            self.logger.error(f"Trying to find a non-existing document with key {key}")
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
        self.client.pipeline()
        lock_info = self.client.query_document_lock(doc_id)
        self.logger.debug(f"Checking lock for {locking_email} in document with id {doc_id}: {lock_info}")
        if lock_info is None:
            self.logger.error(f"Trying to lock a non-existing document with id {doc_id}")
            self.client.abort()
            return False

        now = datetime.now()

        locked = lock_info['locked']

        now_ts = now.timestamp()

        if (
            locked is None
            or (now - locked) > current_app.config['DOC_LOCK_TIMEOUT']
            or lock_info['locking_email'] == locking_email
        ):
            self.logger.debug(f"Adding lock for {locking_email} in document with id {doc_id}: {lock_info}")
            self.client.add_document_lock(doc_id, now_ts, locking_email)
            self.client.commit()
            return True

        self.client.abort()
        return False

    def rm_lock(self, doc_id: int, unlocking_email: List[str]) -> bool:
        """
        Remove lock from document. If the document is not locked, do nothing.
        The user unlocking must be that same user that locked it.

        :param doc_id: the pk for the document in the documents table
        :param unlocking_email: Emails of the user unlocking the document
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

        now = datetime.now()

        locked = lock_info['locked']

        if (now - locked) < current_app.config['DOC_LOCK_TIMEOUT'] and lock_info['locking_email'] in unlocking_email:
            self.client.rm_document_lock(doc_id)
            self.client.commit()
            return True

        self.client.abort()
        return False

    def check_lock(self, doc_id: int, locking_email: List[str]) -> bool:
        """
        Check whether the document identified by doc_id is locked.
        This will remove stale locks (older than the configured timeout).

        :param doc_id: the pk for the document in the documents table
        :param locking_email: Email of the user locking the document
        :return: Whether the document is locked by the user with `locking_email` emails
        """
        lock_info = self.client.query_document_lock(doc_id)
        if lock_info is None or isinstance(lock_info, list):
            self.logger.error(f"Trying to check a non-existing document with id {doc_id}")
            return False

        if lock_info['locked'] is None:
            self.logger.debug(f"Check a non-locked document with id {doc_id}")
            return False

        locked = lock_info['locked']

        now = datetime.now()

        if (now - locked) > current_app.config['DOC_LOCK_TIMEOUT']:
            self.logger.debug(f"Lock for document with id {doc_id} has expired")
            self.client.pipeline()
            self.client.rm_document_lock(doc_id)
            self.client.commit()
            return False

        self.logger.debug(f"Checking lock for {doc_id} by {lock_info['locking_email']} for {locking_email}")
        return lock_info['locking_email'] in locking_email

    def get_sendsigned(self, key: uuid.UUID) -> bool:
        """
        Whether the final signed document should be sent by email to signataries

        :param key: The key identifying the document
        :return: whether to send emails
        """
        return self.client.query_sendsigned(key)

    def set_sendsigned(self, key: uuid.UUID, value: bool):
        """
        Set whether the final signed document should be sent by email to all signataries

        :param key: The key identifying the document
        :param value: whether to send emails
        """
        try:
            self.client.pipeline()
            self.client.set_sendsigned(str(key), value)
            self.client.commit()
        except Exception as e:
            self.logger.error(f"Problem trying to set sendsigned: {e}")
            raise

    def get_skipfinal(self, key: uuid.UUID) -> bool:
        """
        Whether the final signed document should be signed by the inviter

        :param key: The key identifying the document
        :return: whether it should be signed by the owner
        """
        return self.client.query_skipfinal(key)

    def set_skipfinal(self, key: uuid.UUID, value: bool):
        """
        Set whether the final signed document should be signed by the inviter

        :param key: The key identifying the document
        :param value: whether it should be signed by the owner
        """
        try:
            self.client.pipeline()
            self.client.set_skipfinal(str(key), value)
            self.client.commit()
        except Exception as e:
            self.logger.error(f"Problem trying to set skipfinal: {e}")
            raise

    def get_loa(self, key: uuid.UUID) -> str:
        """
        Required LoA for signature authn context

        :param key: The key identifying the document
        :return: LoA
        """
        return self.client.query_loa(key)

    def get_ordered(self, key: uuid.UUID) -> bool:
        """
        Whether the invitations for the document are ordered

        :param key: The key identifying the document
        :return: whether the invitations for signing the document are ordered
        """
        return self.client.query_ordered(key)

    def get_invitation_text(self, key: uuid.UUID) -> str:
        """
        Get the custom text to send in the invitation email

        :param key: The key identifying the document
        :return: The invitation text
        """
        return self.client.query_invitation_text(key)
