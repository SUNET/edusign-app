#!/bin/bash

set -e
set -x

rm -rf /opt/jsbuild/*

cp -R /opt/frontend/build/* /opt/jsbuild/

echo "Built js bundle, stopping container..."
