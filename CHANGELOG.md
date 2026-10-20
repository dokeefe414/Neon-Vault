# NEON VAULT Changelog

## 5.7.0 — Collector's Vault
- Added more player avatars, collectible felt and card-back designs, and cosmetic titles.
- Expanded the achievement catalog for long-term play and the new game types.
- Added mobile and desktop regression tests for player customization and new achievements.

## 5.6.0 — Baccarat & Video Poker
- New eight-deck Punto Banco Baccarat with natural hands, automatic third-card rules, and banker 5% commission.
- New five-card Jacks or Better Video Poker with hold/draw selection, full paytable and one-deck hands.
- Both games integrate with the existing virtual-credit wallet, progression, records, and responsive navigation.
- Added deterministic Baccarat / Poker payout, category, straight, and side-bet unit tests.
- Video Poker does not debit an unfinished hand; the wager is settled only on Draw.

## 5.5.0 — Records & Replays
- Added a dedicated records screen with game filters, virtual wager/result history and recent sessions.
- Blackjack hands now record starting cards, decisions, and finishing hands for inspectable replays.
- Record replay details for Baccarat, Video Poker, Roulette, Dice and new Slots spins.
- Added an entry point to records from the Profile and Progress hub.
- Historical saved records remain supported; older results without card snapshots appear as summaries.

## 5.4.0 — Casino Polish and Game Audits
- More responsive Blackjack card-deal feedback and completed-hand result styling.
- Added direct tests for Perfect Pairs and 21+3 side-bet payouts, plus math/edge-case tests for new table rules.
- Refined game surface styling, accessible hold states, mobile card layouts, and reduced-motion behavior.


## 5.3.1 — Slots Wager Memory

- Slots retains the last paid wager after each spin rather than resetting to $25.
- Chip and manual wager changes carry through screen rerenders, navigation, and reloads.
- Free spins keep their triggering wager locked; after the bonus, the paid wager returns.
- Added desktop/mobile Playwright regression tests for repeated and chip-selected wagers.


## 5.3.0 — Trivia Variety Expansion

- Replaced the single 200-question bank with six distinct specialist expansions and a General pool drawing across every category.
- Every specialization (Geography, Science, Sports, Math, History & Culture, and Technology) now has at least 100 unique prompts with four distinct choices per question.
- Added difficulty variety and safer answer text rendering.
- Trivia now uses category-wide no-repeat cycles that survive reloads and category switching, including conversion of previously tracked difficulty-specific seen lists.
- Added per-category question counts and remaining-unseen progress displayed in Trivia Rescue.
- Answer order is shuffled each run without altering the correct answer.
- Expanded automated checks for bank uniqueness, choice validity, category coverage, old progress recovery and exhaustion behavior.



## 5.2.0 — The Casino Floor Polish

- Redesigned Blackjack table hierarchy with dealer reveal state, stronger player-hand indicators, wager chips, and clear result pills.
- Added explanatory Blackjack action tooltips and improved active-hand contrast.
- Centered Roulette outcomes accurately beneath the wheel pointer and created a visual outcome summary.
- Added structured Slots win summaries, bolder payline emphasis, and theme-aware machine highlights.
- Refined chip trays, felt surfaces, responsive game panels, wallet typography, and accessibility/reduced motion.
- Added mobile and desktop Playwright coverage for the v5.2 visuals and the v5.1 wager fixes.


## 5.1.0 — Stability and Accounting

- Corrected chip-controlled Roulette wager persistence and added wager change propagation.
- Fixed the hard-10 Blackjack strategy tip for a pair of fives against a strong dealer card.
- Fixed the weekly calendar to calculate the Monday key in local time; weekly Style Lounge now opens the actual wardrobe.
- Dice, Roulette, and Slots now atomically commit a finished wager/result as one local wallet transaction.
- Added idempotent settlement keys and proactive optimistic conflict detection for stale tabs, plus a visible cross-tab reload warning.
- Strengthened JSON save import validation and limited user-uploaded save file size.
- Added deterministic wallet, save, strategy and weekly-date regression tests.


## 5.0.0 — The Premier Experience

- Enhanced Blackjack visuals, optional inline basic-strategy hints, and a full strategy practice screen.
- Animated European roulette wheel with numbers in physical wheel order.
- Five-reel staggered slot reveal, payline highlights, and persistent free spins.
- Unified casino betting-chip tray with Undo and Reset across wager games.
- Local custom player names, avatars, card backs, table felts and profile badges, plus style-token cosmetics.
- Optional weekly challenges awarding XP and cosmetic tokens.
- Per-game analytics, average wagers, loss streaks, and daily net bar charts.
- How to Play guide and sound-volume controls, with reduced-motion support.
- Pure Roulette/Slots rule engines and seeded simulation QA.
- Expanded unit and Playwright desktop/mobile regression coverage.
- Versioned v5 save migrations preserve the v4 bankroll and history; offline cache bumped to v5.
- Cloud accounts and public leaderboards require a secure authenticated backend and are not represented as live features.

## 4.0.0 — Visual Systems & Reliability

- Rebuilt Midnight Purple and High Roller Gold as full-interface themes instead of accent-only swaps.
- Added theme-aware backgrounds, sidebars, panels, cards, tables, controls, charts, shadows, and Blackjack card backs.
- Added dedicated mobile bottom navigation with Games and Progress hubs.
- Added installable PWA manifest, app icon, and offline service worker cache.
- Added versioned v4 save migrations while retaining legacy localStorage keys.
- Added current-session analytics to the Profile page.
- Added deterministic RNG injection for exact game-rule testing while retaining Web Crypto in production.
- Added deterministic Node rule tests for RNG, Blackjack Ace totals, and Roulette payouts.
- Added ESLint and Prettier developer tooling.
- Added dependency auditing to GitHub Actions.
- Expanded Playwright coverage for Midnight Purple persistence, PWA assets, v4 saves, and mobile navigation.
- Added accessibility improvements including a skip link, stronger focus states, larger mobile touch targets, and navigation landmarks.

## 3.1.0 — Browser Regression Testing

- Added Playwright testing on desktop Chromium and a mobile touch viewport.
- Added saved-wallet, navigation, gameplay, export, and active-round browser regression tests.
- Added failure screenshots, traces, video, and HTML reports in CI.

## 3.0.0 — Modular Refactor

- Replaced the legacy global override architecture with a single ES-module entry point.
- Split storage, UI, progression, data, and games into independent modules.
- Preserved existing wallet/history and progression storage keys.
- Removed unused legacy runtime files.
