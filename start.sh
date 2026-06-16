#!/bin/sh
set -e
mkdir -p "$PGDATA" /run/postgresql
chown -R postgres:postgres "$PGDATA" /run/postgresql
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  su-exec postgres initdb -U postgres -D "$PGDATA" >/dev/null
fi
su-exec postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='127.0.0.1'" -w start
su-exec postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='agentsphere'" | grep -q 1 \
  || su-exec postgres psql -c "CREATE USER agentsphere WITH PASSWORD 'agentsphere' SUPERUSER;"
su-exec postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='agentsphere'" | grep -q 1 \
  || su-exec postgres psql -c "CREATE DATABASE agentsphere OWNER agentsphere;"
exec node_modules/.bin/concurrently -k -n policy,runtime,orch,gw \
  "node services/mcp-policy/src/index.js" \
  "node services/agent-runtime/src/index.js" \
  "node services/orchestrator/src/index.js" \
  "node services/gateway/src/index.js"
