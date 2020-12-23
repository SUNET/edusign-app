
EduSign front side integration
==============================

Front end to use the eduSign document signing service.

Most development and deployment tasks are provided as make commands; type `make
help` at the root of the repository to find out about them.

For the operator
----------------

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
* An SSL certificate.
* A SAML2 IdP/federation ready to integrate our SP metadata.
* A clone of the SUNET/eduisign-app repository in the server.

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

HOSTNAME
    String. FQDN for the service. Default: sp.edusign.docker

SHIB_SP_ENTITY_ID
    String. SAML2 Entity ID of the service as an SP. Default: https://sp.edusign.docker/shibboleth

SHIB_IDP_ENTITY_ID
    String. SAML2 Entity ID of the (test?) IdP. Default: https://idptestbed/idp/shibboleth


SP_HOSTNAME
    String. FQDN for the service. Default: sp.edusign.docker

WEBAPP_HOSTNAME
    String. FQDN for the wsgi app in the docker network (??). Default: www.edusign.docker

FLASK_ENV
    String (development or production). Indicate what environment is being used. Default: production

SECRET_KEY
    String. Key to use for encryption, e.g. for the session. Default: supersecret

SESSION_COOKIE_DOMAIN
    String. Domain for the cookie. Default: sp.edusign.docker

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
