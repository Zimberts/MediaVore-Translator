#!/usr/bin/env bash
set -euo pipefail
echo "Running tests..."
node "$(dirname "$0")/parser.test.js"
echo "Tests finished."
