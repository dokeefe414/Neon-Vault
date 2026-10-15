# ◆ NEON VAULT — Virtual Casino

**Created by Daniel O'Keefe**

NEON VAULT is a polished browser-based virtual casino and progression game built with **HTML, CSS, and vanilla JavaScript**. It combines casino-style gameplay, a shared virtual wallet, persistent local saves, player progression, achievements, daily challenges, analytics, and a skill-based Trivia Rescue mode.

> **Virtual credits only.** NEON VAULT does not support real-money gambling, deposits, purchases, withdrawals, transfers, or cash-outs. Credits have no monetary value.

## Live site

https://dokeefe414.github.io/Neon-Vault/

## Core features

- Shared starting bankroll of **$1,000 in virtual credits**
- Persistent local save using `localStorage`
- Rolling profit/loss for the last 24 hours, 7 days, and 30 days
- Lifetime bankroll graph with multiple time ranges
- Detailed transaction/activity history
- Per-game performance statistics
- XP, player levels, titles, and unlockable themes
- Achievement system
- Daily challenges with virtual-credit and XP rewards
- Optional generated sound effects
- Reduced-motion mode
- Save export/import as JSON
- Responsive desktop and mobile layout
- Web Crypto API randomness for game outcomes
- Automated GitHub Actions quality checks

# Games

## Blackjack

Blackjack uses a **six-deck shoe** and includes:

- Hit
- Stand
- Split
- Double Down
- Insurance
- Surrender
- Natural Blackjack paying 3:2
- Dealer stands on 17
- Perfect Pairs side bet
- 21+3 side bet

### Split rules

- One split maximum
- An additional equal wager is required
- Each split hand is played and settled independently
- Split aces receive one additional card each
- Split-hand results are tracked separately in the activity ledger

### Double Down

- Available on a fresh two-card hand when the player has enough credits
- Adds a second equal wager
- Deals exactly one card
- Automatically stands afterward

### Insurance

When the dealer shows an Ace, the player may place an insurance wager equal to half the current main wager. Insurance pays **2:1** if the dealer has Blackjack.

### Surrender

Before taking another action on the original two-card hand, the player may surrender and receive half of the main wager back.

### Perfect Pairs

| Result | Odds |
|---|---:|
| Mixed pair | 6:1 |
| Colored pair | 12:1 |
| Perfect pair | 25:1 |

A six-deck shoe allows a true same-rank, same-suit Perfect Pair.

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

European single-zero Roulette (`0–36`) now supports:

- Straight-up number bets — 35:1
- Red / Black — 1:1
- Odd / Even — 1:1
- 1–18 / 19–36 — 1:1
- Dozens — 2:1
- Columns — 2:1
- Clickable number board
- Animated wheel result presentation

## Neon Reels Slots

The original three-symbol slot machine has been upgraded to a **five-reel, three-row** machine with:

- Seven paylines
- Weighted symbols
- Wild symbol (`⭐`)
- Scatter symbol (`✨`)
- Three or more scatters awarding free spins
- Multiple symbol payout tiers
- Reel animation
- Bonus tracking

## Dice

- Two six-sided dice
- Choose **Low (2–6)** or **High (8–12)**
- Seven loses
- Correct prediction pays 1:1

## Trivia Rescue

Trivia Rescue is both a general-knowledge game and a bankroll-recovery mechanic.

### Reward ladder

| Correct answers in a row | Cash-out value |
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

- First correct answer creates a $10 pot
- Each consecutive correct answer doubles the pot
- The player may cash out after any correct answer
- One wrong answer wipes the uncashed pot
- Ten correct answers automatically cash out $5,120
- Trivia can be used to recover from a $0 bankroll

### Trivia improvements

- **200-question active pool**
- Mostly easy/common-knowledge questions
- Medium and hard questions mixed into later streak positions
- Categories:
  - General
  - Geography
  - Science
  - Sports
  - Math
  - History & Culture
  - Technology
- Persistent no-repeat tracking by category

# Player progression

## XP and levels

Settled gameplay grants XP. Levels unlock player titles and cosmetic themes.

Example progression includes:

- Rookie
- Player
- Card Sharp
- High Roller
- Vault Elite
- Neon Legend

