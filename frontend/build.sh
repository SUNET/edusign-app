#!/bin/bash

set -e
set -x

cd /opt/frontend

npm install
npm run build-pro

rm -rf node_modules

echo "Built js bundle, stopping container..."
