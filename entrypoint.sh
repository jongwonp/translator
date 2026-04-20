#!/bin/sh
set -e

(cd /prisma-cli && node node_modules/prisma/build/index.js migrate deploy)

export HOSTNAME=0.0.0.0
exec node server.js
