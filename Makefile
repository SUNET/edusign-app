.DEFAULT_GOAL := help

# Document each target with one or more comments prefixed with 2 hashes
# right above the target definition.

ENV_DIR=docker/

FRONT_DIR=frontend/
FRONT_SOURCE=src/

BACK_DIR=backend/
BACK_SOURCE=src/

# Get any extra command line arguments
args=`arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

## -- Configuration commands --

## Build configuration with values from env file (environment-current). If file provided, vars in the diff with the environment-devel provided file must be in the environment. Otherwise environment-devel is used.
.PHONY: config-build
config-build:
	@if [ ! -f environment-current ]; then cp environment-devel environment-current; fi && \
	  if ! grep -q 'DUMMY=dummy' environment-current; then export $$(cat environment-current | xargs); fi && \
		if [ ! -d config-current ]; then mkdir -p config-current/ssl; fi && \
		if [ ! -e config-current/supervisord.conf ]; then cp config-templates/supervisord.conf config-current/supervisord.conf; fi && \
		if [ ! -e config-current/idp-metadata.xml ]; then cp config-templates/idp-metadata.xml config-current/idp-metadata.xml; fi && \
		if [ ! -e config-current/attribute-map.xml ]; then cp config-templates/attribute-map.xml config-current/attribute-map.xml; fi && \
		if [ ! -e config-current/fastcgi.conf ]; then cp config-templates/fastcgi.conf config-current/fastcgi.conf; fi && \
		if [ ! -e config-current/shib_clear_headers ]; then cp config-templates/shib_clear_headers config-current/shib_clear_headers; fi && \
		if [ ! -e config-current/shib_fastcgi_params ]; then cp config-templates/shib_fastcgi_params config-current/shib_fastcgi_params; fi && \
		if [ ! -e config-current/ssl/nginx.crt ]; then cp config-templates/ssl/nginx.crt config-current/ssl/nginx.crt; fi && \
		if [ ! -e config-current/ssl/nginx.key ]; then cp config-templates/ssl/nginx.key config-current/ssl/nginx.key; fi && \
		if [ ! -e config-current/ssl/sp-cert.pem ]; then cp config-templates/ssl/sp-cert.pem config-current/ssl/sp-cert.pem; fi && \
		if [ ! -e config-current/ssl/sp-key.pem ]; then cp config-templates/ssl/sp-key.pem config-current/ssl/sp-key.pem; fi && \
		if [ ! -e config-current/shibd.logger ]; then cp config-templates/shibd.logger config-current/shibd.logger; fi && \
		if [ ! -e config-current/users.ldif ]; then cp config-templates/users.ldif config-current/users.ldif; fi && \
		if [ ! -e config-current/nginx.conf ]; then perl -p -e 's/\$$\{([^}]+)\}/defined $$ENV{$$1} ? $$ENV{$$1} : $$&/eg' < config-templates/nginx.conf > config-current/nginx.conf; fi && \
		if [ ! -e config-current/shibboleth2.xml ]; then perl -p -e 's/\$$\{([^}]+)\}/defined $$ENV{$$1} ? $$ENV{$$1} : $$&/eg' < config-templates/shibboleth2.xml > config-current/shibboleth2.xml; fi && \
		if [ -e config-current/users.ldif ]; then cp config-current/users.ldif docker/test-idp/ldap/; fi && \
		perl -p -e 's/\$$\{([^}]+)\}/defined $$ENV{$$1} ? $$ENV{$$1} : $$&/eg' < config-templates/environment-compose > docker/.env && \
		cp -Rp config-current docker/edusign/

## Build configuration with values from the environment. All env variables present in the provided environment-devel file must be present in the environment.
.PHONY: config-build-from-env
config-build-from-env:
	@echo "DUMMY=dummy" > environment-current
	config-build

## Remove built configuration (NOTE that this command will remove anything provided in ./config-current/).
.PHONY: config-clean
config-clean:
	@rm -rf config-current/ docker/edusign/config-current/ docker/.env

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

## Start the docker environment
.PHONY: pro-env-start
pro-env-start:
	@cd $(ENV_DIR); \
    docker-compose rm -s -f; \
    docker-compose up --build --detach

## Stop the docker environment
.PHONY: pro-env-stop
pro-env-stop:
	@cd $(ENV_DIR); \
    docker-compose rm -s -f; \

## -- Logging commands --

## Tail some log file
.PHONY: logs-tailf
logs-tailf:
	@docker run -it --rm --init -v edusignlogs:/var/log/edusign debian:buster bash -c "tail -F /var/log/edusign/*$(call args)*"

## List available log files
.PHONY: logs-list
logs-list:
	@docker run -it --rm --init -v edusignlogs:/var/log/edusign debian:buster bash -c "ls /var/log/edusign/"

## -- Front end development commands --

## Initialize the front app development environment
.PHONY: front-init
front-init:
	@cd $(FRONT_DIR); \
		npm install

## Build the development front app bundle
.PHONY: front-build-dev
front-build-dev:
	@cd $(FRONT_DIR); \
		cp node_modules/pdfjs-dist/build/pdf.worker.js* build/ ; \
    npm start

## Build the production front app bundle
.PHONY: front-build-pro
front-build-pro:
	@cd $(FRONT_DIR); \
		cp node_modules/pdfjs-dist/build/pdf.worker.js* build/ ; \
    npm run build-pro

## Clean the production front app build stuff
.PHONY: front-clean-pro
front-clean-pro:
	@cd $(FRONT_DIR); \
		rm -rf node_modules

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
