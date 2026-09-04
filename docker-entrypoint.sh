#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
bun run db:migrate || {
  echo "[entrypoint] Migration failed. Halting startup."
  exit 1
}

echo "[entrypoint] Starting UMBC application server..."
exec bun src/server/index.ts
