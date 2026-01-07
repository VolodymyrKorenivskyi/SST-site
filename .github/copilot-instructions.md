# Copilot / AI Agent Instructions — SST-site

Purpose: brief, actionable guidance to help an AI agent be productive in this repo.

- **Entry point:** see [src/index.ts](src/index.ts#L1). The app is an Express API started by `npm run dev` (dev uses `tsx watch`) or compiled with `npm run build` then `npm start`.
- **DB:** uses `better-sqlite3` with a single file DB. Connection and initialization live in [src/database/connection.ts](src/database/connection.ts#L1). The DB file defaults to `data/sst-site.db` or can be overridden with `DB_PATH`.
- **Migrations:** migration script is [src/database/migrate.ts](src/database/migrate.ts#L1). Run migrations with `npm run db:migrate` (calls `tsx src/database/migrate.ts`). The migration script creates the `data` directory if missing.
- **Types / Domain models:** canonical types are in [src/types/index.ts](src/types/index.ts#L1) (Terminal, Transaction, Card, Account). Prefer re-using these interfaces across controllers/services.

Architecture notes (big picture):
- Small monolith Express API: `src/index.ts` sets up middleware, JSON parsing, and calls `initDatabase()` before listening. New routes should be registered after database init.
- Data flow: synchronous DB calls via `better-sqlite3` (not async). Expect functions that open a DB handle and run statements directly; avoid converting to async without adapting callers.
- Project layout described in [README.md](README.md#L1): controllers, services, routes, models are expected directories (some may be scaffolded rather than implemented).

Developer workflows & commands (concrete):
- Install deps: `npm install` (see `package.json`).
- Dev (hot-reload): `npm run dev` -> runs `tsx watch src/index.ts`.
- Build: `npm run build` -> `tsc` (outputs to `dist`).
- Start production: `npm start` -> runs `node dist/index.js`.
- Run DB migrations: `npm run db:migrate` -> `tsx src/database/migrate.ts`.

Repository-specific conventions & gotchas:
- Synchronous DB driver: codebase uses `better-sqlite3` synchronously; do not introduce async DB patterns unless you adapt call sites.
- DB location: migrations and connection expect `data/` at repo root. Migration script creates that folder. Use `DB_PATH` env var to point elsewhere during CI/tests.
- Environment: `.env` is loaded in [src/index.ts](src/index.ts#L1) via `dotenv`. Keep secrets out of repo.
- TypeScript: `tsconfig.json` is strict (see `noUnusedLocals`, `noImplicitReturns`, etc.). New code must satisfy strict compiler settings or the build will fail.

Where to look for examples:
- App bootstrap: [src/index.ts](src/index.ts#L1)
- DB connection and lifecycle: [src/database/connection.ts](src/database/connection.ts#L1)
- Migration entrypoint: [src/database/migrate.ts](src/database/migrate.ts#L1)
- Domain types: [src/types/index.ts](src/types/index.ts#L1)
- Repo overview & commands: [README.md](README.md#L1)

Guidance for code changes an AI might perform:
- When adding routes, register them in `src/index.ts` after `initDatabase()`.
- When manipulating DB schema/data use `migrate.ts` (add migration steps there) and keep migrations idempotent where possible.
- Reuse types from [src/types/index.ts](src/types/index.ts#L1) for DTOs and DB rows to keep signatures consistent.
- Avoid introducing asynchronous DB helpers without updating all callers.

If you need more context or to run the app, ask for permission to run these commands locally or in CI and indicate the intended change first.

If anything above is unclear or you want more examples (routes, controllers, or a sample migration), tell me which area to expand.
