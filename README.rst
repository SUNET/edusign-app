
eduSign Integration
===================

This repo contains code that can be used to build a web application that uses
the sign service and API `documented here
<https://github.com/idsec-solutions/signservice-integration-rest/blob/master/docs/sample-flow.md>`_
to provide a web interface for signing PDF documents.

There is a `sister repo <https://github.com/SUNET/docker-edusign-app>`_ that
contains code to deploy such webn applications, using the code in this repo.

eduSign web application overview
--------------------------------

To use the aplication, users have to identify themselves. To this end, the
application has to be integrated in some SAML2 environment, as a service
provider (SP). Once a user is identified via some SAML IdP, and some SAML
attributes pertaining that identity have been retrieved from the IdP and stored
in the session, the user is ready to use the app.

In the most basic usage of the app, the user will load a document into the
interface, send it for signing and sign it, and download the signed document.

A document loaded in the app is kept locally in the user's computer, in a
database in the browser that has been used to interact with the app. When it is
sent for signing, the document is uploaded to the API and sign service. To sign
it, the sign service takes the user to the SAML IdP of their choice (obviously,
the sign service also has to be registered as an SP in the SAML environment of
the IdP). Once signed, the document is downloaded back into the user's
computer, and kept in their local db, ready to be accessed by them. At this
point, the signed document only exists in the user's computer, and all trace of
it has been erased from the backends supporting the app.

The webapp also offers the user the possibility to load several documents and
sign them all at once, with one single visit to the IdP.

Finally, the webapp offers the possibility of inviting other users to sign a
loaded document, to obtain a final document with multiple signatures. Those
invited users will be notified by mail, and will be provided with a URL where
they will be able to sign the invited document. In this workflow, the document
will be kept "in transit" in the backend, instead of in the user's computer,
while all the requested signatures are added, and once the last invitation is
fulfilled and the document contains all the signatures, it will be downloaded
to the inviting user and kept there, and erased from the backend.

Architecture
------------

The webapp is composed of a frontend application, developed as a single page
application using React and Redux, and a backend application, developed using
Python and Flask. The backend application provides a JSON based restish API,
which the frontend app uses according with its interactions with the users.

The sign API is accessed exclusively from the backend application, to prepare
the documents for signing, and to retrieve the already signed documents. When
the users signs some document, the webapp sends them to the sign service,
which in turn sends them to the IdP, gathers its response, and uses it to
actually sign the document. Once signed, the sign service takes the user
back to the webapp, where the user can access the newly signed document.

Backend application
...................

The code for the backend app is kept in `this directory <https://github.com/SUNET/edusign-app/tree/master/backend>`_
as a Flask app.

