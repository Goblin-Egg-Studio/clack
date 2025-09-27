# Clack Chat (Bun + React + SpaceTimeDB)

Simple static React chat app served by Bun. SpaceTimeDB reducers power the backend (no REST API).

## Prerequisites
- Bun installed
- Linux/macOS

## Install
```bash
# From repo root
bun install
```

## Fetch SpaceTimeDB binary
```bash
./scripts/fetch-spacetimedb.sh
```

## Build client
```bash
cd client && bun install && bun run build && cp index.html dist/
```

## Run locally
```bash
# In repo root
bun run server.ts
# App: http://localhost:3000
# Health: http://localhost:3000/health
```

## Config
- Server injects `/env.js` with:
  - STDB_URL (default: ws://localhost:3001)
  - STDB_MODULE (default: chat)

Set environment variables before starting:
```bash
STDB_URL=ws://127.0.0.1:3001 STDB_MODULE=chat bun run server.ts
```

## SpaceTimeDB
- Schema: `server/schema.sql`
- Reducers: `server/main.ts` (join, send_message, delete_message)

## Deploy
- GitHub Actions: `.github/workflows/deploy.yml`
- Systemd template: `systemd/mygame.service`




