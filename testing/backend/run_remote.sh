#!/usr/bin/env bash
# Syncs this test suite to a remote host over SSH and runs it there, then
# cleans up. Exists because a Python-less dev machine (e.g. a bare Windows
# box) can't run run_tests.sh/.ps1 directly, but can reach a host that has
# Python 3 + `requests` already — e.g. the shared VM this suite defaults to
# targeting (it ships with both, per its own OS packages).
#
# Usage:
#   ./run_remote.sh                      # sync + run everything on the default host
#   ./run_remote.sh test_auth.py          # run just one module remotely
#   REMOTE_HOST=myvm ./run_remote.sh
#   QA_RUN_LIVE_AFFECTING_TESTS=1 ./run_remote.sh test_marketing.py
#   KEEP_REMOTE_DIR=1 ./run_remote.sh    # leave the synced copy in place afterward
#
# Requires: an `ssh`/`scp`-reachable host (default alias below), already able
# to run `python3` and `pip install requests` (or already has it installed).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

REMOTE_HOST="${REMOTE_HOST:-fyp}"
REMOTE_DIR="${REMOTE_DIR:-/tmp/backend_qa_suite}"
KEEP_REMOTE_DIR="${KEEP_REMOTE_DIR:-0}"

echo "Target host: $REMOTE_HOST"
echo "Remote dir : $REMOTE_DIR"

ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

echo "Syncing test suite..."
scp -q ./*.py requirements.txt "$REMOTE_HOST:$REMOTE_DIR/"

echo "Ensuring dependencies are installed remotely..."
ssh "$REMOTE_HOST" "cd '$REMOTE_DIR' && python3 -m pip install --quiet -r requirements.txt"

# Forward any QA_* env vars set locally (e.g. QA_RUN_LIVE_AFFECTING_TESTS, QA_BASE_URL)
# so `FOO=bar ./run_remote.sh` behaves the same as it would running locally.
env_forward=()
while IFS='=' read -r name _; do
    [[ "$name" == QA_* ]] || continue
    env_forward+=("$name=${!name}")
done < <(env)

echo "Running suite on $REMOTE_HOST..."
exit_code=0
ssh "$REMOTE_HOST" "cd '$REMOTE_DIR' && env ${env_forward[*]} python3 run_all.py $*" || exit_code=$?

echo "Fetching generated report(s)..."
mkdir -p ./reports
scp -q "$REMOTE_HOST:$REMOTE_DIR/reports/backend_test.*.md" ./reports/ 2>/dev/null || true

if [[ "$KEEP_REMOTE_DIR" != "1" ]]; then
    echo "Cleaning up remote scratch dir..."
    ssh "$REMOTE_HOST" "rm -rf '$REMOTE_DIR'"
else
    echo "Left synced copy at $REMOTE_HOST:$REMOTE_DIR (KEEP_REMOTE_DIR=1)"
fi

exit "$exit_code"
