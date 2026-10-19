# NEON VAULT v5.2 — The Premier Experience

**[Play NEON VAULT](https://dokeefe414.github.io/Neon-Vault/)** · Created by Daniel O'Keefe

NEON VAULT is a responsive, installable, offline-capable browser casino **simulation using fictional credits only**. No real-money wagering, deposits, purchases, cash prizes, or credits of monetary value.

## What's new in v5.1 and v5.2

- Refined Blackjack table with staged card CSS, dealer/player separation, active-hand highlights, payout chips, betting tray, inline educational strategy hints and a standalone strategy trainer.
- Animated European Roulette wheel with an aligned result pocket, number betting board, outside bets and clarified win/loss summaries.
- Five-reel Slots animation with staggered stops, improved payline highlights, summarized results, wilds, scatters and free spins.
- Player name/avatar, cosmetic card backs/table felts/profile badges, and optional XP/style-token rewards.
- Optional weekly challenges, detailed analytics, accessible tutorial, sound volume and reduced-motion settings.
- Save export/import, v5 migration compatibility, session tracking, PWA/offline support, and Blackjack reload recovery.

## Development

Node.js 20+:

```bash
npm install
npm run check
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Serve with `python3 -m http.server 4173` and open http://localhost:4173 for local browser development.

## Structure

- `src/core/store.js`: virtual wallet accounting, migration, and persistence
- `src/core/random.js`: cryptographic RNG and injectable test source
- `src/core/rules.js`: pure Roulette and Slots rules
- `src/core/strategy.js`: six-deck Blackjack basic strategy advisor
- `src/core/simulation.js`: seeded deterministic simulations for QA
- `src/games/`: standalone game controllers
- `src/ui/views.js`, `src/ui/v5.js`: screens, tutorials, analytics, player cosmetics
- `src/progression/`: achievements, daily and weekly challenges, session analytics
- `v5.css`: additional visual system, animations, and cosmetics
- `tests/`: smoke, rule, simulation, and Playwright tests

## Stability and save protections

v5.1 commits completed Dice, Roulette and Slots bets as single durable wallet updates, prevents duplicate settlement when a unique ID is supplied, and warns if a second tab changes the same local wallet or profile. This is optimistic conflict detection, not a substitute for an atomic server-side transaction. Blackjack's in-progress wager and additional side bets remain a distinct persisted-hand workflow.

## Data / integrity

All virtual values are stored in integer cents and saved locally. Existing storage keys (`neon-vault-save-v1` and `neon-vault-meta-v2`) are retained across schema upgrades. Browser-local balances can be edited by players and are **not suitable for global leaderboards**. Authenticated cloud profiles and public rankings would require a server that owns transactions, generates/verifies game results, and stores an auditable leaderboard. No backend service or cloud-sync account is configured in v5.

Game payout logic is independent of animations. Production random outcomes use Web Crypto; seeded test simulations do not affect live gameplay. Strategy tips and simulations are educational and cannot guarantee wins.
