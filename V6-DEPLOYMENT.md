# NEON VAULT v6.0 — Deployment & operational guide

## Live status and scope

The GitHub Pages frontend can be published through the existing repository. **The online backend is not automatically deployed by GitHub Pages.** No public accounts, database, or synced virtual balances can function until you provision and configure a separately hosted HTTPS API and PostgreSQL database.

The Online Vault screen starts with a setup form rather than silently contacting an unknown third-party service. Enter the API HTTPS origin only after the infrastructure is online and belongs to you.

## Option A: Local development

1. Install Node.js 22+, Python 3.12+, and activate a Python virtual environment.
2. At the repo root run `npm install && node scripts/export-trivia.mjs`.
3. Run `pip install -r server/requirements-dev.txt`.
4. Run `uvicorn app.main:app --app-dir server --reload --port 8000` (defaults to local SQLite).
5. Run `python -m http.server 4173` from the repository root.
6. Open http://localhost:4173 → Online Vault → connect `http://localhost:8000`.
7. API documentation is at http://localhost:8000/docs; health check at `/healthz`.

Local SQLite is for single-instance development/testing, **not a multiworker production substitute for PostgreSQL**.

## Option B: Docker with PostgreSQL

1. Copy `server/.env.example` to `server/.env`, generate a strong **URL-safe** password, and set `POSTGRES_PASSWORD`.
2. Set `CORS_ORIGINS=https://dokeefe414.github.io` (and explicitly add any other trusted frontend origin, comma separated). Never use `*`.
3. From `server/` run `docker compose --env-file .env up --build -d`.
4. The API listens on `127.0.0.1:8000` only. Put a dedicated HTTPS reverse proxy (Caddy, nginx, or a managed hosting proxy) in front; enable TLS and per-IP / per-account throttling.
5. Configure DNS to point your own API hostname to the proxy.
6. In Online Vault, enter that exact HTTPS origin and create an account.

Docker builds the full Trivia bank using Node in a separate stage, then copies only JSON and Python server code to the API image. The Postgres database is on a persistent named volume. **Back up that volume and test restoring backups before public launch.** Do not expose port 5432.

### Hosting checklist

- [ ] Provision a server or hosting service supporting Python FastAPI and persistent PostgreSQL.
- [ ] Restrict database access to the backend; require TLS for public API traffic.
- [ ] Set unique strong secrets and change all example values.
- [ ] Configure accurate CORS origins and reverse-proxy rate limits.
- [ ] Configure managed backups, recovery checks, logging and uptime monitoring.
- [ ] Verify the OpenAPI/health endpoints and create a test user.
- [ ] Run `node scripts/export-trivia.mjs` and `pytest -q server/tests` plus `npm run test:all`.
- [ ] Confirm Login/Logout, duplicate-request idempotency, resume of unfinished cards and no cross-account data leakage.
- [ ] Provide privacy policy, clear data-retention/account-deletion procedure, and abuse/incident response contact before inviting public users.
- [ ] Configure proper database **schema migrations** before iterative production schema changes. v6 bootstraps the first schema with SQLAlchemy `create_all`; this does **not** upgrade existing tables or substitute for migration management.
- [ ] Add monitored edge-wide auth rate limiting and account recovery/email verification before wider public rollout. In-process auth throttling protects only each Python worker independently.

## Virtual-wallet security

All amounts use integer cents. API responses contain the only trusted account balance. Every mutating game request requires an unpredictable unique `key` and saves its request fingerprint + response alongside the ledger in a transaction. A replay of the same request key returns its original response, and reuse with different inputs returns HTTP 409. PostgreSQL locks the user row while editing the wallet.

The browser never gets the private deck before the cards are revealed, and Trivia's answer indices are not sent until the player answers. The `/api/v1/leaderboard` ranks verified server-issued XP, never editable client-stored scores.

### Existing guests

Existing local bankroll, achievements, or JSON exports are deliberately **not imported as online credits or XP**. There is no automatic conversion of editable local wallets into trusted accounts. The new account begins with $1,000 fictional credits. The two modes can coexist in the same browser without modifying each other's storage.

### Privacy and limitations

Cloud registration uses a unique username and password, **not email**. Passwords are salted and Argon2id-hashed. Revocable random bearer tokens are hashed at rest and expire after seven days. Tokens are held in sessionStorage, cleared upon logout, and sent only to the configured API URL. On a shared computer, close the tab or sign out.

The application does **not** currently provide verified email, account recovery, MFA, external OAuth providers, payment processing, real-money gambling, or full production observability. Do not advertise those features as present.

### HTTP endpoints

- `POST /api/v1/auth/register`, `/auth/login`, `/auth/logout`
- `GET /api/v1/me`, `PATCH /api/v1/me`, `GET /api/v1/wallet`
- `GET /api/v1/games/catalog`, `POST /api/v1/games/play`
- `POST /api/v1/poker/deal`, `/poker/draw`, `/poker/forfeit`
- `POST /api/v1/blackjack/start`, `/blackjack/action`, `/blackjack/forfeit`
- `GET /api/v1/rounds/active`, `GET /api/v1/history`
- `GET /api/v1/trivia/catalog`, `POST /api/v1/trivia/start`, `/trivia/answer`, `/trivia/cashout`
- `GET /api/v1/leaderboard`, `GET /api/v1/rewards`, `POST /api/v1/rewards/daily`, `/rewards/prestige/{rank}`, `/rewards/buy`, `/rewards/equip`

## What comes after initial hosting

The next production milestone is database migrations, managed authentication recovery, distributed abuse throttling, operational security review, and improved server-authoritative challenge tracking. Do not enable public tournaments or real-world prizes without fully validated infrastructure and appropriate review.
