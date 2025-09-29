# Changelog

## 0.6.3 - Fix join room button and message streaming
- **Bugfix**: Fix join room button not updating state after successful join
- **Bugfix**: Fix missing message streaming after sending room messages
- **SSE**: Update server JSON patch to include joinedUserId in room_updated events
- **Client**: Update SSE handler to properly pass joinedUserId to room:updated events
- **Version**: Bump to 0.6.3 (monorepo)

## 0.6.2 - User registration on Users page
- **Registration**: Add user registration form directly on Users page
- **UI**: "Register New User" button with collapsible form
- **Integration**: Connected to AuthService with error handling and loading states
- **Refresh**: Users list automatically refreshes after successful registration
- **Version**: Bump to 0.6.2 (monorepo), 0.5.2 (frontend)

## 0.6.1 - Theme color customization
- **Themes**: Add 5 color themes (blue, red, green, yellow, purple) in settings
- **UI**: Theme color dropdown in Appearance section alongside dark mode toggle
- **Persistence**: Theme color and dark mode stored separately in localStorage
- **CSS**: Dynamic color variables for all theme colors
- **Version**: Bump to 0.6.1 (monorepo), 0.5.1 (frontend)

## 0.6.0 - SSE version streaming and auto-reload
- **SSE**: Send version information through SSE stream on connection
- **Auto-reload**: Page automatically reloads if version changes after reconnection
- **Version**: Bump to 0.6.0 (monorepo), 0.5.0 (frontend), 0.1.1 (SDK)
- **Reliability**: Ensures users always have the latest version after reconnection

## 0.5.9 - SDK version tracking
- **Version**: Add separate SDK version tracking alongside frontend version
- **UI**: Display both frontend and SDK versions in VersionBadge, AuthForm, and VersionPage
- **SDK**: Create separate SDK package with its own version
- **Format**: Show `repo:X.X.X | frontend:X.X.X | sdk:X.X.X` format

## 0.5.8 - Database persistence fix
- **Database**: Fix server startup to use CREATE TABLE IF NOT EXISTS instead of dropping tables
- **Persistence**: Users and data now persist across deploys and restarts
- **Bugfix**: Resolve issue where users had to re-register after every deploy

## 0.5.7 - Settings UI improvements
- **UI**: Move "Switch between dark and light mode" description under Dark Mode toggle instead of Appearance section
- **Settings**: Better organization of dark mode settings with clearer labeling

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
