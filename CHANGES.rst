
In version 1.4.0:
-----------------

* Allow sining XML documents
* Invitations in order
* Ability to use 2 different sign service integration API profiles
* Inviter can require LoA levels
* customization of defaults in forms

In version 1.3.0:
-----------------

* validation of signatures
* customization - branding and style
* synthetic testing
* update dependencies - JS and Python
* allow requesting no final signature from inviter when making an invitation
* Redis backend up to date wrt i18n
* limit the number of invitations that can be made for a document (configurable)

In version 1.2.0:
-----------------

* i18n: allow more than 2 languages, add spanish
* i18n: Emails sent in one single language, selected by the user sending the invitations
* do not require givenName or sn in saml authn assertions, and provide clear error message when displayName is missing
* do not allow invitations on the same doument to the same user
* script to migrate metadata from sqlite & local fs to redis and s3
* allow google cloud buckets for the s3 storage backend
* redis backend thoroughly tested and updated
* Update Python dependencies
* Update JS dependencies
* fix bug removing duplicate invitations
* Make sure large documents can be signed and over 20MB are rejected
* Ensure filled PDF/A forms are still PDF/A
* Trigger "invite others to sign" from button instead of from menu item
* Always ask for confirmation when removing documents
* Add download preview button at "preview and accept" stage
* Add SMTP timeout shorter than the gunicorn workers timeout

In version 1.1.1:
-----------------

* Refactor db schema:
  * Remove users table
  * Keep user info along with document info (for inviters) and invitation info (for invited)
  * Add migration for existing data
* Allow users to fill in PDF forms in templates
* Allow users to invite on mail aliases (SAML mailLocalAddress attribute)
* Fix lag between adding a document and it appearing on the UI
* Add a creation timestamp to the representations of the documents
* Warn users when they load a document in excess of the max size
* Identify owner of invitation using eppn rather than mail
* Avoid 500 error when using the new version with an old session
* Updated FAQ
