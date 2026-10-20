# NEON VAULT v5.7 — The Premier Experience

**[Play NEON VAULT](https://dokeefe414.github.io/Neon-Vault/)** · Created by Daniel O'Keefe

NEON VAULT is a responsive, installable, offline-capable browser casino **simulation using fictional credits only**. No real-money wagering, deposits, purchases, cash prizes, or credits of monetary value.

## What's new through v5.7

- **v5.4:** Blackjack dealing/settlement polish and direct side-bet payout audits.
- **v5.5:** Game records and optional Blackjack decision replays with stored hands; filters and saved session details.
- **v5.6:** Two fully playable new virtual-credit games: eight-deck Punto Banco Baccarat and five-card Jacks or Better Video Poker.
- **v5.7:** More avatars, unlockable cosmetic felt and card backs, badges, and new progression achievements.
- Virtual casino experience is strictly fictional-credit-only; no purchases, financial wagering or real prizes.

## Earlier additions

- Refined Blackjack table with staged card CSS, dealer/player separation, active-hand highlights, payout chips, betting tray, inline educational strategy hints and a standalone strategy trainer.
- Animated European Roulette wheel with an aligned result pocket, number betting board, outside bets and clarified win/loss summaries.
- Five-reel Slots animation with staggered stops, improved payline highlights, summarized results, wilds, scatters and free spins.
- Player name/avatar, cosmetic card backs/table felts/profile badges, and optional XP/style-token rewards.
- Major Trivia Rescue expansion: at least 100 distinct questions in every specialist category, difficulty balancing, randomized answer order, and no-repeat cycling with unseen progress.
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
- `src/core/baccarat.js` and `src/core/poker.js`: independently testable Baccarat and Video Poker payout/drawing engines
- `src/core/strategy.js`: six-deck Blackjack basic strategy advisor
- `src/core/simulation.js`: seeded deterministic simulations for QA
- `src/data/trivia-*.js`: category expansions and validated four-choice question factory
- `src/games/trivia-selection.js`: saved per-category no-repeat cycles and question selection
- `src/games/`: standalone game controllers
- `src/ui/views.js`, `src/ui/v5.js`, `src/ui/records.js`: screens, tutorials, analytics, saved game replays, player cosmetics
- `src/progression/`: achievements, daily and weekly challenges, session analytics
- `v5.css`, `v57.css`: additional visual system, animations, and cosmetics
- `tests/`: smoke, rule, simulation, and Playwright tests

## Stability and save protections

v5.1 commits completed Dice, Roulette and Slots bets as single durable wallet updates, prevents duplicate settlement when a unique ID is supplied, and warns if a second tab changes the same local wallet or profile. This is optimistic conflict detection, not a substitute for an atomic server-side transaction. Blackjack's in-progress wager and additional side bets remain a distinct persisted-hand workflow.

## Data / integrity

All virtual values are stored in integer cents and saved locally. Existing storage keys (`neon-vault-save-v1` and `neon-vault-meta-v2`) are retained across schema upgrades. Browser-local balances can be edited by players and are **not suitable for global leaderboards**. Authenticated cloud profiles and public rankings would require a server that owns transactions, generates/verifies game results, and stores an auditable leaderboard. No backend service or cloud-sync account is configured in v5.

Game payout logic is independent of animations. Production random outcomes use Web Crypto; seeded test simulations do not affect live gameplay. Strategy tips and simulations are educational and cannot guarantee wins.

### v5.6 Baccarat and Video Poker notes

Baccarat uses an eight-deck shuffled shoe and a pure rules module: Player and Banker naturals stand, Player draws on 0–5, and Banker follows the standard third-card table. Banker wins return stake plus 95% of the wager; Player returns twice the wager; Tie returns nine times the wager. Player/Banker bets push when the hand ties. Video Poker uses a fresh shuffled deck each hand and Jacks-or-Better paytable, with a 1-for-1 high-pair return, 9-for-1 full house and 800-for-1 royal flush. These rates are explicit virtual-credit paytable rules, not casino advice.

Video Poker holds an **unpaid draft** after Deal: abandoning, refreshing, or canceling before Draw does not charge credits. The wager is committed on Draw alongside the result. Blackjack hands retain their separately persisted wager/reload recovery path.

### History/replays

New settled rounds store additional metadata including cards, selected bets, and results so that the Records screen can reconstruct decisions. Prior versions' records are shown as summaries where replay metadata is unavailable. Replays are historical displays and never call the game RNG or change balances.
