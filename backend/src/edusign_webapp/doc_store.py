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
import abc
import logging
import uuid
from importlib import import_module
from typing import Any, Dict, List, Optional

from flask import Flask


class ABCStorage(metaclass=abc.ABCMeta):
    """
    Abstact base class for classes dealing with the storage of documents in the backend,
    so that they can be consecutively signedby more than one user.
    """

    @abc.abstractmethod
    def __init__(self, config: dict, logger: logging.Logger):
        """
        :param config: Dict like object with the configuration parameters provided to the Flask app.
        :param logger: Logger
        """

    @abc.abstractmethod
    def add(self, key: uuid.UUID, content: str):
        """
        Store a new document.

        :param key: UUID key identifying the document
        :param content: Contents of the document, as a base64 string.
        """

    @abc.abstractmethod
    def get_content(self, key: uuid.UUID) -> Optional[str]:
        """
        Get the content of some document identified by the `key`,
        as a base64 string.

        :param key: The key identifying the document.
        :return: base64 string with the contents of the document.
        """

    @abc.abstractmethod
    def update(self, key: uuid.UUID, content: str):
        """
        Update a document, usually because a new signature has been added.

        :param key: The key identifying the document.
        :param content: base64 string with the contents of the new version of the document.
        """

    @abc.abstractmethod
    def remove(self, key: uuid.UUID):
        """
        Remove a document from the store

        :param key: The key identifying the document.
        """


