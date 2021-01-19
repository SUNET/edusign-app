
EduSign front side integration
==============================

Front end to use the eduSign document signing service.

Here I will provide instructions to depoy both a development environment to
hack at the project and a production environment.

Development and deployment tasks are provided as make commands; type
:code:`make help` at the root of the repository to find out about them.

Deploying a development environment
-----------------------------------

These are instructions to set up an environment in which to work on the
development of SUNET/edusign-app. It will consist of a container running the
webapp as a wsgi service under gunicorn, a container with an NGINX proxying the
webapp and protected by a Shibboleth SP, and a test IdP provided by 3
containers, one with an OpenLDAP server, another with a Shibboleth IdP, and a
3rd with an Apache as IdP front.

We start with a system (only tested on Arch Linux and Debian 10) with npm and
docker and docker-compose (tested with npm 6.14.11, docker engine 20.20.2 or
20.10.2, and docker-compose 1.27.4).

First we clone the repo:

.. code-block:: bash

 $ git clone https://github.com/SUNET/edusign-app
 $ cd edusign-app

Then we build the frontside app javascript bundle. First we initialize the
javascript development environment:

.. code-block:: bash

 $ make front-init

Now we want to start building the bundle, and keep building it as we hack at
it.

.. code-block:: bash

 $ make front-build-dev

Now we want to run the docker compose environment. For this we need a new
terminal.

.. code-block:: bash

 $ cd edusign-app

Then we install the configuration needed for the environment to run. We need
access to some deployment of the eduSign API / sign service, in the form of the
URL of the API / service, the name of a profile for which we have basic auth
credentials, the said credentials, and the entityID of the SP that has driven
the authentication of the user (known as :code:`signRequesterID` to the API,
which needs to be registered with it; in production this would be the entityID of
the app as an SP, but in development, since we would not normally be able to
register our instance of the app with the sign service, we fake it, and
provide some value agreed upon with the operators of the API).

We also need an identity at a SAML IdP that has established trust with the
eduSign API. In production, we would use this same IdP to authenticate our
users, but in development we use a test IdP and tell (lie) the sign API /
service that we have used the same IdP it will be using (setting it as value to
the :code:`DEBUG_IDP` setting).

The default configuration for development is in the :code:`environment-devel` file.
We copy this file to :code:`environment-current` (in the root of the repository, at
the same level as :code:`environment-devel`) and change the settings there. This file
should only contain environment variables with their values (not comments or
anything else).

In principle, we should only need to change the settings for the eduSign API.
The absolute minimum is to set the basic auth credentials, as values to the
variables :code:`EDUSIGN_API_USERNAME` and :code:`EDUSIGN_API_PASSWORD`. This is assuming
that we are using the API at :code:`https://sig.idsec.se/signint/v1/`, with profile
:code:`edusign-test`, and that we have an account at :code:`https://eduid.se`.

If we are not using the eduSign API settings mentioned above, we would set the
API URL (without any API method) at :code:`EDUSIGN_API_BASE_URL`, the profile name at
:code:`EDUSIGN_API_PROFILE`, the entityID of the authenticating SP at
:code:`SIGN_REQUESTER_ID`, and the entityID of an IdP that is trusted by the API and
in which we have an identity at :code:`DEBUG_IDP`. We might also have to adjust the
attributes used for signing to make sure that they are released by the
:code:`DEBUG_IDP`, at :code:`SIGNER_ATTRIBUTES`.

The rest of the env variables in :code:`environment-devel` are there just to have a
different value than in production, and it should not be necessary to change
them.

.. code-block:: bash

 $ cp environment-devel environment-current
 $ vim environment-current  # change settings

We now install the configuration.

.. code-block:: bash

 $ make config-build

Now, we may need to edit the file at :code:`config-current/users.ldif` to add a
user that has the same attributes and values as our identity in the
:code:`DEBUG_IDP`. We might also want to edit some other of the files present
at :code:`config-current/`. After doing so we must again execute
:code:`make config-build`.

Finally, we start the docker environment:

.. code-block:: bash

 $ make dev-env-start

This will start a development environment (the 1st time it'll take a while,
since it needs to build all the images) which we can access (locally) at
:code:`https://sp.edusign.docker/sign`.

We can tail the logs with :code:`make logs-tailf <logfile name>`, and list all
possible log files with :code:`make logs-list`.

Deploying a production environment
----------------------------------

Instructions to deploy a production instance of the app. This will consist on 2
docker containers, one running a front facing NGINX server protected by a
Shibboleth SP and proxying the app, and another with the eduSign app as a WSGI
app driven by Gunicorn.

