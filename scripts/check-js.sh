#!/usr/bin/env bash
# Lightweight JS syntax checker using node if available.
set -e
JS_FILES=$(git ls-files '*.js' | grep -v '^static/js/app-core.js' || true)
if [ -z "$JS_FILES" ]; then
  echo "No JS files to check."
  exit 0
fi
if command -v node >/dev/null 2>&1; then
  echo "Using node to check JS syntax..."
  FAILED=0
  for f in $JS_FILES; do
    echo "Checking $f"
    if ! node --check "$f" 2>/dev/null; then
      echo "Syntax error in $f" >&2
      node --check "$f" || true
      FAILED=1
    fi
  done
  if [ "$FAILED" -ne 0 ]; then
    echo "JS syntax check failed." >&2
    exit 2
  fi
  echo "JS syntax check passed."
else
  echo "node not found; skipping JS syntax check. Install node to enable checks." >&2
  exit 0
fi
