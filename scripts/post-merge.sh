#!/usr/bin/env bash
set -euo pipefail

# ANGEL SWARM's primary application is static and has no dependency install or
# database migration step. Keep this hook intentionally small so task merges
# still receive a successful, idempotent setup phase before workflow
# reconciliation.
test -f app/index.html