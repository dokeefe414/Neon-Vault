# ◆ NEON VAULT — Virtual Casino

**Created by Daniel O'Keefe**

NEON VAULT is a polished browser-based virtual casino and progression game built with **HTML, CSS, and vanilla ES-module JavaScript**. It combines casino-style gameplay, a shared virtual wallet, persistent local saves, player progression, achievements, daily challenges, analytics, and a skill-based Trivia Rescue mode.

> **Virtual credits only.** NEON VAULT does not support real-money gambling, deposits, purchases, withdrawals, transfers, or cash-outs. Credits have no monetary value.

## Live site

https://dokeefe414.github.io/Neon-Vault/

## v3 refactor

The v3 release completely reorganized the JavaScript architecture.

The previous implementation grew through multiple files that progressively overrode global functions. That approach worked, but it made behavior depend on script load order and made future changes harder to reason about.

The current build now uses:

- one ES-module entry point: `src/app.js`
- explicit imports and exports
- one centralized wallet/settlement store
- independent game modules
- a dedicated progression layer
- a dedicated UI/view layer
- no global function override chain
- backward-compatible save keys
- automated modular smoke tests
- Playwright end-to-end browser tests on desktop and mobile viewports

Existing users keep the same wallet/history because the persistent keys remain:

```text
neon-vault-save-v1
neon-vault-meta-v2
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full design.

# Core features

- Shared starting bankroll of **$1,000 in virtual credits**
- Persistent local save using `localStorage`
- Rolling profit/loss for 24 hours, 7 days, and 30 days
- Lifetime bankroll graph
- Activity/transaction history
- Per-game statistics
- XP, levels, and player titles
- Achievements
- Daily challenges
- Unlockable visual themes
- Optional generated sound effects
- Reduced-motion mode
- Save export/import as JSON
- Responsive desktop/mobile layout
- Web Crypto API randomness
- GitHub Actions quality checks
- Automated Chromium browser regression testing

# Games

## Blackjack

Blackjack uses a **six-deck shoe** and is implemented as one self-contained state machine.

Supported actions and rules:

- Hit
- Stand
- Split
- Double Down
- Insurance
- Late Surrender
- Natural Blackjack pays 3:2
- Dealer stands on 17
- One split maximum
- Split aces receive one card each
- Active-hand navigation protection
- Abandoned hands settle as forfeits so wallet/history remain consistent

### Perfect Pairs

| Result | Odds |
|---|---:|
| Mixed pair | 6:1 |
| Colored pair | 12:1 |
| Perfect pair | 25:1 |

### 21+3

The player's first two cards and the dealer's up-card form a three-card poker hand.

| Hand | Odds |
|---|---:|
| Flush | 5:1 |
| Straight | 10:1 |
| Three of a kind | 30:1 |
| Straight flush | 40:1 |
| Suited three of a kind | 100:1 |

## Roulette

European single-zero Roulette (`0–36`) supports:

- Straight-up number bets — 35:1
- Red / Black — 1:1
- Odd / Even — 1:1
- 1–18 / 19–36 — 1:1
- Dozens — 2:1
- Columns — 2:1
- Clickable number board
- Animated result presentation

Financial settlement occurs before the animation, so navigation or refresh cannot strand a debited wager.

## Neon Reels Slots

Five reels × three rows with:

- Seven paylines
- Weighted symbols
- Wild symbol (`⭐`)
- Scatter symbol (`✨`)
- Three or more scatters awarding 3 free spins
- Persistent free-spin count
- Triggering wager preserved for every free spin
- Reel animation

## Dice

- Two six-sided dice
- Choose **Low (2–6)** or **High (8–12)**
- Seven loses
- Correct prediction pays 1:1

## Trivia Rescue

Trivia Rescue is both a general-knowledge game and a bankroll-recovery mechanic.

### Reward ladder

| Correct answers | Cash-out value |
|---:|---:|
| 1 | $10 |
| 2 | $20 |
| 3 | $40 |
| 4 | $80 |
| 5 | $160 |
| 6 | $320 |
| 7 | $640 |
| 8 | $1,280 |
| 9 | $2,560 |
| 10 | $5,120 |

Rules:

- first correct answer creates a $10 pot
- every consecutive correct answer doubles the pot
- cash out after any correct answer
- one wrong answer wipes the uncashed pot
- 10 correct answers auto-cash $5,120
- Trivia can rebuild a $0 bankroll

The active bank contains **exactly 200 unique prompts**.

Categories:

- General
- Geography
- Science
- Sports
- Math
- History & Culture
- Technology

Seen-question state persists locally so the game can cycle through large no-repeat pools.

# Player progression

Settled gameplay grants XP. XP determines player level and title.

Example titles include:

- Rookie
- Player
- Card Sharp
- High Roller
- Vault Elite
- Neon Legend

Higher levels unlock additional visual themes.

## Achievements

Examples include:

- first settled game
- Blackjack win
- Perfect Pair
- 10-question Trivia streak
- $5,000 bankroll
- 100 settled results
- five-win streak
- $1,000+ single net win
- exact-number Roulette win
- Slots bonus
- Split win
- Double Down win
- recovery from $0 through Trivia
- daily challenge completion
- level 5

## Daily challenges

One challenge is generated from the local calendar date. Completing it awards **$100 virtual credits + 100 XP**.

# Analytics

The Dashboard and Profile derive statistics from the settlement history:

- current balance
- rolling 24H / 7D / 30D P/L
- lifetime net result
- biggest win/loss
- win rate
- best win streak
- favorite game
- per-game results
- bankroll history chart

# Save system

All virtual currency is stored internally as **integer cents** to avoid floating-point currency errors.

The Profile page can export the complete save as JSON and import it later. Imports validate the wallet/history structure before replacing local progress.

# Randomness

Game outcomes use:

```js
crypto.getRandomValues(...)
```

The project uses rejection sampling and Fisher-Yates shuffling instead of `Math.random()` for game outcomes.

# Project structure

```text
Neon-Vault/
├── index.html
├── style.css
├── creator.css
├── pro.css
├── package.json
├── playwright.config.js
├── README.md
├── ARCHITECTURE.md
├── src/
│   ├── app.js
│   ├── core/
│   │   ├── random.js
│   │   ├── store.js
│   │   └── utils.js
│   ├── data/
│   │   └── trivia.js
│   ├── games/
│   │   ├── blackjack.js
│   │   ├── dice.js
│   │   ├── roulette.js
│   │   ├── slots.js
│   │   └── trivia.js
│   ├── progression/
│   │   └── progression.js
│   └── ui/
│       ├── common.js
│       └── views.js
├── tests/
│   ├── smoke.test.cjs
│   └── e2e/
│       └── neon-vault.spec.js
└── .github/
    └── workflows/
        └── quality.yml
