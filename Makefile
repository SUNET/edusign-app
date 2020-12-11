.DEFAULT_GOAL := help

# Document each target with one or more comments prefixed with 2 hashes
# right above the target definition.

ENV_DIR=docker/

FRONT_DIR=frontend/
FRONT_SOURCE=src/

BACK_DIR=backend/
BACK_SOURCE=src/

## -- Configuration commands --

## Build configuration with values from env file (environment-current). If file provided, vars in the diff with environment-devel must be in the environment. Otherwise environment-devel is used.
.PHONY: config-build
config-build:
	if [ ! -f environment-current ]; then cp environment-devel environment-current; fi && \
	  export $(cat environment-current | xargs) && \
		if [ ! -d config-current ]; then mkdir -p config-current/ssl; fi && \
		if [ ! -e config-current/supervisord.conf ]; then cp config-templates/supervisord.conf config-current/supervisord.conf; fi && \
		if [ ! -e config-current/idp-metadata.xml ]; then cp config-templates/idp-metadata.xml config-current/idp-metadata.xml; fi && \
		if [ ! -e config-current/attribute-map.xml ]; then cp config-templates/attribute-map.xml config-current/attribute-map.xml; fi && \
		if [ ! -e config-current/fastcgi.conf ]; then cp config-templates/fastcgi.conf config-current/fastcgi.conf; fi && \
		if [ ! -e config-current/shib_clear_headers ]; then cp config-templates/shib_clear_headers config-current/shib_clear_headers; fi && \
		if [ ! -e config-current/shib_fastcgi_params ]; then cp config-templates/shib_fastcgi_params config-current/shib_fastcgi_params; fi && \
		if [ ! -e config-current/ssl/nginx.crt ]; then cp config-templates/ssl/nginx.crt config-current/ssl/nginx.crt; fi && \
		if [ ! -e config-current/ssl/nginx.key ]; then cp config-templates/ssl/nginx.key config-current/ssl/nginx.key; fi && \
		perl -p -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < config-templates/nginx.conf > config-current/nginx.conf && \
		perl -p -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < config-templates/shibboleth.xml > config-current/shibboleth.xml && \
		perl -p -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < config-templates/environment-compose > docker/.env && \

## -- Docker development environment commands --

## Add needed entries to /etc/hosts if absent
.PHONY: dev-env-prepare
dev-env-prepare:
	@cd $(ENV_DIR); \
    ./prepare.sh

## Start the docker environment, adding entries to /etc/hosts if needed
.PHONY: dev-env-start
dev-env-start: dev-env-prepare
	@cd $(ENV_DIR); \
    docker-compose -f docker-compose-dev.yml rm -s -f; \
    docker-compose -f docker-compose-dev.yml  up --build $*; \
    docker-compose -f docker-compose-dev.yml  logs -tf

## Stop the docker environment
.PHONY: dev-env-stop
dev-env-stop:
	@cd $(ENV_DIR); \
    docker-compose -f docker-compose-dev.yml  rm -s -f; \

## -- Production environment commands --

## -- Front end development commands --

## Initialize the front app development environment
.PHONY: front-init
front-init:
	@cd $(FRONT_DIR); \
		npm install

## Build the front app bundle
.PHONY: front-build
front-build:
	@cd $(FRONT_DIR); \
		cp node_modules/pdfjs-dist/build/pdf.worker.js* build/ ; \
    npm start

## Run the tests for the front side code
.PHONY: front-test
front-test:
	@cd $(FRONT_DIR); \
    npm test

## Extract translatable messages from the sources
.PHONY: front-extract-msgs
front-extract-msgs:
	@cd $(FRONT_DIR); \
    npm run extract-msgs

## Format the front side source code with Prettier
.PHONY: front-prettier
front-prettier:
	@cd $(FRONT_DIR); \
    npm run prettier

## Build developer documentation with jsdoc. Output html to be found at frontend/out/.
.PHONY: front-build-docs
front-build-docs:
	@cd $(FRONT_DIR); \
    npm run build-docs

## -- Back end development commands --

## Initialize the backend development environment
.PHONY: back-init
back-init:
	@cd $(BACK_DIR); \
		python -m venv venv; \
		./venv/bin/python setup.py develop easy_install edusign-webapp[devel]

## Extract translatable messages from the backend sources
.PHONY: back-extract-msgs
back-extract-msgs:
	@cd $(BACK_DIR); \
    ./venv/bin/pybabel extract -F babel.cfg -o messages.pot ./src/ ; \
	./venv/bin/pybabel init -i messages.pot -d translations -l en ; \
	./venv/bin/pybabel init -i messages.pot -d translations -l sv

## Reformat Python sources
.PHONY: back-reformat
back-reformat:
	@cd $(BACK_DIR); \
	./venv/bin/isort --line-width 120 --atomic --project edusign-webapp $(BACK_SOURCE) ; \
	./venv/bin/black --line-length 120 --target-version py38 --skip-string-normalization $(BACK_SOURCE)

## Type check Python sources
.PHONY: back-typecheck
back-typecheck:
	@cd $(BACK_DIR); \
		./venv/bin/mypy --ignore-missing-imports $(BACK_SOURCE)

## Test Python code
.PHONY: back-test
back-test:
	@cd $(BACK_DIR); \
		./venv/bin/pytest --log-cli-level DEBUG $(BACK_SOURCE)

## -- Misc --

## Print this help message
.PHONY: help
help:
	@printf "\nUsage: make <target>\n\nTargets:\n";

	@awk '{ \
			if ($$0 ~ /^.PHONY: [a-zA-Z\-_0-9]+$$/) { \
				helpCommand = substr($$0, index($$0, ":") + 2); \
				if (helpMessage) { \
					printf "\033[36m%-20s\033[0m %s\n", \
						helpCommand, helpMessage; \
					helpMessage = ""; \
				} \
			} else if ($$0 ~ /^[a-zA-Z\-_0-9.]+:/) { \
				helpCommand = substr($$0, 0, index($$0, ":")); \
				if (helpMessage) { \
					printf "\033[36m%-20s\033[0m %s\n", \
						helpCommand, helpMessage; \
					helpMessage = ""; \
				} \
			} else if ($$0 ~ /^##/) { \
				if (helpMessage) { \
					helpMessage = helpMessage"\n                     "substr($$0, 3); \
				} else { \
					helpMessage = substr($$0, 3); \
				} \
			} else { \
				if (helpMessage) { \
					print "\n       "helpMessage"\n" \
				} \
				helpMessage = ""; \
			} \
		}' \
		$(MAKEFILE_LIST)
