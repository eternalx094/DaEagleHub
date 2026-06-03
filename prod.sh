#!/usr/bin/env bash
# Production: HTTPS on 443 with Let's Encrypt cert mount, HTTP 80 redirects to HTTPS.
set -e
cd "$(dirname "$0")"
docker compose -f docker-compose.yml -f docker-compose.prod.yml "${@:-up -d --build --force-recreate}"
