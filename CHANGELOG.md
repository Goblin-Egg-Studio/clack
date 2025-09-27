# Changelog

## 0.3.0 - Rooms ownership, MCP/SSE upgrades, UI polish
- Add room ownership model: creator is owner; owner can transfer or delete
- Backend: new MCP tools `change_room_owner`, `delete_room`; ChatService methods; SSE events `room_owner_changed`, `room_deleted`
- Client SDK: add methods for ownership actions; event handling added
- Hook/UI: owner controls in `/rooms`, inline transfer select with OK/Cancel; create room UX tweaks
- Sidebar: collapsibles show +/-, empty-state messages when opened
- Security: confirm bcrypt password hashing during auth (hash + compare)
- Bugfixes: resilient SSE handlers, safer maps/filters, cleaned old routes

## 0.2.0 - Static React chat + env + SPA fallback
- Add static React chat app built with Bun bundler
- Add SPA fallback and /env.js injection in server
- Add README and improved fetch script for SpaceTimeDB

## 0.1.0 - Initial monorepo setup
- Initialize Bun project and scripts
- Add SpaceTimeDB scaffold and fetch script
- Add client build with esbuild
- Add GitHub Actions deploy workflow
- Add systemd service template
- Add Makefile for dev/build commands
