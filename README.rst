
EduSign front side integration
==============================

Front end to use the eduSign document signing service.

Here I will provide instructions to deploy a development environment to
hack at the project.

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
