#!/usr/bin/env bash
# Local entry point: installs dependencies (if needed) and runs the frontend
# unit/component test suite (Vitest + React Testing Library). Everything runs
# in jsdom against mocked HTTP clients -- no live backend, no real network
# calls, and no test data is ever written anywhere (see TESTING.md).
#
# Usage:
#   ./run_tests.sh                          # run everything
#   ./run_tests.sh src/api/authApi.test.ts   # run just one file
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$HERE/../../frontend"

if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found -- install Node.js 20+ first." >&2
    exit 1
fi

cd "$FRONTEND_DIR"

echo "Using $(node --version) / $(npm --version)"
echo "Installing dependencies..."
npm ci --quiet

echo "Running frontend test suite..."
RAW_JSON="$(mktemp)"
trap 'rm -f "$RAW_JSON"' EXIT

set +e
npx vitest run --reporter=default --reporter=json --outputFile.json="$RAW_JSON" "$@"
STATUS=$?
set -e

node "$HERE/report.mjs" "$RAW_JSON"
exit "$STATUS"
