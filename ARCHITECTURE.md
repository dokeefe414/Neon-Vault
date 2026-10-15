# NEON VAULT Architecture

NEON VAULT is intentionally framework-free. The application is built with browser-native HTML, CSS, JavaScript, localStorage, SVG, Web Audio, and the Web Crypto API.

## Runtime layers

The scripts are loaded in a deliberate order:

1. `app.js` — original application state, wallet, history, dashboard, base games, shared helpers.
2. `trivia-questions.js` — legacy expanded trivia data retained for compatibility/history.
3. `trivia-balanced.js` — the active 200-question balanced pool and persistent no-repeat base.
4. `shoe.js` — six-deck Blackjack shoe.
5. `blackjack-actions.js` — Split and Double Down hand model.
6. `pro-core.js` — progression, XP, levels, achievements, daily challenges, analytics, charts, settings, audio, import/export.
7. `games-pro.js` — casino-style Roulette and five-reel Slots.
8. `trivia-pro.js` — categories, difficulty ramping, and category-aware no-repeat behavior.
9. `blackjack-pro.js` — Insurance, Surrender, and progression hooks.
10. `boot.js` — final integration pass and initial render after every enhancement layer is loaded.

This layered structure allows the project to preserve old saves and working gameplay while progressively replacing individual systems.

## Persistent state

### Core save

Key: `neon-vault-save-v1`

Stores:
- wallet balance in integer cents
- timestamped P/L ledger
- detailed activity history
- legacy trivia seen-state when present

### Progression save

Key: `neon-vault-meta-v2`

Stores:
- XP and level progression
- achievements
- daily challenge progress
- gameplay flags used by achievements
- sound/reduced-motion/theme preferences
- selected trivia category
- category-aware trivia seen pools

Keeping progression metadata separate makes migration safer and preserves compatibility with earlier versions of NEON VAULT.

## Currency model

All virtual currency is stored in integer cents. For example, `$25.00` is represented as `2500`. This avoids floating-point money errors.

NEON VAULT is strictly a virtual-credit simulation. Credits have no monetary value and cannot be purchased, deposited, withdrawn, transferred, or redeemed.

## Randomness

Game outcomes use `crypto.getRandomValues()` with rejection sampling instead of `Math.random()`. This is used by shuffling and random game outcomes.

## Blackjack model

Blackjack uses a six-deck shoe and supports:
- Hit
- Stand
- Split (one split maximum)
- Double Down
- Insurance when the dealer shows an Ace
- Late Surrender before the player takes another action
- Perfect Pairs
- 21+3

Split hands are settled and logged independently. Split aces receive one additional card per hand. Side bets settle independently of the main wager.

## Roulette model

European single-zero wheel (`0–36`) with:
- straight-up number bets
- red / black
- odd / even
- 1–18 / 19–36
- dozens
- columns

## Slots model

Five reels × three rows with seven paylines.

Features:
- weighted symbols
- left-to-right matching payouts
- wild symbol
- scatter symbol
- free-spin bonus
- responsive reel animation

## Trivia model

The active bank contains 200 questions.

Features:
- mostly easy/common-knowledge questions
- medium/hard questions mixed into later streak positions
- category selection
- category-aware no-repeat tracking
- escalating reward ladder
- bankroll-recovery use case

## Progression

Settled gameplay grants XP. XP is used to calculate player levels and cosmetic titles. Higher levels unlock additional visual themes.

Achievements are evaluated from both the transaction history and gameplay flags. Daily challenges use local calendar dates and automatically award virtual credits and XP when completed.

## Analytics

The dashboard reconstructs historical bankroll values from the transaction history and renders the graph as inline SVG. Supported time ranges are:
- 24 hours
- 7 days
- 30 days
- lifetime

Per-game performance is derived from the activity ledger rather than stored as duplicated state.

## Accessibility and UX

The application includes:
- responsive desktop/mobile layouts
- keyboard-accessible native buttons and inputs
- reduced-motion preference
- optional generated sound effects
- visible text status messages in addition to color
- virtual-credit disclaimers

## Save portability

The Profile page can export the complete local save to JSON and restore it later. Imports validate the required wallet/history structure before replacing local progress.

## Quality checks

`package.json` provides:

```bash
npm run check
npm test
```

GitHub Actions runs both commands on pushes and pull requests to `main`.

## Future backend path

The static GitHub Pages build deliberately does not contain account credentials or server secrets. If cloud accounts are added later, authentication and cloud persistence should live behind a real backend/API rather than embedding secrets in client-side JavaScript.
