#!/bin/bash

set -e
set -x

echo "Start building js bundle..."

npm install

mkdir -p build

cp node_modules/pdfjs-dist/build/pdf.worker.* build

npm start
