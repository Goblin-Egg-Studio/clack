dev:
	bun run server.ts

build:
	cd client && bun run build
	./bin/spacetimedb build server

