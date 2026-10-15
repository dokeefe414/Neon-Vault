# NEON VAULT Architecture — v3

NEON VAULT is a framework-free browser application built with native HTML, CSS, ES modules, `localStorage`, SVG, Web Audio, and the Web Crypto API.

The v3 refactor removes the old script-override architecture. The browser now loads **one JavaScript entry point**:

```html
<script type="module" src="src/app.js"></script>
```

Every subsystem is imported explicitly from the `src/` tree. No game depends on another file redefining global functions after load.

## Source tree

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
│   └── progression.js
└── ui/
    ├── common.js
    └── views.js
```

## Application entry point

`src/app.js` is the composition root.

Responsibilities:
- imports each game module
- owns current navigation state
- maps routes/views to render functions
- guards active Blackjack hands and uncashed Trivia pots
- applies preferences
- initializes achievements and daily challenges
- provides a render error boundary

The game registry is explicit rather than dynamically discovered.

## Core layer

### `src/core/store.js`

Owns all persistent application state and all wallet mutations.

Core save key:

```text
neon-vault-save-v1
```

Stores:
- balance in integer cents
- timestamped P/L ledger
- detailed settlement history

Progression save key:

```text
neon-vault-meta-v2
```

Stores:
- XP
- achievement unlocks
- daily challenge state
- gameplay achievement flags
- sound/reduced-motion/theme settings
- Trivia category and seen pools
- Slots free-spin state

The keys intentionally remain unchanged so users upgrading from the older build keep their balance and history.

All game payouts use the same `debit()` and `settle()` service. Games cannot independently manipulate transaction-history accounting.

### `src/core/random.js`

Owns random number generation and shuffling.

Outcomes use `crypto.getRandomValues()` with rejection sampling. `Math.random()` is not used for game outcomes.

### `src/core/utils.js`

Contains small dependency-free helpers such as:
- currency formatting
- DOM lookup
- HTML escaping
- date keys
- shared constants

## Game modules

Each game owns only its temporary round/session state and rules.

### Blackjack

`src/games/blackjack.js` is a single Blackjack state machine. It replaces the previous three-file override chain.

Supports:
- six-deck shoe
- Hit / Stand
- Double Down
- one Split maximum
- split aces receiving one card each
- Insurance
- late Surrender
- natural Blackjack at 3:2
- dealer stands on 17
- Perfect Pairs
- 21+3
- explicit forfeit settlement when leaving an active hand

Rendering a hand is side-effect free: UI rendering does not advance game state.

### Roulette

`src/games/roulette.js` supports European single-zero Roulette:
- straight-up numbers
- red / black
- odd / even
- low / high
- dozens
- columns

The financial settlement occurs before presentation animation begins. This prevents a refresh/navigation during animation from losing a paid result.

### Slots

`src/games/slots.js` owns:
- five reels × three rows
- seven paylines
- weighted symbols
- wilds
- scatters
- persistent free spins
- triggering-wager preservation

Free-spin count and triggering wager are stored in progression metadata so navigating away does not alter the bonus value.

### Dice

`src/games/dice.js` contains the complete two-dice high/low game and has no persistent round state.

### Trivia Rescue

Question data lives separately in `src/data/trivia.js`.

`src/games/trivia.js` owns:
- category selection
- streak and pot state
- difficulty progression
- persistent no-repeat tracking
- cash-out logic
- $0-bankroll recovery tracking

The active bank contains exactly 200 unique prompts.

## Progression layer

`src/progression/progression.js` subscribes to store settlement events rather than overriding the settlement function.

It derives and manages:
- XP and levels
- titles
- achievements
- daily challenges
- per-game statistics
- win streaks
- bankroll-history reconstruction

Derived statistics are calculated from settlement history instead of duplicated into persistent state.

## UI layer

### `src/ui/common.js`

Shared interaction helpers:
- wallet rendering
- toast/status feedback
- generated sound effects
- wager parsing
- half/double wager controls
- theme/reduced-motion application

### `src/ui/views.js`

Owns non-game screens:
- Dashboard
- Activity
- Player Profile
- Achievements
- Daily Challenge
- bankroll SVG chart
- save export/import
- settings

## Currency and accounting model

All virtual credits are represented as integer cents.

Example:

```text
$25.00 = 2500
```

A wager is first debited from the wallet. Settlement then credits the payout and writes one immutable history record:

```text
net = payout - wager
```

This keeps the wallet, activity ledger, analytics, and exported saves aligned.

NEON VAULT is strictly a virtual-credit simulation. Credits have no monetary value and cannot be purchased, deposited, withdrawn, transferred, or redeemed.

## Save portability

The Profile screen can export a versioned JSON backup containing both save objects. Import validates wallet/history structure before replacing local progress.

## Reliability rules introduced by the refactor

- one ES-module entry point
- no global function overrides
- one centralized transaction service
- explicit game registry
- explicit navigation lifecycle
- active-hand/pot navigation guards
- settlement before asynchronous animation
- view-aware animation completion
- persistent bonus state
- browser error boundary
- backward-compatible save keys

## Quality checks

```bash
npm run check
npm test
```

`npm run check` syntax-checks every JavaScript module under `src/`.

`npm test` verifies architectural contracts including:
- one-script module runtime
- required module files
- legacy save-key compatibility
- Web Crypto RNG
- Blackjack feature/rule presence
- Roulette and Slots feature contracts
- Trivia bank size and unique prompts
- navigation guards
- progression services

GitHub Actions runs both commands on pushes and pull requests to `main`.

## Backend boundary

The current GitHub Pages release is entirely client-side and intentionally contains no account credentials or private server secrets. A future cloud-account implementation should place authentication and persistent server data behind a real backend/API rather than embedding credentials in browser code.
