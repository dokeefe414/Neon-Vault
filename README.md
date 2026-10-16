# ◆ NEON VAULT — Virtual Casino

**Created by Daniel O'Keefe**

NEON VAULT is a polished browser-based virtual casino and progression game built with **HTML, CSS, and vanilla ES-module JavaScript**. It combines casino-style gameplay, a shared virtual wallet, persistent local saves, player progression, achievements, daily challenges, analytics, and a skill-based Trivia Rescue mode.

> **Virtual credits only.** NEON VAULT does not support real-money gambling, deposits, purchases, withdrawals, transfers, or cash-outs. Credits have no monetary value.

## Live site

https://dokeefe414.github.io/Neon-Vault/

## v4 visual systems & reliability

The v4 release focuses on visual identity, mobile usability, offline support, and engineering reliability.

Highlights:

- Midnight Purple and High Roller Gold now restyle the **entire interface**, not just accent colors
- token-based theme system for backgrounds, panels, navigation, inputs, cards, tables, charts, shadows, Blackjack felt, and card backs
- dedicated mobile bottom navigation
- mobile **Games** and **Progress** hubs so every major feature stays reachable on small screens
- installable PWA manifest and app icon
- offline service-worker cache
- versioned v4 save migrations while preserving the existing localStorage keys
- current-session analytics on the Profile page
- deterministic RNG injection for exact automated rule tests
- ESLint and Prettier tooling
- dependency auditing in GitHub Actions
- expanded Playwright tests for themes, PWA assets, mobile navigation, and v4 saves
- accessibility improvements including a skip link, focus-visible styling, landmarks, and 44px+ mobile controls

See [`CHANGELOG.md`](CHANGELOG.md) for release history and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design.

## Modular architecture

The v3 refactor replaced the original global override chain with:

- one ES-module entry point: `src/app.js`
- explicit imports and exports
- one centralized wallet/settlement store
- independent game modules
- dedicated progression and session layers
- a dedicated UI/view layer
- no global function override chain
- backward-compatible save keys
- automated static, rule, and browser tests

Existing users keep the same wallet/history because the persistent keys remain:

```text
neon-vault-save-v1
neon-vault-meta-v2
```

# Core features

- Shared starting bankroll of **$1,000 in virtual credits**
- Persistent local save using `localStorage`
- Versioned save migrations
- Rolling profit/loss for 24 hours, 7 days, and 30 days
- Lifetime bankroll graph
- Current-session analytics
- Activity/transaction history
- Per-game statistics
- XP, levels, and player titles
- Achievements
- Daily challenges
- Full-interface visual themes
- Optional generated sound effects
- Reduced-motion mode
- Save export/import as JSON
- Responsive desktop/mobile layout
- Installable/offline PWA support
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

The Dashboard and Profile derive statistics from settlement history:

- current balance
- rolling 24H / 7D / 30D P/L
- lifetime net result
- current-session P/L
- current-session result count
- current-session biggest win
- biggest lifetime win/loss
- win rate
- best win streak
- favorite game
- per-game results
- bankroll history chart

# Save system

All virtual currency is stored internally as **integer cents** to avoid floating-point currency errors.

The save layer now includes `saveVersion: 4` and migration functions for older wallet/progression structures. The public storage keys remain unchanged so older browsers can migrate in place instead of being reset.

The Profile page can export the complete save as JSON and import it later. Imports validate and normalize the wallet/history structure before replacing local progress.

# Randomness

Production game outcomes use:

```js
crypto.getRandomValues(...)
```

The project uses rejection sampling and Fisher-Yates shuffling instead of `Math.random()` for game outcomes.

Automated tests can inject a deterministic integer source through `setRandomSourceForTests()` so exact card/wheel scenarios can be reproduced without changing production randomness.

# PWA / offline support

NEON VAULT includes:

- `manifest.webmanifest`
- `icon.svg`
- `sw.js`
- standalone display metadata
- offline caching for the app shell and game modules

On supported browsers, the site can be installed to the home screen and launched in a standalone window.

# Project structure

```text
Neon-Vault/
├── index.html
├── style.css
├── creator.css
├── pro.css
├── mobile.css
├── manifest.webmanifest
├── icon.svg
├── sw.js
├── package.json
├── playwright.config.js
├── eslint.config.js
├── prettier.config.js
├── README.md
├── CHANGELOG.md
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
│   │   ├── progression.js
│   │   └── session.js
│   └── ui/
│       ├── common.js
│       └── views.js
├── tests/
│   ├── smoke.test.cjs
│   ├── rules.test.mjs
│   └── e2e/
│       └── neon-vault.spec.js
└── .github/
    ├── dependabot.yml
    └── workflows/
        └── quality.yml
```

# Local development

Because the app uses browser ES modules, run it through a local static server rather than opening `index.html` directly from `file://`.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Node.js 20+ is supported. Install developer dependencies once:

```bash
npm install
npx playwright install chromium
```

Useful commands:

```bash
npm run check
npm run lint
npm test
npm run test:e2e
npm run test:e2e:desktop
npm run test:e2e:mobile
npm run test:all
npm run format
```

`npm test` runs both the modular smoke checks and deterministic rule tests.

`npm run test:e2e` launches a real local web server and Chromium. The browser suite covers desktop and mobile user flows including:

- clean startup and initial wallet
- navigation across all main screens
- Dice persistence
- Roulette settlement
- Slots settlement
- Blackjack deal/settlement flow
- active-hand navigation protection
- Trivia category persistence
- Midnight Purple full-theme switching and persistence
- Profile save export
- PWA manifest/service-worker availability
- mobile Games and Progress hubs
- mobile touch-size controls
- uncaught browser runtime errors

# Continuous integration

GitHub Actions runs the quality pipeline on pushes and pull requests targeting `main`:

1. install dependencies
2. syntax-check JavaScript
3. run ESLint
4. run smoke + deterministic rule tests
5. run `npm audit --audit-level=high`
6. install Chromium
7. run desktop + mobile Playwright tests
8. upload Playwright reports, screenshots, videos, and traces when available

Dependabot also checks npm dependencies weekly.

# Hosting

NEON VAULT is deployed from `main` through GitHub Pages.

https://dokeefe414.github.io/Neon-Vault/

---

**NEON VAULT is an entertainment/educational simulation using fictional virtual credits only.**
