#!/usr/bin/env bash
# Local development: plain HTTP on port 8080, no TLS, no Let's Encrypt mount.
set -e
cd "$(dirname "$0")"
docker compose -f docker-compose.yml -f docker-compose.dev.yml "${@:-up -d --build}"
