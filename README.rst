
EduSign front side integration
==============================

Front end to use the eduSign document signing service.

Most development and deployment tasks are provided as make commands; type `make
help` at the root of the repository to find out about them.

Instructions for the operator
-----------------------------

Instructions to deploy an instance of the app. This will consist on 2 docker
containers, one running a front facing NGINX server protected by a Shibboleth
SP, and another with the eduSign app as a WSGI app driven by Gunicorn.

Essentially, this will involve providing the configuration, building the
front-end Javascript app bundle, and starting the docker compose environment.

Prerequisites
.............

* A server with a public IP and domain name.
* Docker daemon running on the server.
* npm in the server.
* An SSL certificate for the domain name.
* A SAML2 IdP/federation ready to integrate our SP metadata.
* A clone of the SUNET/edusign-app repository in the server.

Configuration
.............

Configuration values must be provided as environment variables, or in an
`environment-current` file.  The needed variables, and their meaning, are
listed below.

In addition to these values, it is necessary to provide the SSL certificate and
the SAML2 metadata. These must be placed within a directory at the root of the
checked out repository, at `config-current/<metadata file>` and
`config-current/ssl/<key and crt>`.

It is also possible to override any of the files present in `config-templates/`,
placing the alternative in `config-current/`; any files not overriden will be
taken from `config-templates`.

Once all the needed configuration has been provided, it should be applied by
executing either `make config-build`, if the values are provided in a
`environment-current` file, or `make config-build-from-env` if they are
provided in the environment.

Build JS bundle
...............

Execute the command `make front-init`, to gather all needed js packages, and
then `make front-build-pro` to build the bundle. Finally `make front-clean-pro`
can be executed to remove unneeded stuff.

Start docker compose environment
................................

Execute the command `make pro-env-start`. To stop the environment, the `make
pro-env-stop` command should be used.

Access logs
...........

The available logs can be listed via the command `make logs-list`. They can be
tailed with `make logs-tailf <regex>`, which will tail all logs matching the
provided regex.

Configuration variables
.......................

DEBUG
    Boolean (true or false). Set the debug mode for the app. Default: false

ENVIRONMENT
    String (development or production). Indicate what environment is being used. Default: production

SERVER_NAME
    String. FQDN for the service. Default: sp.edusign.docker

SHIB_SP_ENTITY_ID
    String. SAML2 Entity ID of the service as an SP. Default: https://sp.edusign.docker/shibboleth

SHIB_IDP_ENTITY_ID
    String. SAML2 Entity ID of the (test?) IdP. Default: https://idptestbed/idp/shibboleth

WEBAPP_HOSTNAME
    String. FQDN for the wsgi app in the docker network (??). Default: www.edusign.docker

FLASK_ENV
    String (development or production). Indicate what environment is being used. Default: production

SECRET_KEY
    String. Key to use for encryption, e.g. for the session. Default: supersecret

HASH_METHOD
    String. For the CSRF token. Default: sha256

SALT_LENGTH
    Integer. For the CSRF token. Default: 8

BABEL_DEFAULT_LOCALE
    String. Default locale for translatable strings. Default: en

BABEL_DEFAULT_TIMEZONE
    String. Default timezone for localizable dates and times. Default: UTC

EDUSIGN_API_BASE_URL
    String. Base URL for the eduSign API. Default: https://sig.idsec.se/signint/v1/

EDUSIGN_API_PROFILE
    String. Profile to use in the eduSign API. Default: edusign-test

EDUSIGN_API_USERNAME
    String. Username for Basic Auth for the eduSign API. Default: dummy

EDUSIGN_API_PASSWORD
    String. Password for Basic Auth for the eduSign API. Default: dummy

SIGN_REQUESTER_ID
    String. SAML2 Entity ID for the eduSign API as an SP. Default: https://sig.idsec.se/shibboleth

ENTITY_ID_URL
    String. SAML2 Entity ID of the service as an SP. Default: /shibboleth (??SHIB_SP_ENTITY_ID??)

Install development environment
-------------------------------

These are instructions to set up an environment in which to work on the
development of SUNET/edusign-app.

We start with a system (only tested on Arch Linux and Debian 10) with npm and
docker and docker-compose (tested with npm 6.14.11, docker engine 20.20.2 or
20.10.2, and docker-compose 1.27.4).

First we clone the repo:

 $ git clone https://github.com/SUNET/edusign-app
 $ cd edusign-app

Then we build the frontside app javascript bundle:

 $ make front-init

Now we want to start building the bundle, and keep building it as we hack at
it.

 $ make front-build-dev

Now we want to run the docker compose environment. For this we need a new
terminal.

 $ cd edusign-app

Then we install the configuration needed for the environment to run. We need
access to some deployment of the eduSign API / sign service, in the form of the
URL of the API / service, the name of a profile for which we have basic auth
credentials, the said credentials, and the entityID of the SP that has driven
the authentication of the user (which needs to be registered with the API).

The default configuration for development is in the `environment-devel` file.
We copy this file to `environment-current` (in the root of the repository, at
the same level as `environment-devel`) and change the settings there. This file
should only contain environment variables with their values (not comments or
anything else).

Essentially, we should only need to change the settings for the eduSign API.
The absolute minimum is to set the basic auth credentials, as values to the
variables `EDUSIGN_API_USERNAME` and `EDUSIGN_API_PASSWORD`. This is assuming
that we are using the API at `https://sig.idsec.se/signint/v1/`, with profile
`edusign-test`, and that we have an account at `https://eduid.se`.

If we are not using the eduSign API settings mentioned above, we would set the
API URL (without any API method) at `EDUSIGN_API_BASE_URL`, the profile name at
`EDUSIGN_API_PROFILE`, the entityID of the authenticating SP at
`SIGN_REQUESTER_ID`, and the entityID of an IdP that is trusted by the API and
in which we have an identity at `DEBUG_IDP`. We might also have to adjust the
attributes used for signing to make sure that they are released by the
`DEBUG_IDP`, at `SIGNER_ATTRIBUTES`.

Finally, we need to edit the file at `docker/test-idp/ldap/users.ldif` to add a
user that has the same attributes and values as our identity in the
`DEBUG_IDP`.

The rest of the env variables in `environment-devel` are there just to have a
different value than in production, and it should not be necessary to change
them.

 $ cp environment-devel environment-current
 $ vim environment-current  # change settings

We now install the configuration, and start the environment.

 $ make config-build
 $ make dev-env-start

This will start a development environment (the 1st time it'll take a while,
since it needs to build all the images) which we can access (locally) at
`https://sp.edusign.docker/sign`.

We can tail the logs with `make logs-tailf <logfile name>`, and list all
possible log files with `make logs-list`.

To check all the commands to help in the development, simply type `make`.
