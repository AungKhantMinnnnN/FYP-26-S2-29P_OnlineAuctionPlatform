#!/usr/bin/env bash
# Runs on the VM as root via a scoped sudoers rule (see .github/workflows/deploy.yml
# and the ghrunner setup notes). This is the tracked source of truth for that
# script -- the live copy at /usr/local/bin/deploy_auction.sh must be root-owned
# and mode 700 outside the repo checkout, so it has to be synced there by hand
# after any change here (there's no bootstrap step that does this automatically).
set -euo pipefail
cd /root/apps/auction-dev
git fetch origin
git reset --hard origin/development
docker compose --project-directory /root/apps/auction-dev -f /root/apps/auction-dev/docker-compose.yml up -d --build
docker image prune -f
# Builder cache grows unbounded with --build on every deploy (this is what filled the
# VM disk to 85% before); keep the last week of cache and drop anything older.
docker builder prune -f --filter "until=168h"
