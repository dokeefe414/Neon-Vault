# NEON VAULT Architecture — v4

NEON VAULT is a framework-free browser application built with native HTML, CSS, ES modules, `localStorage`, `sessionStorage`, SVG, Web Audio, Service Workers, and the Web Crypto API.

The browser loads one JavaScript composition root:

```html
<script type="module" src="src/app.js"></script>
```

Every subsystem is imported explicitly. No game relies on global function replacement or script-order overrides.

## Runtime layers

```text
src/
├── app.js
├── core/
│   ├── random.js
│   ├── store.js
│   └── utils.js
├── data/
│   └── trivia.js
├── games/
│   ├── blackjack.js
│   ├── dice.js
│   ├── roulette.js
│   ├── slots.js
│   └── trivia.js
├── progression/
│   ├── progression.js
│   └── session.js
└── ui/
    ├── common.js
    └── views.js
```

## Composition and routing

`src/app.js` is the composition root. It:

- imports and registers each game explicitly
- owns current view state
- renders desktop and mobile navigation targets
- provides mobile Games and Progress hubs
- protects active Blackjack hands and uncashed Trivia pots during navigation
- applies preferences
- initializes progression
- exposes a render error boundary
- registers the service worker

## Persistent state and migrations

`src/core/store.js` owns wallet accounting and persistent state.

The existing keys remain intentionally unchanged:

```text
neon-vault-save-v1
neon-vault-meta-v2
```

The payloads now carry:

```text
saveVersion: 4
```

`migrateState()` and `migrateMeta()` normalize older saves into the current representation without intentionally resetting existing balances or history.

Core state stores:

- balance as integer cents
- P/L ledger
- settlement history

Metadata stores:

- XP and levels
- achievement unlocks and flags
- daily challenge state
- preferences and theme
- Trivia no-repeat pools
- Slots free-spin state
- completed session summaries

All wallet-changing gameplay uses centralized `debit()`, `settle()`, or `grant()` services.

## Randomness

`src/core/random.js` uses `crypto.getRandomValues()` with rejection sampling for production outcomes and Fisher-Yates for shuffling.

Tests can inject a deterministic source through:

```js
setRandomSourceForTests(...)
resetRandomSource()
```

This allows exact game scenarios to be reproduced without weakening production randomness.

## Blackjack state machine

`src/games/blackjack.js` owns the complete Blackjack round lifecycle:

- six-deck shoe
- Hit / Stand
- Double Down
- Split
- Insurance
- late Surrender
- natural Blackjack 3:2
- dealer stands on 17
- Perfect Pairs
- 21+3
- explicit forfeit settlement on confirmed navigation

Active rounds are additionally serialized under:

```text
neon-vault-blackjack-round-v1
```

A page reload restores the cards, shoe, wager amounts, active hand, insurance state, and split/double state without debiting the wager again. The active-round key is cleared when the round settles, is surrendered, or is deliberately forfeited.

## Other games

### Roulette

European single-zero Roulette supports straight-up numbers, colors, parity, low/high, dozens, and columns. Wallet settlement happens before result animation so a refresh cannot strand a wager.

### Neon Reels

Slots owns the 5×3 grid, seven paylines, symbol weights, wilds, scatters, and free-spin logic. Free-spin count and triggering wager persist in metadata.

### Dice

Dice is a stateless two-dice high/low game. Seven loses; correct predictions pay 1:1.

### Trivia Rescue

Trivia data is isolated in `src/data/trivia.js`. The game module owns category selection, escalating difficulty, pot/streak state, cash-out rules, and persistent category/difficulty no-repeat buckets. The active bank contains exactly 200 unique prompts.

## Progression and sessions

`src/progression/progression.js` subscribes to settlement events and derives XP, levels, titles, achievements, daily challenges, bankroll history, per-game statistics, and win streaks.

`src/progression/session.js` uses `sessionStorage` for the current browser session and stores completed summaries in metadata. It tracks starting balance, session P/L, settled result count, duration, biggest win, and biggest loss.

## UI and theme system

`src/ui/common.js` owns shared wallet rendering, toast feedback, generated tones, wager parsing, wager-adjustment controls, and preference application.

The visual layer is split across base and enhancement stylesheets. v4 introduces semantic theme tokens such as:

```text
--nv-bg
--nv-sidebar
--nv-panel
--nv-border
--nv-input
--nv-nav-active
--nv-felt-a
--nv-felt-b
--nv-card-back-a
```

