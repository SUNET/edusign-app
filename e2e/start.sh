#!/usr/bin/env sh

. users-env

npx playwright test --project=chromium "$@"
