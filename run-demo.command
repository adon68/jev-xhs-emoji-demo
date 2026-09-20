#!/bin/bash
cd "/Users/honglei/Documents/jev-emoji-demo"
export PATH="/Users/honglei/.nvm/versions/node/v24.13.0/bin:$PATH"
# free port if stale
lsof -nP -iTCP:8787 -sTCP:LISTEN -t 2>/dev/null | xargs kill 2>/dev/null
sleep 0.2
echo "Starting Jev emoji demo on http://127.0.0.1:8787 ..."
echo "Keep this Terminal window open."
open "http://127.0.0.1:8787/?v=15"
exec "/Users/honglei/.nvm/versions/node/v24.13.0/bin/node" server.js
