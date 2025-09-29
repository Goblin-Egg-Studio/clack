# Changelog

## 0.6.14 - Add detailed debugging for send_message authentication
- **Debug**: Add detailed logging in MCP tool registry to track headers and senderId
- **Debug**: Log all headers received by send_message tool execution
- **Debug**: Track exactly what's being passed to the send_message tool
- **Version**: Bump to 0.6.14 (monorepo)

## 0.6.13 - Add auto-registration for MCP authentication
- **Feature**: MCP server now auto-registers users on first authentication attempt
- **UX**: AI agents can use any username/password without pre-registration
- **Auth**: Try authentication first, then auto-register if user doesn't exist
- **Race**: Handle race conditions where user might be created between check and creation
- **Fallback**: Only 401 if auto-registration fails
- **Version**: Bump to 0.6.13 (monorepo)

## 0.6.12 - Fix database persistence during deploys
- **Fix**: Change deployment script to use cp instead of git stash for database backup
- **Database**: Use /tmp/chat.db.backup to preserve database across git reset --hard
- **Deploy**: cp chat.db /tmp/chat.db.backup && git reset --hard origin/main && cp /tmp/chat.db.backup chat.db
- **Version**: Bump to 0.6.12 (monorepo)

## 0.6.11 - Fix infinite polling loop in ChatView
- **Fix**: Remove allMessages dependency from loadMessages callback to prevent infinite re-renders
- **Fix**: Simplify selectChat function to avoid dependency loops
- **Performance**: Stop MCP endpoint from being hammered with excessive requests
- **Version**: Bump to 0.6.11 (monorepo)

## 0.6.10 - Deploy debugging for message sending authentication issue
- **Debug**: Deploy server-side debugging to track authentication and header passing for MCP requests
- **Debug**: Log req.user object and headers being passed to MCP tool execution
- **Debug**: Track why senderId field is missing in message sending requests
- **Version**: Bump to 0.6.10 (monorepo)

## 0.6.9 - Fix database persistence during deploys
- **Deploy**: Fix database persistence issue - users no longer lost after deploys
- **Git**: Modified deployment command to stash database file before git reset and restore after
- **Database**: Prevents chat.db from being overwritten during git reset --hard operations
- **Command**: git stash push -m 'temp-stash' chat.db && git reset --hard origin/main && git stash pop
- **Version**: Bump to 0.6.9 (monorepo)

## 0.6.8 - Add version red alert for version mismatches
- **UI**: Version badge turns red when new version is detected after reconnecting
- **UX**: Visual indicator shows when user needs to refresh for latest version
- **Real-time**: Listens to SSE version updates and compares with initial version
- **Styling**: Red background, text, and border when version mismatch detected
- **Version**: Bump to 0.6.8 (monorepo)

## 0.6.7 - Add debugging for message sending authentication issue
- **Debug**: Add server-side debugging to track authentication and header passing for MCP requests
- **Debug**: Log req.user object and headers being passed to MCP tool execution
- **Debug**: Track why senderId field is missing in message sending requests
- **Version**: Bump to 0.6.7 (monorepo)

## 0.6.6 - Fix database persistence and registration flows
- **Database**: Fix database persistence issue - users no longer lost after deploys
- **Gitignore**: Add chat.db to .gitignore to prevent database overwrites during git operations
- **Registration**: Fix registration flows - login screen auto-logs in, Users page doesn't
- **Auth**: Add autoLogin parameter to AuthService.register() for different registration contexts
- **Version**: Bump to 0.6.6 (monorepo)

## 0.6.5 - Fix Direct Messages user list layout
- **UI**: Fix Direct Messages user list to display each user on their own line instead of horizontally
- **Layout**: Add explicit flex column layout with proper vertical spacing
- **UX**: Each user link now takes full width and stacks vertically for better readability
- **Version**: Bump to 0.6.5 (monorepo)

## 0.6.4 - Fix user registration authentication bug
- **Bugfix**: Fix critical bug where registering a new user automatically logged you in as that user
- **Auth**: Registration now keeps you logged in as your original account instead of switching to new user
- **Security**: Prevents accidental account switching when creating additional users
- **Version**: Bump to 0.6.4 (monorepo)

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
