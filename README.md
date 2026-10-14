# ◆ NEON VAULT — Virtual Casino

**NEON VAULT** is a polished browser-based virtual casino built with vanilla **HTML, CSS, and JavaScript**. The project was designed to be more than a basic game demo: it combines several independent game systems with a shared wallet, persistent local progress, rolling profit/loss analytics, an activity ledger, responsive UI design, and secure browser-based random number generation.

> **Virtual credits only.** This project does not support real-money gambling, deposits, purchases, withdrawals, or cash-outs. Credits have no monetary value.

## Project goals

The initial goal was to create a game that could live entirely on GitHub and run directly in a browser while still having enough structure to demonstrate real software-design decisions. The main requirements were:

1. Start every new player with **$1,000 in virtual credits**.
2. Provide a visual **main menu/dashboard** where the player can choose a game.
3. Include multiple playable games rather than one trivial mini-game.
4. Use one shared wallet across all games.
5. Save the player's balance and history locally so progress survives page reloads.
6. Calculate net profit/loss over the rolling **last 24 hours, 7 days, and 30 days**.
7. Keep the interface responsive and visually consistent across desktop and mobile devices.
8. Make the project easy to host using **GitHub Pages** with no build system or backend required.

## Current features

### Main dashboard

The dashboard is the central navigation area for the project. It displays:

- Current virtual balance
- Net profit/loss for the last 24 hours
- Net profit/loss for the last 7 days
- Net profit/loss for the last 30 days
- Game-selection cards
- Navigation to the player's activity ledger

The profit windows are **rolling time periods**, not calendar-day resets.

### Blackjack

- Standard 52-card deck generated for each hand
- Fisher-Yates shuffle
- Hit and stand actions
- Ace adjustment from 11 to 1 when needed
- Dealer draws until at least 17
- Natural blackjack pays 3:2
- Standard win pays 1:1
- Push returns the original wager
- Dealer and player totals are calculated automatically

Current limitations: splitting, insurance, surrender, and double-down are not implemented yet.

### Roulette

- European-style single-zero wheel (`0-36`)
- Red or black bets
- Exact-number bets
- Red/black pays 1:1
- Straight-up number bets pay 35:1

### Slots

- Three independent reels
- Six possible symbols per reel
- Matching-symbol payout logic
- Higher payouts for special symbols such as `7` and diamond
- Partial reward for two matching symbols

### Dice

- Two six-sided dice
- Player chooses **Low (2-6)** or **High (8-12)**
- A total of seven loses
- Winning predictions pay 1:1

### Activity ledger

Every completed round records:

- Timestamp
- Game played
- Amount wagered
- Payout
- Net profit/loss

The Activity screen displays the player's most recent results and makes the source of the dashboard statistics visible.

## Development process

### Stage 1 — Define the shared game system

The project began with the idea of a virtual casino containing several games. Instead of allowing each game to manage its own money independently, the application was designed around a **single shared state object** containing the player's wallet and history.

This means Blackjack, Roulette, Slots, and Dice all interact with the same balance and settlement system.

### Stage 2 — Build the application shell

`index.html` defines the application's permanent shell:

- Sidebar navigation
- Brand/header area
- Wallet display
- Main content region
- Toast notification area

The individual game screens are rendered dynamically by JavaScript into the main content region rather than loading separate HTML pages.

### Stage 3 — Create the visual design

`style.css` provides the entire visual system. The design uses:

- Dark casino-inspired background
- Neon mint accent color
- Gradient panels
- Responsive cards
- Game-table styling
- Playing-card styling
- Slot-reel presentation
- Mobile breakpoints
- Profit/loss color states

The layout changes at smaller widths so the project remains usable on tablets and phones.

### Stage 4 — Build shared wallet and betting logic

The wallet is stored internally in **integer cents**, not floating-point dollars.

```js
const START = 100000; // $1,000.00
```

Using cents prevents common floating-point money errors such as `0.1 + 0.2 !== 0.3`.

Before a round starts, `stake()` validates that:

- The wager is a whole-dollar amount
- The wager is at least $1
- The wager does not exceed the configured maximum
- The player has enough credits available

The wager is then debited before the outcome is generated.

### Stage 5 — Create a common settlement system

All games settle through the same transaction logic. When a round finishes, the program calculates:

```text
net = payout - original wager
```

Examples:

| Result | Wager | Payout | Net |
|---|---:|---:|---:|
| $25 loss | $25 | $0 | -$25 |
| $25 even-money win | $25 | $50 | +$25 |
| $25 push | $25 | $25 | $0 |

This shared settlement model keeps the analytics consistent across every game.

### Stage 6 — Add local persistence

The player state is serialized into browser `localStorage` under:

```text
neon-vault-save-v1
```

The save object contains the player's current balance, analytics ledger, and visible game history.

A simplified saved round looks like:

```js
{
  at: 1792000000000,
  game: "Roulette",
  bet: 2500,
  payout: 5000,
  net: 2500
}
```

When the application reloads, `safeLoad()` attempts to restore the saved state. If the stored data is missing or invalid, the application creates a fresh player state with a $1,000 balance.

### Stage 7 — Add rolling profit analytics

Each ledger entry contains a timestamp and net result. The dashboard calculates a time-window total by summing only entries newer than the selected cutoff.

Conceptually:

```text
24-hour profit = sum(net results from now - 24 hours through now)
7-day profit   = sum(net results from now - 7 days through now)
30-day profit  = sum(net results from now - 30 days through now)
```

