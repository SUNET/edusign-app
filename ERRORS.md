
Error messages
==============

Error messages come from 3 different origins:

* The sign service and integration API. These are in English, and they are
  relayed directly to the user when they happen, and shown in the box
  representing the documents presenting a problem. There is no list of them at
  this point.
* The backend. These are translated, listed below.
* The frontend: Translated, listed below.

Originating in the backend
--------------------------


1.1. These messages are displayed in the notifications area when there is an
unexpected bug, a problem that cannot be solved by the user. Their display
should coincide with log entries with the specifics of the problem. There are
more than one message of this type for historical reasons.

    There were problems with the data you sent, please try again or contact
    your IT support

    There was an error. Please try again, or contact the site administrator.

1.2. Message shown to users who try to use the app and are not whitelisted:

    Unauthorized

1.3. This appears when a user has been invited to sign a document with a LoA
requirement, and they don't provide it (this is checked via the SAML
eduPersonAssurance attribute during ligin). It is shown in the box
corresponding to the invitation.

    You don't provide the required securiry level, please make sure to
    provide level %(level)s

1.4. This appears when the IdP the user has used does not release the needed
attributes. It is shown as an error page with a title and a description:

    Missing information

    Your organization did not provide the correct information during login.
    Please contact your IT-support for assistance."

1.5. This is displayed when the user has not added a displayName to their
account at their IdP. It is shown as an error page with a title and a
description:

    Missing displayName

    Your should add your name to your account at your organization. Please
    contact your IT-support for assistance.

1.6. This is shown in the notifications area when the backend receives a
document that is neither a PDF or XML. This should be prevented by the frontend
and thus should not happen.

    There was an error signing docs: unsupported MIME type.

1.7. This is shown in the notifications area when a user tries to sign a
document and the signservice integration API return an error.

    Problem preparing document for signing. Please try again, or contact the
    site administrator.

1.8. This is shown in the notifications area when a user tries to create an
invitation to sign and there is some error adding it to the invitations
database.

    Problem creating invitation to sign, please try again

1.9. This is shown in the notifications area when a user tries to create an
invitation, and the invitation is created but there is some problem sending the
invitation emails.

    There was a problem and the invitation email(s) were not sent

1.10. Message shown in the notifications area when the user is trying to send a
reminder email for an invitation and there are problems sending the email.

    Problem sending the email, please try again

1.11. Message displayed in the notifications area when a user tries to sign an
invitation, and there is another invited user signing the same document at the
same time.

    Document is being signed by another user, please try again in a few
    minutes.

1.12. When a user tries to sign a document with a required LoA and they don't
provide it. This should not happen, the UI should not allow the user to start
signing if they don't provide the reduired LoA.

    Could not provide the requested security level.

1.13. This is shown in the notifications area when a user tries to edit an
invitation to sign and there is some problem with the new data.

    Problem editing the invitations

1.14. When a user edits an invitation to sign, it may be necessary to send
various invitation and cancellation emails, for users that have been added or
removed from the invitation. If some of this mailing fails, the user editing
the invitation is shown this message in the notifications area.

    Some users may not have been notified of the changes for '%(docname)s'

1.15. When a user tries to cancel an invitation they had made, and there is an
error and it isn't removed, they are shown this message in the notifications
area.

    Problem removing the invitation, please try again

1.16. When a user tries to cancel an invitation they have made, and there is
some problem mailing the invitees of the cancellation, the user trying to
cancel is shown this message in the notifications area.

    Some users may have not been informed of the cancellation

1.17. When a user tries to preview a document they have been invited to sign,
and the document is not found in the backend, they are shown this message in
the notifications area.

    Cannot find the document being signed

1.18. When a user has been invited to sign a document, and tries to decline the
invitation, but there is a problem and the declination is not persisted, they
are shown this mesage in the notifications area.

    Problem declining signature, please try again

1.19. When a user tries to fill in a PDF form, previous to adding signatures to
it, and the process fails, they are shown this in the notifications area.

    Problem filling in form in PDF, please try again

1.20. When a user tries to edit an invitation they have made, and one of the
invitees is signing the invitation in that same moment, the user trying to edit
the invitation is shown this in the notifications area.

    The document is being signed by an invitee, please try again in a few
    minutes

1.21. These should never be seen, and correspond to impossible data while
processing an invitation (e.g., the user sees an invitation in their UI but
when they try to sign it, there is no invitation in the backend). If shown,
they would appear in the notifications area. 

    There doesn't seem to be an invitation for you to sign \"%(docname)s\".

    The email %(email)s invited to sign \"%(docname)s\" does not coincide
    with yours.


Origination in the frontend
---------------------------

2.1. When there is an unidentified error loading a document, this error is
shown in the notifications area.

    Error loading {document_name}

2.2. In the same case as for 2.6, this is shown on the box representing the
document that failed to load.

    Document could not be loaded

