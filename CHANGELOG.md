# Changelog

## 0.5.6 - Database persistence and version display improvements
- **Database**: Fix systemd service to only update code when changes exist, preserving database across restarts
- **Version**: Display both repo and client versions in VersionBadge and login screen
- **UI**: Show `repo:0.5.6 | client:0.4.6` format for better version visibility
- **Reliability**: Prevent database clearing on every service restart

## 0.5.5 - Database persistence and version fixes
- **Database**: Move database to persistent location `/opt/clack/data/chat.db` to survive deploys
- **Service**: Rename systemd service from `mygame.service` to `clack.service`
- **Version**: Fix version service method names and add `/version` route with VersionPage component
- **Setup**: Ensure data directory exists before creating database
- **Bugfix**: Update all components to use correct `getVersionInfo()` method

## 0.5.4 - Native EventSource
- **Refactor**: Remove LaunchDarkly EventSource and use native browser EventSource

## 0.5.3 - Bugfixes and watchdog
- **Bugfix**: Default client baseUrl to window.location.origin to fix Invalid URL during registration
- **Ops**: Add `/__health` endpoint, watchdog script, and systemd timer to auto-restart on failure

## 0.5.2 - Switch SSE client to LaunchDarkly EventSource
- **Reliability**: Use `launchdarkly-eventsource` for robust SSE handling with timeouts

## 0.5.1 - Fix Settings notification selector
- **Bugfix**: Restore missing `getAvailableSounds` helper used by Settings notifications page

## 0.5.0 - Dark theme + automatic version display
- **UI**: Add dark theme with toggle in Settings (persists to localStorage)
- **Accessibility**: Improve input contrast and placeholders for dark mode
- **DX**: Auto version badge sourced from server `/__version` endpoint
- **Refactor**: Centralize version badge as `VersionBadge` component

## 0.4.0 - Pure API deployment, security hardening, automated setup
- **Deployment**: Replace SSH-based deployment with pure Linode API approach using user data
- **Security**: Add fail2ban, SSH hardening, disable password auth, disable root login
- **Setup**: Make setup script idempotent and safe to rerun from any point
- **Documentation**: Comprehensive deployment instructions with Linode API token setup
- **Cleanup**: Add SSH cleanup script for transitioning to API-based deployment
- **Reliability**: Remove SSH dependencies, use Linode's infrastructure for deployment

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