Essentially, this will involve providing the configuration, and starting the
docker compose environment.

Prerequisites
.............

* A server with a public IP and domain name.
* An SSL certificate for the domain name.
* Docker daemon running on the server, and docker-compose available (tested with docker engine 20.10.2
  or 20.20.2, and docker-compose 1.27.4).
* A SAML2 IdP/federation that has established trust with the API and is ready to do the same with us.
* A clone of the SUNET/edusign-app repository in the server.

Configuration
.............

First we need to provide the SSL certificates for NGINX and for the Shibboleth
SP. These need to be named :code:`nginx.crt`, :code:`nginx.key`, :code:`sp-cert.pem`, and
:code:`sp-key.pem`.

.. code-block:: bash

 $ cd edusign-app
 $ mkdir -p config-current/ssl
 $ cp <wherever>/nginx.* config-current/ssl/
 $ cp <wherever>/sp-* config-current/ssl/

Then we need to provide the IdP metadata, in a file named
idp-metadata.xml. If we are instead dealing with a federation, we would need to configure it by editing the configuration at :code:`shibboleth2.xml`, see below.

.. code-block:: bash

 $ cp <wherever>/idp-metadata.xml config-current/

Then we need to provide values to some settings. These can reside in an
environment file :code:`environment-current` or be exported as environment variables.
The settings needed are listed in the file :code:`environment-pro` at the root of the
repo, see below for an explanation of each of them.  So to add them in a file,
do:

.. code-block:: bash

 $ cp environment-pro environment-current
 $ vim environment-current

And then we build the configuration files using these values:

.. code-block:: bash

 $ make config-build

If, instead, we want to provide the settings as exported environment variables,
we would export them and then run:

.. code-block:: bash

 $ make config-build-from-env

We may now want to edit any of the configuration files in
:code:`config-current/` (e.g., :code:`shibboleth2.xml`, if we deal with a
federation instead of an IdP). If we do so, after editing them we would again
execute :code:`make config-build`.

Once the environment is running, we can get the Shibboleth SP metadata from
:code:`/Shibboleth.sso/Metadata`.

Attributes used for signing
...........................

By default, we use the given name :code:`givenName`, the surname :code:`sn` and the email
address :code:`mail` attributes for signing the documents. This list can be altered;
if we do so, there are 4 different places which we need to be aware of.  One is
the :code:`SIGNER_ATTRIBUTES` setting as we show below. Then, whatever attributes are
used must be taken into account in the files :code:`attribute-map.xml`,
:code:`shib_clear_headers`, and :code:`shib_fastcgi_params`. Since having extra attributes
in those files, not actually used for signing, would not pose a problem, it
would be best to take into account in those files *all* attributes that might
be so used, so that is is not needed to edit those files. Note that the
attributes must be set in :code:`attribute-map.xml` with an :code:`AttributeDecoder` with
type :code:`StringAttributeDecoder`.

Start docker compose environment
................................

Execute the command :code:`make pro-env-start`. To stop the environment, the :code:`make
pro-env-stop` command should be used.

Access logs
...........

The available logs can be listed via the command :code:`make logs-list`. They can be
tailed with :code:`make logs-tailf <logfile>`.

Configuration variables
.......................

DEBUG
    Boolean (true or false). Set the debug mode for the app. Default: false

ENVIRONMENT
    String (development or production). Indicate what environment is being used. Default: production

SERVER_NAME
    String. FQDN for the service, as used in the SSL certificate for the NGINX.

SHIB_SP_ENTITY_ID
    String. SAML2 Entity ID of the service as an SP.

SHIB_IDP_ENTITY_ID
    String. SAML2 Entity ID of the IdP, used to configure the :code:`shibboleth2.xml` file for the Shibboleth SP. It may be necessary to actually edit the file if we have >1 IdP and need to configure a discovery service.

SECRET_KEY
    String. Key used by the webapp for encryption, e.g. for the sessions.

EDUSIGN_API_BASE_URL
    String. Base URL for the eduSign API.

EDUSIGN_API_PROFILE
    String. Profile to use in the eduSign API.

EDUSIGN_API_USERNAME
    String. Username for Basic Auth for the eduSign API.

EDUSIGN_API_PASSWORD
    String. Password for Basic Auth for the eduSign API.

SIGN_REQUESTER_ID
    String. SAML2 Entity ID for the eduSign app as an SP. Set separately from the SP entityId at :code:`shibboleth2.xml` because in development we usually fake it (since it needs to be registered with the API).
