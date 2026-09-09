#!/usr/bin/env bash
set -euo pipefail

# ANGEL SWARM is a dependency-free static application. There are no packages
# or migrations to reconcile after a task merge; verify the served entrypoint
# exists so a malformed merge fails explicitly instead of silently succeeding.
test -f app/index.html
echo "Post-merge setup complete: static application entrypoint is present."