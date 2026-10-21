# NEON VAULT v6.0 — The Online Era

**[Play NEON VAULT](https://dokeefe414.github.io/Neon-Vault/)** · Created by Daniel O'Keefe

NEON VAULT is a browser-based casino **simulation using fictional, nonredeemable credits only**. No real money, payments, gambling prizes, or withdrawals.

## New in v6.0

Two modes are intentionally separated:

- **Guest / Local Vault:** All seven existing games, achievements, Trivia Rescue questions, history, and guest progress continue working offline in your browser. Previous saves remain intact.
- **Online Vault:** A Python FastAPI + SQLAlchemy API, PostgreSQL in production, Argon2id password hashing, hashed and revocable bearer sessions, cloud profile customization, separate server-controlled virtual wallet, recorded results, protected replay/round recovery, an online XP leaderboard, and claimable server-verified cosmetic rewards. **Requires a separately deployed cloud API.** GitHub Pages alone cannot run Python or host a database.

Cloud game outcomes are created **only** by the server using OS-backed random generation. The UI cannot specify winning numbers, dice values, dealt cards, correct Trivia answers, or its cloud balance. Per-user transaction locks and unique request keys prevent duplicate settlements. Guest balances, XP, and local exports are never accepted as online currency or rankings.

### Cloud games

| Game | Server-controlled gameplay |
| --- | --- |
| Dice | High/low, two server-rolled dice |
| Roulette | Single-zero wheel, numbers, colors, odd/even, columns, dozens |
| Slots | 3×5 symbol grid, seven paylines, server-owned free-spin credits |
| Baccarat | Eight-deck Punto Banco and banker commission |
| Video Poker | One-deck Jacks or Better, reserve on Deal, hold/draw, idempotent settlement |
| Blackjack | Six-deck play, dealer hole-card secrecy, hit, stand, double, split, surrender, insurance |
| Trivia Rescue | All specialist categories exported from the original 100+ questions/category bank, with server-verified answers and cashouts |

The cloud-specific rules are explicitly documented. Online Poker reserves its wager at Deal; **forfeiting or abandoning a dealt hand loses that wager**. Unlike guest mode, the cloud release does not offer Blackjack side bets yet. Guest and cloud XP systems are independent. Server-side replays and session records show completed cloud rounds; local replays are unchanged.

## Run the frontend locally

Node.js 22+:

```bash
npm install
npm run check
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
python -m http.server 4173
```

Open http://localhost:4173. Guest play requires no backend.

## Run the Python API locally

Python 3.12+:

```bash
python -m venv .venv
# Activate the environment for your operating system
pip install -r server/requirements-dev.txt
node scripts/export-trivia.mjs
uvicorn app.main:app --app-dir server --reload --port 8000
```

Use the **Online Vault** navigation link and connect to `http://localhost:8000`. For the Python integration tests:

```bash
pytest -q server/tests
```

For Docker/PostgreSQL and an internet-facing API, read **[V6-DEPLOYMENT.md](V6-DEPLOYMENT.md)**.

## Repo structure

- `src/` — vanilla JavaScript, HTML, CSS guest casino and cloud portal
- `src/ui/cloud.js`, `cloud.css` — Online Vault interface; API URL explicitly configurable
- `server/app/main.py` — versioned REST API, account lifecycle, profiles, rewards, leaderboard
- `server/app/security.py` — password verification and revocable sessions
- `server/app/db.py` — server-owned users, round records, idempotency keys and ledger
- `server/app/logic.py` — seven virtual-credit rule engines
- `server/app/services.py` — server-authoritative wagering and poker/Blackjack state machines
- `server/app/trivia.py` — online Trivia streaks and no-repeat question selection
- `scripts/export-trivia.mjs` — build-time export of validated Trivia questions for server-only answer checking
- `server/tests/` — security, settlement, accounting, random game, and API tests
- `.github/workflows/quality.yml` — JS, backend and desktop/mobile browser CI

## Privacy & security model

Credentials never go into local guest saves, the offline cache, or a GitHub repository. Cloud tokens are kept in **sessionStorage** (one browser tab session), never in persistent localStorage. The API origin you choose is stored locally; **only enter a trusted HTTPS API origin**, except localhost for development. Password reset/email verification are not yet configured; see deployment guide for production requirements. The backend rejects unknown input fields and any attempt to set credits, XP, or leaderboard ranks via profile updates.

The project is not suitable for real-money use and is not intended to support it. Browser-only testing and CI do not make an internet-facing service production-ready without HTTPS, controlled backups, secret management, abuse protections, legal/privacy review, and operational monitoring.
