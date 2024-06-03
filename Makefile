.DEFAULT_GOAL := help

# Document each target with one or more comments prefixed with 2 hashes
# right above the target definition.

ENV_DIR=docker/

FRONT_DIR=frontend/
FRONT_SOURCE=src/

BACK_DIR=backend/
BACK_SOURCE=src/

E2E_DIR=e2e/

DOCS_DIR=docs/

# Get any extra command line arguments
args=`arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

## -- Docker development environment commands --

## Start the docker environment, adding entries to /etc/hosts if needed
.PHONY: dev-env-start
dev-env-start:
	@cd $(ENV_DIR); \
    docker-compose -f docker-compose-dev.yml rm -s -f; \
    docker-compose -f docker-compose-dev.yml up --build

## Stop the docker environment
.PHONY: dev-env-stop
dev-env-stop:
	@cd $(ENV_DIR); \
    docker-compose -f docker-compose-dev.yml  rm -s -f; \

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
		cp node_modules/pdfjs-dist/build/pdf.worker* build/ ; \
    npm start

## Build the production front app bundle
.PHONY: front-build-pro
front-build-pro:
	@cd $(FRONT_DIR); \
		cp node_modules/pdfjs-dist/build/pdf.worker* build/ ; \
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
		pip install -r test_requirements.txt; \
		python setup.py develop

## Extract initial translatable messages from the backend sources
.PHONY: back-init-msgs
back-init-msgs:
	@cd $(BACK_DIR); \
    pybabel extract -F src/edusign_webapp/babel.cfg -o src/edusign_webapp/messages.pot ./src/ ; \
	pybabel init -i src/edusign_webapp/messages.pot -d src/edusign_webapp/translations -l en ; \
	pybabel init -i src/edusign_webapp/messages.pot -d src/edusign_webapp/translations -l sv ; \
	pybabel init -i src/edusign_webapp/messages.pot -d src/edusign_webapp/translations -l es

## Extract translatable messages from the backend sources
.PHONY: back-extract-msgs
back-extract-msgs:
	@cd $(BACK_DIR); \
    pybabel extract -F src/edusign_webapp/babel.cfg -o src/edusign_webapp/messages.pot ./src/ ; \
	pybabel update -i src/edusign_webapp/messages.pot -d src/edusign_webapp/translations

## Compile translatable messages
.PHONY: back-compile-msgs
back-compile-msgs:
	@cd $(BACK_DIR); \
	pybabel compile -f -d src/edusign_webapp/translations

## Reformat Python sources
.PHONY: back-reformat
back-reformat:
	@cd $(BACK_DIR); \
	isort --line-width 120 --atomic --project edusign-webapp $(BACK_SOURCE) ; \
	black --line-length 120 --target-version py38 --skip-string-normalization $(BACK_SOURCE)

## Type check Python sources
.PHONY: back-typecheck
back-typecheck:
	@cd $(BACK_DIR); \
		mypy --ignore-missing-imports $(BACK_SOURCE)

## Test Python code
.PHONY: back-test
back-test:
	@cd $(BACK_DIR); \
		pytest --log-cli-level DEBUG $(BACK_SOURCE) ; \
		coverage html

## Build e2e tests
.PHONY: e2e-build
e2e-build:
	@cd $(E2E_DIR); \
		npx playwright codegen dev.edusign.sunet.se

## Run e2e tests with chromium
.PHONY: e2e-chromium
e2e-chromium:
	@cd $(E2E_DIR); \
		source ./users-env; \
		npx playwright test --headed  --project chromium

## Run e2e quietly tests with chromium
.PHONY: e2e-chromium-q
e2e-chromium-q:
	@cd $(E2E_DIR); \
		source ./users-env; \
		npx playwright test  --project chromium

## Run e2e tests with firefox
.PHONY: e2e-firefox
e2e-firefox:
	@cd $(E2E_DIR); \
		source ./users-env; \
		npx playwright test --headed  --project firefox

## Run e2e tests
.PHONY: e2e-all
e2e-all:
	@cd $(E2E_DIR); \
		source ./users-env; \
		npx playwright test


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
