#!/usr/bin/env bash
# Local/portable entry point: installs dependencies (if needed) and runs the
# full backend QA suite on whatever machine this is invoked from. Requires a
# real Python 3 interpreter — see run_remote.sh if this machine doesn't have
# one (e.g. a bare Windows box) but you can reach a Linux host that does.
#
# Usage:
#   ./run_tests.sh                  # run everything against config.py's default target
#   ./run_tests.sh test_auth.py     # run just one module
#   QA_BASE_URL=http://localhost:8000/v1.0.0 ./run_tests.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
    PYTHON=python
fi
if ! command -v "$PYTHON" >/dev/null 2>&1; then
    echo "No Python interpreter found (tried python3, python)." >&2
    echo "Install Python 3.9+, or run this suite on a host that has it — see run_remote.sh." >&2
    exit 1
fi

echo "Using $("$PYTHON" --version 2>&1) at $(command -v "$PYTHON")"
echo "Installing dependencies..."
"$PYTHON" -m pip install --quiet -r requirements.txt

echo "Running backend QA suite..."
exec "$PYTHON" run_all.py "$@"
