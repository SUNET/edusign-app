.DEFAULT_GOAL := help

# Document each target with one or more comments prefixed with 2 hashes
# right above the target definition.

ENV_DIR=docker/

FRONT_DIR=frontend/
FRONT_SOURCE=src/

BACK_DIR=backend/

## -- Docker environment commands --

## Add needed entries to /etc/hosts if absent
.PHONY: env-prepare
env-prepare:
	@cd $(ENV_DIR); \
    ./prepare.sh

## Start the docker environment, adding entries to /etc/hosts if needed
.PHONY: env-start
env-start: env-prepare
	@cd $(ENV_DIR); \
    docker-compose  rm -s -f; \
    docker-compose  up --build $*; \
    docker-compose  logs -tf

## Stop the docker environment
.PHONY: env-stop
env-stop:
	@cd $(ENV_DIR); \
    docker-compose  rm -s -f; \

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
    pybabel extract -F babel.cfg -o messages.pot ./src/ ; \
	pybabel init -i messages.pot -d translations -l en ; \
	pybabel init -i messages.pot -d translations -l sv

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
