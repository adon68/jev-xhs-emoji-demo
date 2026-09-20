#!/bin/bash
cd "$(dirname "$0")"
export PATH="/Users/honglei/.nvm/versions/node/v24.13.0/bin:$PATH"
exec node server.js
