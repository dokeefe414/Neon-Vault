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
