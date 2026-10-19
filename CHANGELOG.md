# NEON VAULT Changelog

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
