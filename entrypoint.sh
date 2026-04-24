#!/bin/sh
set -e

if [ -n "$YTDLP_COOKIES" ]; then
  printf '%s' "$YTDLP_COOKIES" > /tmp/cookies.txt
  chmod 600 /tmp/cookies.txt
  export YTDLP_COOKIES_PATH=/tmp/cookies.txt
fi

(cd /prisma-cli && node node_modules/prisma/build/index.js migrate deploy)

export HOSTNAME=0.0.0.0
exec node server.js