class ABCMetadata(metaclass=abc.ABCMeta):
    """
    Abstract base class to deal with the metadata associated to documents stored in the backend,
    to be signed by more than one user.

    This metadata includes data about the document (name, size, type),
    data about its owner (who has uploaded the document and invited other users to sign it),
    and data about the users who have been invited to sign the document.
    """

    @abc.abstractmethod
    def __init__(self, app: Flask):
        """
        :param app: flask app
        """

    @abc.abstractmethod
    def add(
        self, key: uuid.UUID, document: Dict[str, str], owner: Dict[str, str], invites: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Store metadata for a new document.

        :param key: The key that uniquely identifies the document in the storage.
        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + type: Content type of the doc
                         + size: Size of the doc
        :param owner: Email address and name of the user that has uploaded the document.
        :param invites: List of the names and emails of the users that have been invited to sign the document.
        :return: The list of invitations as dicts with 3 keys: name, email, and generated key (UUID)
        """

    @abc.abstractmethod
    def get_pending(self, email: str) -> List[Dict[str, str]]:
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

    @abc.abstractmethod
    def update(self, key: uuid.UUID, email: str):
        """
        Update the metadata of a document to which a new signature has been added.

        :param key: The key identifying the document in the `storage`.
        :param email: email address of the user that has just signed the document.
        """

    @abc.abstractmethod
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
        """

    @abc.abstractmethod
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

    @abc.abstractmethod
    def remove(self, key: uuid.UUID, force: bool = False) -> bool:
        """
        Remove from the store the metadata corresponding to the document identified by the `key`,
        typically because it has already been signed by all requested parties and has been handed to the owner.

        :param key: The key identifying the document.
        """

    @abc.abstractmethod
    def get_invitation(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get the invited user's name and email and the data on the document she's been invited to sign

        :param key: The key identifying the signing invitation
        :return: A dict with data on the user and the document
        """

    @abc.abstractmethod
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

    @abc.abstractmethod
    def add_lock(self, doc_id: int, locked_by: str) -> bool:
        """
        Lock document to avoid it being signed by more than one invitee in parallel.
        This will first check that the doc is not already locked.

        :param doc_id: the pk for the document in the documents table
        :param locked_by: Email of the user locking the document
        :return: Whether the document has been locked.
        """

    @abc.abstractmethod
    def rm_lock(self, doc_id: int, unlocked_by: str) -> bool:
        """
        Remove lock from document. If the document is not locked, do nothing.
        The user unlocking must be that same user that locked it.

        :param doc_id: the pk for the document in the documents table
        :param unlocked_by: Email of the user unlocking the document
        :return: Whether the document has been unlocked.
        """

    @abc.abstractmethod
    def check_lock(self, doc_id: int, locked_by: str) -> bool:
        """
        Check whether the document identified by `doc_id` is locked by user with email `locked_by`.
        This will remove (or update) stale locks (older than the configured timeout).

        :param doc_id: the pk for the document in the documents table
        :param locked_by: Email of the user locking the document
        :return: Whether the document is locked by the user with `locked_by` email
        """

    @abc.abstractmethod
    def get_user(self, user_id: int) -> Dict[str, Any]:
        """
        Return information on some user.

        :param user_id: the pk for the user in the users table
        :return: Name and email of the user
        """


class DocStore(object):
    """
    Interface to deal with multi-sign documents.
    """

    class DocumentLocked(Exception):
        pass

    def __init__(self, app: Flask):
        """
        :param app: flask app
        """

        self.app = app
        self.config = app.config
        self.logger = app.logger

        storage_class_path = app.config['STORAGE_CLASS_PATH']
        storage_module_path, storage_class_name = storage_class_path.rsplit('.', 1)
        storage_class = getattr(import_module(storage_module_path), storage_class_name)

        self.storage = storage_class(app.config, app.logger)

        docmd_class_path = app.config['DOC_METADATA_CLASS_PATH']
        docmd_module_path, docmd_class_name = docmd_class_path.rsplit('.', 1)
        docmd_class = getattr(import_module(docmd_module_path), docmd_class_name)

        self.metadata = docmd_class(app)

    def add_document(
        self, document: Dict[str, str], owner: Dict[str, str], invites: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Store document, to be signed by all users referenced in `invites`.

        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + key: UUID identifying the document
                         + name: The name of the document
                         + type: Content type of the doc
                         + size: Size of the doc
                         + blob: Contents of the document, as a base64 string.
        :param owner: Email address and name of the user that has uploaded the document.
        :param invites: List of names and email addresses of the users that should sign the document.
        :return: The list of invitations as dicts with 3 keys: name, email, and generated key (UUID)
        """
        key = uuid.UUID(document['key'])
        self.storage.add(key, document['blob'])
        return self.metadata.add(key, document, owner, invites)

    def get_pending_documents(self, email: str) -> List[Dict[str, Any]]:
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
                 + owner: Email and name of the user requesting the signature
        """
        return self.metadata.get_pending(email)

    def get_document_content(self, key: uuid.UUID) -> Optional[str]:
        """
        Get the content of some document identified by the `key`,
        as a base64 string, to add a signature to it.

        NOTE XXX: This should set a lock on the document,
                  to avoid 2 users signing the document concurrently,
                  thus one of them shadowing the other's signaure.
                  This lock should also expire after some time.
                  Alternatively, we may send the email invites in succession,
                  only sending one when the previous invited user has already signed.

        :param key: The key identifying the document in the `storage`.
        :return: base64 string with the contents of the document.
        """
        return self.storage.get_content(key)

    def update_document(self, key: uuid.UUID, content: str, email: str):
        """
        Update a document to which a new signature has been added.

        :param key: The key identifying the document in the `storage`.
        :param content: base64 string with the contents of the document, with a newly added signature.
        :param email: email address of the user that has just signed the document.
        """
        self.storage.update(key, content)
        self.metadata.update(key, email)

    def get_owned_documents(self, email: str) -> List[Dict[str, Any]]:
        """
        Get the documents added by the user to be signed by other users,
        together with information about which of the other users have signed them.

        :param email: The email of the user
        :return: A list of dictionaries with information about the documents,
                 each of them with keys:
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + pending: List of emails of the users invited to sign the document who have not yet done so.
                 + signed: List of emails of the users invited to sign the document who have already done so.
        """
        return self.metadata.get_owned(email)

    def remove_document(self, key: uuid.UUID, force: bool = False) -> bool:
        """
        Remove a document from the store, possibly because it has already been signed
        by all requested parties and has been handed to the owner.

        :param key: The key identifying the document in the `storage`.
        :param force: If True, remove document even if there are pending signatures.
        :return: whether the document has been removed.
        """
        removed = self.metadata.remove(key, force=force)
        if removed:
            self.storage.remove(key)

        return removed

    def get_invitation(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get the invited user's name and email and the data on the document she's been invited to sign

        :param key: The key identifying the signing invitation
        :return: A dict with data on the user and the document
        """
        data = self.metadata.get_invitation(key)
        if not data:
            return {}

        locked = self.metadata.add_lock(data['document']['doc_id'], data['user']['email'])

        if not locked:
            raise self.DocumentLocked()

        data['document']['blob'] = self.storage.get_content(uuid.UUID(bytes=data['document']['key']))
        return data

    def unlock_document(self, key: uuid.UUID, unlocked_by: str) -> bool:
        """
        Unlock document

        :param key: The key identifying the document to unlock
        :param locked_by: Email of the user unlocking the document
        :return: Whether the document is unlocked
        """
        doc = self.metadata.get_document(key)
        if not doc:
            return False

        return self.metadata.rm_lock(doc['doc_id'], unlocked_by)

    def check_document_locked(self, key: uuid.UUID, locked_by: str) -> bool:
        """
        Check that the document is locked by the user with email `locked_by`

        :param key: the key identifying the document to unlock
        :param locked_by: Email of the user locking the document
        :return: Whether the document is unlocked
        """
        doc = self.metadata.get_document(key)
        if not doc:
            return False
        self.logger.debug(f"Checked doc {doc['name']} for {locked_by}")

        return self.metadata.check_lock(doc['doc_id'], locked_by)

    def get_signed_document(self, key: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get document - called once all invitees have signed

        :param key: the key identifying the document
        :return: A dict with document data, with keys:
                 + doc_id: pk of the doc in the storage.
                 + key: Key of the doc in the storage.
                 + name: The name of the document
                 + type: Content type of the doc
                 + size: Size of the doc
                 + blob: Contents of the document, as a base64 string.
        """
        doc = self.metadata.get_document(key)
        doc['blob'] = self.storage.get_content(key)
        return doc

    def get_document_name(self, key: uuid.UUID) -> str:
        """
        Get document name

        :param key: the key identifying the document
        :return: the document name
        """
        doc = self.metadata.get_document(key)
        return doc['name']

    def get_owner_data(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get data on the owner of the document

        :param key: the key identifying the document
        :return: A dict with owner data, with keys:
                 + name: The name of the owner
                 + email: The email of the owner
                 + docname: The name of the document
        """
        doc = self.metadata.get_document(key)
        if not doc:
            return {}

        user = self.metadata.get_user(doc['owner'])

        return {
            'name': user['name'],
            'email': user['email'],
            'docname': doc['name'],
        }

    def get_pending_invites(self, key: uuid.UUID) -> Dict[str, Any]:
        """
        Get information about the users that have been invited to sign the document identified by `key`

        :param key: The key of the document
        :return: A list of dictionaries with information about the users, each of them with keys:
                 + name: The name of the user
                 + email: The email of the user
                 + signed: Whether the user has already signed the document
                 + key: the key identifying the invite
        """
        return self.metadata.get_invited(key)
