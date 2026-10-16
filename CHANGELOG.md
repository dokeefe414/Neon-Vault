# NEON VAULT Changelog

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