Higher levels unlock additional visual themes such as **Midnight Purple** and **High Roller Gold**.

## Achievements

Achievements include milestones such as:

- First settled game
- First Blackjack win
- Perfect Pair hit
- 10-question Trivia streak
- $5,000 bankroll
- 100 settled games
- Five-game win streak
- $1,000+ single net win
- Exact-number Roulette win
- Slots bonus trigger
- Winning after Split
- Winning after Double Down
- Recovering from $0 through Trivia Rescue
- Completing a daily challenge
- Reaching player level 5

Achievements award XP and persist locally.

## Daily challenges

A challenge is generated from the user's local calendar date. Examples include:

- Settle 10 game results
- Win three Blackjack hands
- Win two Roulette bets
- Win three slot spins
- Answer five trivia questions correctly
- Win a doubled-down Blackjack hand
- Win after splitting

Completing the challenge automatically awards **$100 virtual credits + 100 XP**.

# Analytics

The dashboard and Player Profile include:

- Current wallet balance
- Rolling 24-hour P/L
- Rolling 7-day P/L
- Rolling 30-day P/L
- Lifetime net result
- Biggest win
- Biggest loss
- Best win streak
- Favorite game
- Win rate
- Per-game plays, wins, losses, and net result
- Trivia best streak
- SVG bankroll chart for 24H / 7D / 30D / All Time

# Save system

## Local persistence

Core save key:

```text
neon-vault-save-v1
```

Progression/settings key:

```text
neon-vault-meta-v2
```

Money is stored internally in **integer cents** to avoid floating-point currency errors.

## Export / Import

The Player Profile can export the complete save to a JSON file. The JSON contains:

- Wallet
- History
- Analytics ledger
- XP and level progress
- Achievements
- Daily challenge progress
- Preferences
- Trivia no-repeat state

The Import Save feature validates the required save structure before replacing the browser's current local progress.

# Randomness

Casino outcomes use the browser's Web Crypto API:

```js
crypto.getRandomValues(...)
```

The project uses rejection sampling and Fisher-Yates shuffling instead of `Math.random()` for game outcomes.

# Accessibility and UX

- Responsive desktop/mobile design
- Native buttons, inputs, and selects
- Reduced-motion preference
- Optional sound effects generated with Web Audio
- Visible status text in addition to color
- Clear virtual-credit disclaimer
- Large touch-friendly controls on mobile

# Project structure

```text
Neon-Vault/
├── index.html
├── style.css
├── creator.css
├── pro.css
├── app.js
├── shoe.js
├── blackjack-actions.js
├── blackjack-pro.js
├── trivia-questions.js
├── trivia-balanced.js
├── trivia-pro.js
├── pro-core.js
├── games-pro.js
├── boot.js
├── ARCHITECTURE.md
├── package.json
├── tests/
│   └── smoke.test.cjs
└── .github/
    └── workflows/
        └── quality.yml
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for a detailed explanation of the runtime layers, persistence model, and design decisions.

# Local development

No framework or build step is required to run the site.

You can open `index.html` directly or serve the directory with any local static server.

For project quality checks, install Node.js 20+ and run:

```bash
npm run check
npm test
```

`npm run check` validates JavaScript syntax.

`npm test` runs project smoke tests that verify critical files, feature wiring, crypto RNG usage, Blackjack actions, enhanced Roulette/Slots rules, Trivia categories, and progression features.

# Continuous integration

GitHub Actions runs the syntax and smoke-test suite automatically on:

- pushes to `main`
- pull requests targeting `main`

This helps prevent future feature changes from silently breaking the deployed application.

# Hosting

NEON VAULT is deployed through GitHub Pages from the `main` branch.

Live site:

https://dokeefe414.github.io/Neon-Vault/

# Design notes

The project intentionally remains **framework-free** to demonstrate browser-native JavaScript, DOM rendering, persistent local state, game-state design, transaction accounting, analytics, and responsive UI engineering without depending on a frontend framework.

The current version is designed as a static GitHub Pages application. A future account/cloud-save system would require a real backend or trusted external authentication/persistence service; secrets should never be embedded in client-side code.

---

**NEON VAULT is an entertainment/educational simulation using fictional virtual credits only.**