2.3. When a user tries to load a document that is neither PDF nor XML, this message is shown in the notifications area.

    Not a PDF or XML document: {document_name}

2.4. When a user tries to load a document with the same name as another
document already loaded, the document will not load, and this message will be
displayed in the notifications area.

    A document with that name has already been loaded

2.5. When the document has failed to load for any reason, the contextual help
on the box representing the invitation shows this (title and text).

    Failed loading document

    This does not seem to be a valid document

2.6. There are several ways in which documents are examined, and each may result
in a different message shown in the box representing the document.

    Malformed PDF

    Document is too big (max size: {size})

    Document is unreadable

    Document seems corrupted

    Please do not supply a password protected document

2.7. When a user tries to load a document, and there are problems storing them
in the local browser db, this message is shown in the box representing the
document.

    Problem adding document, please try again

2.8. When a user tries to load a document, and there are problems storing them
in the local browser db, this message is shown in the notifications area.

    Problem adding documents, please try again

2.9. When a user tries to load a document, and there are problems after having
sent them to the backend to be prepared for signing, this message is shown in
the box representing the document.

    Problem saving document in session

2.10. When a user tries to load a document, and there are problems after having
sent them to the backend to be prepared for signing, this message is shown in
the notifications area.

    Problem saving document(s) in session. Please try again or contact the site
    administration

2.11. When tries to sign a document that exceeds the max allowed size, and the
server responds with a "413 Content Too Large" response, this is shown in the
box representing the document. This should not happen, since validation in the
frontend should disallow the user from trying to sign.

    Problem preparing document, it is too big

2.12. When the procedure to read the previous signatures of a document fails,
this message is shown where the previous signatures would have been shown.

    Unable to interpret document metadata

2.13. When the API has failed to prepare a document for signing, for whatever
reason, this message is shown in the box representing the document.

    There was a problem preparing the document

2.14. When the API has failed to prepare a document for signing, for whatever
reason, this message is shown in the notifications area.

    Problem preparing document for signing. Please try again or contact the
    site administration.

2.15. When the API has failed to prepare a document for signing, for whatever
reason, the contextual help on the box representing the invitation shows this
(title and text).

    Failed preparing document

    There was a problem preparing the document for signing, clik on the button
    labelled "retry" to try again

2.16. When there was a problem signing the document, this message is shown in
the box representing the document.

    There was a problem signing the document

2.17. When there was a problem signing the document, this message is shown in
the notifications area.

    Problem getting signed documents, please try again later

2.18. When there was a problem signing the document, the contextual help on the
box representing the invitation shows this (title and text).

    Failed signing document

    There was a problem signing the document, to try again click on the
    checkbox to the left and then on the button labelled "Sign selected
    documents"

2.19. The invitation form will not validate if there are 2 invitees with the
same email, and the field with the 2nd ocurrence will show this error message:

    That email has already been invited

2.20. The invitation form will not validate if one of the invitees is the actual
user who is making the invitation, showing this message in the form field with
the email.

    Do not invite yourself

2.21. There is a limit on the number of invitees for each invitation, imposed by
the number of signatures that fit in the signatures page. If this number is
exceeded, this message is shown over the extra invitee.

    It is only possible to invite at most {max_signatures} people

2.22. When a user tries to send invitations to sign, and the process fails,
this is shown in the notifications area.

    Problem sending invitations to sign, please try again

2.23. When a user tries to edit an invitation, the app tries to lock the
invitation in the backend so that no one can sign it while it is being edited.
If this process fails, this is shown in the notifications area.

    Problem opening edit form, please try again later

2.24. When a user tries to edit an invitation they had made and the procedure
fails, this is shown in the notifications area.

    Problem editing invitation to sign, please try again

2.25. If a user edits an invitation they have made, and removes all pending
invites, and no one has yet signed it, the document is restored to the user's
"personal" documents. If this fails, this is shown in the notifications area.

    Problem restoring document, please load it again

2.26. When a user tries to remove an invitation they have made, anthe process
fails, this is shown in the notifications area.

    Problem removing multi sign request, please try again

2.27. When the user does not provide the required LoA for an invitation, the
contextual help on the box representing the invitation shows this (title and
text).

    Insufficient security level

    Your account does not provide the required security level. Please take the
    steps to provide it.

2.28. When a user tries to preview a document that they have or have been
invited to sign, and there is some problem fetching the document, this is shown
in the notifications area.

    Problem fetching document from the backend, please try again

2.29. When a user tries to decline an invitation and the procedure fails, this
is shown in the notifications area.

    Problem declining signature

2.30. When a user tries to skip the final signature in an invitation they have
made, and the process fails, this is shown in the notifications area.

    Problem skipping final signature, please try again

2.31. When a user tries to fill in a PDF form, and the process fails, this is
shown in the notifications area.

    Problem filling in PDF form, please try again