```

# Local development

Because the app uses browser ES modules, run it through a local static server rather than opening `index.html` directly from `file://`.

For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Node.js 20+ is used for repository checks.

Install development dependencies once:

```bash
npm install
npx playwright install chromium
```

Then run:

```bash
npm run check
npm test
npm run test:e2e
```

Useful browser-test commands:

```bash
npm run test:e2e:desktop
npm run test:e2e:mobile
npm run test:all
```

`npm run check` syntax-checks every JavaScript module under `src/`.

`npm test` verifies important architecture and feature contracts, including:

- exactly one module entry script
- required source modules
- backward-compatible save keys
- Web Crypto RNG
- Blackjack rule support
- Roulette and Slots contracts
- 200 unique Trivia questions
- navigation guards
- progression services

`npm run test:e2e` launches a real local web server and Chromium through Playwright. The browser suite checks both a desktop viewport and a mobile viewport and exercises real user flows such as:

- clean dashboard startup and initial wallet
- navigation across every main screen
- Dice settlement and persistence after reload
- Roulette settlement and activity history
- Slots settlement and post-animation usability
- Blackjack deal/settlement flow
- Blackjack active-hand navigation confirmation
- Trivia category persistence
- Profile save export
- mobile navigation and touch-size controls
- uncaught browser runtime errors

# Continuous integration

GitHub Actions automatically runs the complete quality pipeline on pushes and pull requests targeting `main`:

1. install Node dependencies
2. syntax-check all source modules
3. run architecture/smoke tests
4. install Chromium
5. run Playwright desktop + mobile end-to-end tests
6. upload Playwright HTML reports, screenshots, videos, and traces when available

Playwright artifacts are retained for 14 days so browser failures can be reproduced and debugged from GitHub Actions.

# Hosting

NEON VAULT is deployed from `main` through GitHub Pages.

https://dokeefe414.github.io/Neon-Vault/

---

**NEON VAULT is an entertainment/educational simulation using fictional virtual credits only.**