Midnight Purple and High Roller Gold override these tokens so they restyle the entire interface rather than only changing accent colors.

## Mobile architecture

Desktop retains the full sidebar. At phone widths, `mobile.css` replaces it with a five-item bottom dock:

- Home
- Games
- Trivia
- Progress
- Profile

Games and Progress open hub screens that provide access to the routes not represented directly in the dock. This keeps all features reachable without overcrowding the mobile navigation.

## PWA and offline behavior

`manifest.webmanifest` makes NEON VAULT installable on supported browsers. `sw.js` precaches the static app shell and runtime modules.

The service worker is network-first. On failure it:

1. returns the exact cached resource when available;
2. falls back to `index.html` only for navigation requests;
3. returns an error for an uncached failed asset request rather than incorrectly serving HTML as JavaScript or CSS.

## Currency and accounting

All virtual credits are represented as integer cents:

```text
$25.00 = 2500
```

A paid wager is debited before settlement. Settlement credits the payout and records:

```text
net = payout - wager
```

This keeps the wallet, Activity history, analytics, session reporting, and exported saves aligned.

NEON VAULT is strictly a virtual-credit simulation. Credits cannot be purchased, deposited, withdrawn, transferred, or redeemed.

## Reliability and quality pipeline

The v4 pipeline includes:

```bash
npm run check
npm run lint
npm test
npm run test:e2e
npm audit --audit-level=high
```

Coverage includes:

- module/file contracts
- v4 save migrations
- backward-compatible storage keys
- production Web Crypto RNG
- deterministic RNG injection
- deterministic Blackjack/Roulette rule tests
- 200 unique Trivia prompts
- navigation guards
- Midnight Purple theme switching and persistence
- wallet persistence
- Blackjack round reload recovery without double debit
- PWA assets
- desktop Chromium flows
- mobile touch/navigation flows

GitHub Actions runs the pipeline on pushes and pull requests to `main`. Playwright failure reports, screenshots, videos, and traces are uploaded as artifacts. Dependabot checks npm dependencies weekly.

## Backend boundary

The GitHub Pages build remains intentionally client-side. It contains no account passwords, private API credentials, or server secrets. Future cloud accounts should use a real authentication/data backend rather than embedding privileged credentials in browser code.

## v5: Premier Experience

The new reusable game math lives in `src/core/rules.js` and the deterministic QA harness in `src/core/simulation.js`; both are independent of UI/DOM effects. `src/core/strategy.js` explains six-deck Blackjack basic-strategy decisions without changing actual cards or payouts. `src/ui/v5.js` supplies local player identity customization, cosmetics, the tutorial, analytics, practice screens, and optional weekly challenges. `src/progression/weekly.js` stores local Monday-based weekly goals and awards XP/cosmetic tokens exactly once per goal. The selected bet chip tray is a non-authoritative input control.

Storage keys are unchanged for v4 migration compatibility; schema version advances to five, including optional volume, cosmetic inventory, token balance, tutorial flag and weekly progress. Real-money gambling, accounts, shared balances and cloud leaderboards remain unsupported. A secure future backend must generate/validate outcomes and settle idempotent transactions server-side; localStorage is not trusted.

## Version 5.1–5.2

The shared store now exposes `settleWager(game, bet, payout)` for already-known Dice, Roulette and Slots outcomes, applying the wager and payout in a single state save and ledger record. `settle()` remains for separately debited, persisted Blackjack hands and zero-wager rewards. Settlements can use unique `id` keys to avoid accidental duplicate journal entries; each tab also performs optimistic freshness checks against localStorage before writing and displays a reload prompt on cross-tab changes. These checks reduce accidental conflicts but do not guarantee atomic concurrency across browsers or devices.

Weekly Monday boundaries use local calendar dates. New v5.2 styling enhances game surfaces in `v5.css`; game controllers only supply display-specific markup and never derive payout from animation state. The cache identifier is bumped to v5.2, leaving the v5 save schema intact. Automated tests cover deterministic rules, wallet idempotence, strategy and local week boundaries, plus desktop/mobile gameplay.

## v5.3 Trivia expansion

