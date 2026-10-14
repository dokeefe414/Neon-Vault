# ◆ NEON VAULT — Virtual Casino

**Created by Daniel O'Keefe**

NEON VAULT is a browser-based virtual casino built with **HTML, CSS, and vanilla JavaScript**. It combines several casino-style games with one shared virtual wallet, local save data, rolling profit/loss analytics, an activity ledger, Blackjack side bets, and a skill-based trivia recovery system.

> **Virtual credits only.** NEON VAULT does not support real-money gambling, deposits, purchases, withdrawals, or cash-outs. Credits have no monetary value.

## Main goals

The project was designed to be more than a small one-game demo. The main goals are to:

1. Start every new player with **$1,000 in virtual credits**.
2. Provide a polished main menu where players choose between several games.
3. Use one shared wallet across all games.
4. Save progress locally in the browser.
5. Track profit/loss over the rolling **last 24 hours, 7 days, and 30 days**.
6. Give players a way to rebuild their bankroll if they reach $0.
7. Keep the project easy to run and host using GitHub Pages.

## Games and features

### Dashboard

The dashboard displays:

- Current balance
- Net profit/loss over the last 24 hours
- Net profit/loss over the last 7 days
- Net profit/loss over the last 30 days
- Cards for all available games
- Activity history
- A special Trivia Rescue prompt if the balance reaches $0

The profit windows are rolling time periods, not calendar-day resets.

## Blackjack

Blackjack uses a **six-deck shoe** so the Perfect Pairs side bet can include true same-rank, same-suit pairs.

Main Blackjack rules:

- Dealer stands on 17
- Aces count as 1 or 11
- Standard win pays 1:1
- Natural Blackjack pays 3:2
- Push returns the main wager
- Hit and Stand controls

### Perfect Pairs side bet

The player may place an optional side bet before the hand begins.

| Result | Odds |
|---|---:|
| Mixed pair | 6:1 |
| Colored pair | 12:1 |
| Perfect pair | 25:1 |

A **mixed pair** has the same rank but opposite card colors. A **colored pair** has the same rank and same color but different suits. A **perfect pair** has the same rank and suit, which is possible because Blackjack uses multiple decks.

### 21+3 side bet

The player's first two cards and the dealer's up-card form a three-card poker hand.

| Hand | Odds |
|---|---:|
| Flush | 5:1 |
| Straight | 10:1 |
| Three of a kind | 30:1 |
| Straight flush | 40:1 |
| Suited three of a kind | 100:1 |

The Blackjack main wager and each side bet are recorded independently in the activity ledger so wallet changes and analytics remain accurate.

## Roulette

- European single-zero wheel (`0-36`)
- Red or black bets
- Exact-number bets
- Red/black pays 1:1
- Straight-up number bet pays 35:1

## Slots

- Three reels
- Six possible symbols
- Matching-symbol payout system
- Larger rewards for special symbols
- Partial reward for two matching symbols

## Dice

- Two six-sided dice
- Choose **Low (2-6)** or **High (8-12)**
- A total of 7 loses
- Correct prediction pays 1:1

## Bet controls

Each casino game now includes quick wager controls:

- **½ BET** — reduces the current wager by half, rounded down to a whole dollar
- **2× BET** — doubles the current wager without going above the player's available balance or the configured wager limit

These controls make it faster to adjust bet sizes without retyping the amount.

# Trivia Rescue

Trivia Rescue is the bankroll recovery system and can be played even when the player has no credits left.

The player answers general-knowledge multiple-choice questions and builds an uncashed reward streak.

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

- The first correct answer creates a **$10** pot.
- Every additional correct answer doubles the current pot.
- The player may **cash out at any time** after getting at least one question correct.
- A wrong answer resets the uncashed pot to **$0**.
- A wrong answer starts a fresh 10-question streak attempt.
- The maximum streak is **10 correct answers**.
- Reaching 10 automatically cashes out **$5,120** in virtual credits.
- Trivia winnings are added to the same wallet used by every casino game.

This gives a player who reaches $0 a skill-based way to recover instead of being permanently stuck.

## Shared wallet and settlement system

The wallet is stored internally in **integer cents** rather than floating-point dollars.

```js
const START = 100000; // $1,000.00
```

Using integer cents avoids normal JavaScript floating-point money problems.

Casino rounds follow the same basic flow:

```text
Player selects a game
        ↓
Player enters or adjusts wager
        ↓
Wager is validated
        ↓
Credits are debited
        ↓
Game generates an outcome
        ↓
Payout is calculated
        ↓
Transaction is recorded
        ↓
Updated state is saved locally
        ↓
Dashboard analytics update
```