Because the original timestamps are retained, the numbers update naturally as old rounds fall outside each rolling window.

### Stage 8 — Implement secure random outcomes

Game outcomes use the browser's `crypto.getRandomValues()` API rather than `Math.random()`.

The `rand()` helper also uses **rejection sampling** so reducing a random integer into a smaller range does not introduce modulo bias. Blackjack then uses that random generator in a Fisher-Yates shuffle.

This does not make NEON VAULT a real gambling platform; it simply provides stronger randomization for an educational game simulation.

### Stage 9 — Add responsive navigation and history

The final initial version connected all game screens to a common navigation system and added an Activity page so the player can inspect recent results instead of seeing only an aggregate balance.

## Architecture

The initial version intentionally avoids frameworks so the application architecture is easy to inspect.

```text
Neon-Vault/
├── index.html     # Permanent application shell and navigation
├── style.css      # Theme, responsive layout, cards, tables, game visuals
├── app.js         # State, persistence, analytics, game engines, rendering
├── .gitignore     # Local/editor files excluded from Git
└── README.md      # Project documentation
```

### Important JavaScript responsibilities

| Function / area | Responsibility |
|---|---|
| `safeLoad()` | Loads and validates saved browser data |
| `save()` | Persists the current state to localStorage |
| `stake()` | Validates a wager |
| `debit()` | Removes the wager from the current wallet |
| `log()` | Settles a round and records its net result |
| `profit()` | Calculates rolling profit/loss windows |
| `render()` | Builds the dashboard, activity view, and game screens |
| `rand()` | Generates unbiased random integers |
| `shuffle()` | Randomizes the Blackjack deck |
| Blackjack functions | Deck, totals, hit/stand, dealer behavior, settlement |
| Roulette function | Wheel outcome and payout handling |
| Slots function | Reel outcome and symbol payout handling |
| Dice function | Dice outcome and high/low settlement |

## State flow

A normal game round follows the same high-level process:

```text
Player chooses game
        ↓
Player enters wager
        ↓
stake() validates wager
        ↓
debit() removes wager
        ↓
Game generates outcome
        ↓
Game determines payout
        ↓
log() credits payout + records net result
        ↓
save() writes updated state to localStorage
        ↓
Dashboard analytics reflect the new result
```

This shared flow keeps wallet behavior separate from most game-specific rules.

## Local save behavior

Progress is stored only in the browser that is running the application.

That means:

- Refreshing the page keeps progress.
- Closing and reopening the browser normally keeps progress.
- Clearing site data can erase progress.
- Private/incognito windows may not retain progress.
- Opening the game on another computer starts a separate save.
- `localStorage` can be edited by the player, so it is not a secure server-side account database.

No personal information is required and no game history is sent to a backend server.

## Running locally

There are no npm packages, dependencies, or build steps.

### Option 1 — Open the file directly

Open `index.html` in a modern browser.

### Option 2 — Use a local development server

From the project directory:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Using a local server is recommended because browser storage behavior is more consistent when the project has a normal origin.

## GitHub Pages deployment

Because NEON VAULT is a static frontend project, it can be hosted directly from GitHub Pages.

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch.
5. Select `/ (root)` as the folder.
6. Save the configuration.
7. GitHub will generate a public Pages URL once deployment completes.

No backend hosting is required for the current version.

## Testing checklist

Useful manual tests for the current build include:

- Verify a new save begins at exactly $1,000.00.
- Verify a wager cannot exceed the current balance.
- Verify a losing wager decreases the wallet correctly.
- Verify a winning even-money wager increases net balance by the wager amount.
- Verify a Blackjack push produces a $0 net result.
- Verify Blackjack aces change from 11 to 1 when necessary.
- Verify roulette zero is neither red nor black.
- Verify exact-number roulette wins return 36 times the wager including the original stake.
- Verify Dice total seven always loses.
- Verify the page reload preserves the wallet and history.
- Verify recent results affect the 24-hour, 7-day, and 30-day analytics.
- Verify the responsive layout works at desktop and mobile widths.

## Future improvements

The project has room to grow substantially. Planned or possible additions include:

- Blackjack double-down and split support
- Multi-deck Blackjack shoe
- Animated card dealing
- Animated roulette wheel
- Animated slot reels
- Sound effects with a mute setting
- Per-game win rate and profit statistics
- Interactive profit charts
- Achievement system
- Daily virtual-credit rewards
- Import/export save files
- Player-selectable themes
- Automated unit tests for payout rules
- Automated tests for rolling analytics
- Accessibility improvements
- Reduced-motion mode
- Optional backend accounts for synchronized progress

## Technical decisions

### Why vanilla JavaScript?

The project does not need a large framework for its current size. Vanilla JavaScript keeps deployment simple, removes package-management requirements, and makes the game logic easy to inspect directly in the repository.

### Why localStorage?

The requirement was to save progress locally. `localStorage` is built into modern browsers, requires no server, persists across reloads, and works well for a single-player virtual-credit game.

### Why one shared ledger?

All games affect the same wallet, so a shared transaction history provides one consistent source for analytics. The application does not need separate 24-hour, 7-day, and 30-day counters; those values can always be recomputed from timestamped results.

### Why integer cents?

Representing money as cents avoids floating-point precision problems and makes transaction calculations predictable.

## Disclaimer

NEON VAULT is an educational and entertainment software project. All credits are fictional and have no cash value. The project contains no functionality for real-money wagering, deposits, withdrawals, purchases, or cash-outs.
