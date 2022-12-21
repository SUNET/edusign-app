
In version 1.2.1:
-----------------

* Update Python dependencies
* Update JS dependencies

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