Specialized Trivia Rescue banks are split into independent data-only modules under `src/data/trivia-{geography,science,sports,math,history,technology}.js`, built with strict unique-choice factory helpers and integrated by `src/data/trivia.js`. The general quiz draws from the complete corpus. `src/games/trivia-selection.js` implements persistent category-wide seen lists rather than per-difficulty exhaustion; it gives unseen questions priority across sessions and restarts a category only after all of its prompts have been offered. Existing per-difficulty seen arrays are merged on first use for backwards-compatible progression. Answers are reshuffled per 10-question run while correct indices are recalculated. Tests exercise question counts, uniqueness, choices, historical migration and no-repeat exhaustion.

## v5.4–v5.7 progression, replays, and two new rule engines

- `src/core/baccarat.js`: pure eight-deck Punto Banco drawing, natural-hand checks, automatic player/banker third-card table, banker commission and tie pushes.
- `src/core/poker.js`: pure 52-card five-card draw rules, wheel straight detection, ordered poker categories, and the Jacks-or-Better paytable.
- `src/games/baccarat.js` and `src/games/poker.js`: independent DOM controllers wired through the shared wallet and responsive routing. Baccarat shuffles a fresh shoe when cards run low; Poker uses a fresh single deck each round.
- `src/ui/records.js`: read-only local history views with per-game filters and replay summaries. New Blackjack rounds embed start/final hands and the decision sequence; new Slots results record the symbol matrix. Legacy results remain viewable without replay detail.
- `src/progression/progression.js`: registers Baccarat/Video Poker as primary games and awards additional cosmetic XP achievements. Avatar and cosmetic options are expanded in `src/ui/v5.js`.
- `v57.css`: additional casino polish, held-card visualization, Records UI, and cosmetic color themes with reduced-motion support.

LocalStorage is still a browser-controlled store: do not treat local awards as tamper-resistant multiplayer records. The app continues to use the v5 data schema and previous localStorage keys, so these releases preserve bankroll and saved progress. Video Poker does not debit credits during an unfinished Deal step, making accidental page closure before Draw financially harmless to the virtual wallet. Baccarat results and finished Poker draws settle once in the existing `settleWager` path.

## v5.8 and v5.9

Video Poker uses a custom house paytable where a Jacks-or-Better high pair returns 2x total; this differs from conventional 9/6 poker. Blackjack rounds now persist unique IDs and a finalized outcome before settling using per-hand idempotency keys. Prestige is cosmetic-only and does not affect odds. Reward claims and progression insights live in `src/progression/rewards.js`, with pages in `src/ui/rewards-views.js`, using optional fields in the existing local v5 meta save. Browser storage remains non-atomic across tabs; a backend would be necessary for tamper-resistant multiplayer balances.

## v6.0 — Server-authoritative online architecture

The GitHub Pages app now has two independent gameplay modes. **Guest** uses the existing browser-local `src/core/store.js` and all local game controllers; **Online Vault** uses `src/ui/cloud.js` and a separately deployed Python FastAPI service. The online client intentionally never calls guest debit, settle or local-wallet mutation functions. The local guest balance is not imported as trusted online credit.

```text
GitHub Pages (src/app.js)
 ├─ Guest pages → ES-module game controllers → localStorage and offline Service Worker
 └─ Online Vault (src/ui/cloud.js) → HTTPS JSON API (server/app/main.py)
                                       ├─ Argon2id credentials + hashed bearer sessions
                                       ├─ SQLAlchemy UoW / PostgreSQL user-row locks
                                       ├─ Immutable round and ledger journal
                                       ├─ Idempotency key + fingerprint + stored response
                                       ├─ Server-owned games and secret decks
                                       └─ XP leaderboard, profiles and cosmetic rewards
```

Game decisions are validated server-side, including payout calculations, third-card drawing and private Trivia answer choices. A request with the same idempotency key returns its original result, while changed input with that key is rejected. Client guesses, externally edited local save files, or fabricated wins cannot set cloud balances or leaderboard XP. All amounts are integer cents. Session tokens expire, are revocable, and are stored hashed in PostgreSQL. CORS accepts explicit trusted origins only. The offline Service Worker only caches known same-origin assets and navigation—not authenticated API responses or other network resources.

SQLite is exclusively for local development/test runs; PostgreSQL row locks are required for deployment. v6 initial schema uses `create_all` and requires versioned migrations before subsequent production schema changes. Password recovery, distributed rate limiting, email verification and a deployed public HTTPS API are not included until configured and reviewed. The frontend never claims a cloud is online until explicitly connected to an independently deployed backend.
