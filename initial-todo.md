Absolutely — here’s your **Cursor-ready TODO checklist** for converting your Vercel project into a **standalone Bun-hosted monorepo**, with SpaceTimeDB and CI all running on a Linode box.

This is designed for **fast local dev**, **no third-party platforms**, and **clean CI/CD** via GitHub Actions + SSH.

---

````md
# ✅ STANDALONE MONOREPO: BUN + SPACETIMEDB + LINODE DEPLOY

## 📁 1. Directory Structure
- [ ] Create folders:
  - `/client` → for frontend (Vite, Next, etc.)
  - `/server` → for SpaceTimeDB backend
  - `/shared` → for shared TypeScript code
  - `/scripts` → for setup scripts
  - `/bin` → for downloaded `spacetimedb` binary

## 🛠️ 2. Bun Setup
- [ ] Initialize Bun project at the root: `bun init`
- [ ] Set `"type": "module"` in root `package.json`
- [ ] Install dependencies:
  ```bash
  bun add express serve-static esbuild chokidar
````

## 🌐 3. Create `server.ts` in project root

* [ ] Serve static files from `client/dist`
* [ ] Auto-run SpaceTimeDB server binary using `child_process.spawn`
* [ ] Include health check route

```ts
// server.ts
import { spawn } from 'child_process';
import express from 'express';
import serveStatic from 'serve-static';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

const __dirname = new URL('.', import.meta.url).pathname;
const clientPath = path.join(__dirname, 'client/dist');

app.use(serveStatic(clientPath));
app.get('/health', (_, res) => res.send('ok'));

const spacetimedb = spawn('./bin/spacetimedb', ['run', 'server'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

app.listen(port, () => {
  console.log(`🚀 App running at http://localhost:${port}`);
});
```

## 🧠 4. SpaceTimeDB Setup

* [ ] Create `/server/spacetimedb.toml`, `/server/schema.sql`, `/server/main.ts`
* [ ] Write basic table: `CREATE TABLE players (...)`

## 🧰 5. Add `scripts/fetch-spacetimedb.sh`

```bash
#!/bin/bash
set -e
VERSION="v0.10.1"
PLATFORM="$(uname | tr '[:upper:]' '[:lower:]')"

if [[ "$PLATFORM" == "darwin" ]]; then
  ARCHIVE="spacetimedb-$VERSION-macos-x86_64.tar.gz"
else
  ARCHIVE="spacetimedb-$VERSION-linux-x86_64.tar.gz"
fi

curl -L "https://github.com/spacetime-db/spacetimedb/releases/download/$VERSION/$ARCHIVE" -o $ARCHIVE
tar -xzf $ARCHIVE
chmod +x spacetimedb
mkdir -p bin
mv spacetimedb bin/
rm $ARCHIVE
```

* [ ] Make executable: `chmod +x scripts/fetch-spacetimedb.sh`
* [ ] Add to `.gitignore`:

```gitignore
/bin/spacetimedb
```

## 🧪 6. GitHub Actions CI/CD

* [ ] Create `.github/workflows/deploy.yml`

```yaml
name: Deploy to Linode

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: SSH Deploy to Linode
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            cd /opt/mygame
            git pull
            ./scripts/fetch-spacetimedb.sh
            bun install
            bun run build
            systemctl restart mygame
```

## 🖥️ 7. Local Dev + Build Commands

* [ ] Add `justfile` or `Makefile`:

```makefile
dev:
	bun run server.ts

build:
	cd client && bun run build
	./bin/spacetimedb build server
```

## ⚙️ 8. `systemd` Unit File for Linode

* [ ] Create `/etc/systemd/system/mygame.service`:

```ini
[Unit]
Description=SpaceTimeDB Game Server
After=network.target

[Service]
WorkingDirectory=/opt/mygame
ExecStart=/usr/bin/env bun server.ts
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

* [ ] Enable and start:

```bash
sudo systemctl daemon-reexec
sudo systemctl enable mygame
sudo systemctl start mygame
```

## 🔐 9. GitHub Secrets

* [ ] Add these to GitHub repo settings:

  * `LINODE_HOST` (IP or domain)
  * `LINODE_USER` (typically `root`)
  * `LINODE_SSH_KEY` (private key for deploy access)

## 🧪 10. Done When:

* [ ] You can push to `main` and auto-deploy to Linode
* [ ] SpaceTimeDB is running via `systemd`
* [ ] Game loads at your Linode IP or domain
* [ ] All code lives in one repo, no external platforms

```
