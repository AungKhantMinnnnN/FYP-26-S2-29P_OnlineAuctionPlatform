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

# Debian/Ubuntu 23.04+ (and derivatives) mark the system Python as
# externally managed (PEP 668) and refuse a bare `pip install`. Use an
# isolated venv instead -- works everywhere, never touches system packages.
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    VENV_ERR="$(mktemp)"
    if ! "$PYTHON" -m venv "$VENV_DIR" 2>"$VENV_ERR"; then
        cat "$VENV_ERR" >&2
        rm -f "$VENV_ERR"
        echo >&2
        echo "Failed to create a virtual environment. On Debian/Ubuntu this usually" >&2
        echo "means the venv module needs its own package:" >&2
        echo "  sudo apt install python3-venv" >&2
        echo "(or python3.<X>-venv for your specific version, per the error above)." >&2
        exit 1
    fi
    rm -f "$VENV_ERR"
fi
VENV_PYTHON="$VENV_DIR/bin/python"

echo "Installing dependencies..."
"$VENV_PYTHON" -m pip install --quiet -r requirements.txt

echo "Running backend QA suite..."
exec "$VENV_PYTHON" run_all.py "$@"
