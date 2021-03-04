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
    def add(self, content: str) -> uuid.UUID:
        """
        Store a new document.

        :param content: Contents of the document, as a base64 string.
        :return: A key that uniquely identifies the document in the store.
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
    def __init__(self, config: dict, logger: logging.Logger):
        """
        :param config: Dict like object with the configuration parameters provided to the Flask app.
        :param logger: Logger
        """

    @abc.abstractmethod
    def add(self, key: uuid.UUID, document: Dict[str, str], owner: Dict[str, str], invites: List[Dict[str, str]]) -> List[Dict[str, str]]:
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


class DocStore(object):
    """
    Interface to deal with multi-sign documents.
    """

    def __init__(self, config: dict, logger: logging.Logger):
        """
        :param config: Dict containing the configuration parameters provided to Flask.
        """

        self.config = config
        self.logger = logger

        storage_class_path = config['STORAGE_CLASS_PATH']
        storage_module_path, storage_class_name = storage_class_path.rsplit('.', 1)
        storage_class = getattr(import_module(storage_module_path), storage_class_name)

        self.storage = storage_class(config, logger)

        docmd_class_path = config['DOC_METADATA_CLASS_PATH']
        docmd_module_path, docmd_class_name = docmd_class_path.rsplit('.', 1)
        docmd_class = getattr(import_module(docmd_module_path), docmd_class_name)

        self.metadata = docmd_class(config, logger)

    def add_document(self, document: Dict[str, str], owner: Dict[str, str], invites: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Store document, to be signed by all users referenced in `invites`.

        :param document: Content and metadata of the document. Dictionary containing 4 keys:
                         + name: The name of the document
                         + type: Content type of the doc
                         + size: Size of the doc
                         + blob: Contents of the document, as a base64 string.
        :param owner: Email address and name of the user that has uploaded the document.
        :param invites: List of names and email addresses of the users that should sign the document.
        :return: The list of invitations as dicts with 3 keys: name, email, and generated key (UUID)
        """
        key = self.storage.add(document['blob'])
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
        """
        return self.metadata.get_owned(email)

    def remove_document(self, key: uuid.UUID, force: bool = False) -> bool:
        """
        Remove a document from the store, possibly because it has already been signed
        by all requested parties and has been handed to the owner.

        :param key: The key identifying the document in the `storage`.
        :param force: If True, remove document even if there are peding signatures.
        :return: whther the document has been removed.
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
        data = self.storage.get_invitation(key)
        data['doc']['blob'] = self.storage.get_content(data['doc']['key'])
        return data
