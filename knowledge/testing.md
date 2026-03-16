# Testing

## Philosophy

Crafted and effective over comprehensive. Quality over quantity.

- No coverage thresholds — they incentivize padding, not meaningful tests
- Test behavior and outcomes, not implementation details

## What to test exhaustively

- **Game logic** (`game-logic.ts`, `hint-utils.ts`, `constants.ts`) — business-critical rules (peek=retry, auto-flip, scoring, deck building)
- **Pure functions** — deterministic, easy to test, high value

## What to test at behavior level

- **Hooks** (`useAuth`, `useGame`) — test state transitions and outcomes, not internal mechanics
- **Components** — test what the user sees and interacts with, not internals

## What to avoid

- Don't mock storage adapters for unit tests if it creates false confidence — prefer integration-style tests against a real Firebase emulator if storage logic needs testing
- Don't test styling or layout

## Stack

- Vitest + `@testing-library/preact` + jsdom
- Run: `npm run test` (single run) or `npm run test:watch`