Net result is calculated as:

```text
net = payout - wager
```

Trivia cash-outs are recorded as a $0 wager with a positive payout.

## Local save system

Player data is stored in browser `localStorage` using:

```text
neon-vault-save-v1
```

Saved information includes:

- Current wallet balance
- Timestamped analytics ledger
- Detailed activity history

This means refreshing or reopening the site normally keeps the player's progress.

Important limitations:

- Clearing browser site data can erase the save.
- Private/incognito windows may not retain progress.
- Another device or browser has a separate save.
- `localStorage` can be edited manually, so this is not intended to be a secure online account system.

## Rolling profit analytics

Every settled transaction records a timestamp and net result.

The dashboard recalculates:

```text
24-hour profit = sum of net results from the last 24 hours
7-day profit   = sum of net results from the last 7 days
30-day profit  = sum of net results from the last 30 days
```

Older transactions automatically fall outside these windows as time passes.

## Randomness

Casino outcomes use the browser's `crypto.getRandomValues()` API instead of `Math.random()`.

The random helper uses rejection sampling to avoid modulo bias, and the Blackjack shoe is randomized using Fisher-Yates shuffling.

This improves randomness for the simulation but does not make NEON VAULT a real gambling platform.

## Project structure

```text
Neon-Vault/
├── index.html     # Main application shell and navigation
├── style.css      # Theme, layout, cards, tables, responsive styling
├── app.js         # State, analytics, trivia, and game logic
├── shoe.js        # Six-deck Blackjack shoe used by Perfect Pairs
├── .gitignore     # Local/editor files excluded from Git
└── README.md      # Project documentation
```

## Important JavaScript areas

| Function / area | Responsibility |
|---|---|
| `safeLoad()` | Restores saved browser data |
| `save()` | Writes state to localStorage |
| `stake()` | Validates main wagers |
| `sideStake()` | Validates Blackjack side bets |
| `debit()` | Removes wagered credits |
| `log()` | Records payouts and net results |
| `profit()` | Calculates rolling analytics |
| `adjustBet()` | Handles half/double wager buttons |
| `render()` | Builds dashboard and game interfaces |
| `rand()` | Generates unbiased random integers |
| `shuffle()` | Fisher-Yates randomization |
| Trivia functions | Question runs, streaks, pot doubling, cash-out |
| Blackjack functions | Main hand, Perfect Pairs, 21+3, settlement |
| Roulette function | Wheel and wager settlement |
| Slots function | Reel outcomes and multipliers |
| Dice function | High/low outcome settlement |

## Running locally

No packages or build process are required.

You can open `index.html` directly, or run a small local web server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## GitHub Pages

The project is designed to run directly from GitHub Pages.

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select `main`.
5. Select `/ (root)`.
6. Save.

The live site is:

```text
https://dokeefe414.github.io/Neon-Vault/
```

## Testing checklist

Useful tests include:

- New players begin with exactly $1,000.
- Half and double bet buttons update the wager correctly.
- Wagers cannot exceed the current balance.
- Blackjack pushes return the main wager.
- Aces correctly change from 11 to 1 when needed.
- Perfect Pairs evaluates mixed, colored, and perfect pairs correctly.
- 21+3 identifies flushes, straights, trips, straight flushes, and suited trips.
- Side-bet payouts are added independently from the Blackjack main hand.
- Roulette zero is neither red nor black.
- Exact-number roulette returns 36× the wager including the original stake.
- Dice total 7 loses.
- Trivia starts at $10 after the first correct answer.
- Trivia doubles after each consecutive correct answer.
- Trivia can cash out before 10 questions.
- A wrong trivia answer wipes the uncashed pot.
- Ten correct trivia answers produce $5,120.
- Refreshing the page preserves wallet and history.
- 24-hour, 7-day, and 30-day analytics update correctly.

## Future improvements

Possible next additions include:

- Blackjack double-down
- Blackjack split hands
- Insurance and surrender
- More Blackjack side bets
- Larger trivia question bank and categories
- Difficulty levels for trivia
- Animated card dealing
- Animated roulette wheel
- Animated slot reels
- Sound effects and mute control
- Per-game statistics
- Interactive profit charts
- Achievements
- Daily virtual-credit challenges
- Save import/export
- Automated unit tests
- Accessibility improvements
- Reduced-motion mode
- Optional account-based cloud saves

## Disclaimer

NEON VAULT is an educational and entertainment software project. All credits are fictional and have no cash value. The project contains no real-money wagering, deposits, withdrawals, purchases, or cash-outs.
