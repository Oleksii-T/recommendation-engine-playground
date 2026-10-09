# Implementation validation

Validated on 9 October 2026 against the user's existing development server at `http://localhost:8080/`. The server was left running. Browser tests use isolated contexts, so their players and resets do not affect regular browser sessions.

## Checks

Final results: **27 unit tests passed, 15 Playwright tests passed, lint passed, and the production build passed without warnings.** All twenty screenshots were refreshed after the final implementation. Playwright reused the Chromium executable already installed on this device through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

- Native Node unit tests cover deterministic generation, amount bounds, all outcome buckets, distribution frequencies, input limits, UTC daily aggregation, rollback and duplicate handling, recency, engagement caps, favourite deduplication, attribute normalization, metadata weight renormalization, V1 independence from history, V2 composition and fallback, outcome neutrality, platform/status eligibility, provider diversity, cold/bonus-only states, input fingerprints, trace consistency, configuration validation, deterministic demos, and JSON import validation.
- Playwright exercises the Players table and its four columns; a name-only creation modal and redirect; player CRUD and deletion cancellation; direct player URLs and unknown-player handling; keyboard-accessible primary tabs; paginated activity and player isolation; one subtab per immutable simulation result, run selection after reload, and engine changes while viewing saved results; preview/confirmation; round correction, rollback, and batch deletion; V2 groups and explanation traces; profile disclosure; paired runs with identical fingerprints; formula validation and presets; export/reset/import/reload; invalid imports; every catalogue filter and sorting; all scenarios; operation while offline; mobile/tablet navigation and horizontal overflow; drawer focus and Escape; corrupted storage and quota failure.
- Production compilation and ESLint are checked independently.
- Advanced formula legends are checked for all 24 V2 parameters and 5 V1 parameters, plus both preset controls. Every legend includes an explanation, an example and relevant limits. Browser tests verify keyboard opening, Escape and close-button dismissal, focus restoration, mobile containment, unchanged formula values, engine switching, and continued preset/validation behaviour.
- Players and player detail pages use the existing header as their only page title. Browser assertions verify there is no duplicate content title or player-page back link; the header title updates after creation, rename, and reload. Desktop and mobile screenshots were refreshed and reviewed after this cleanup.
- Simulation controls are checked for newest-first ordering, removal of the redundant heading, cancellation and confirmation of deletion, removal of a comparison, selection after deleting the active/final run, stable labels for older saved data, and persistence. Sixteen runs verify that subtabs stay on one horizontally scrollable row, the New simulation button stays on the left, keyboard selection scrolls into view, and the page fits both desktop and 390px mobile viewports.

## Screenshot review

| Screenshot | What was reviewed |
| --- | --- |
| [Empty workspace](../artifacts/screenshots/01-empty-workspace.png) | Players table, Add Player action, persistent navigation, and empty state |
| [Batch preview](../artifacts/screenshots/02-batch-preview.png) | Required generator controls, range and totals, timestamp bounds, sample rows |
| [Personalized results](../artifacts/screenshots/03-personalized-results.png) | Taste profile, 2+6+2 composition, scores and reasons |
| [Recommendation explanation](../artifacts/screenshots/04-recommendation-explanation.png) | Drawer, true weighted contributions, plain-language explanation |
| [Engine comparison](../artifacts/screenshots/05-engine-comparison.png) | Overlap, rank changes, provider/category counts, popularity and content-match metrics |
| [Catalogue](../artifacts/screenshots/06-game-catalogue.png) | Filters, game identity, status and deliberate horizontal table scrolling |
| [Mobile simulation](../artifacts/screenshots/07-mobile-simulations.png) | 390px player tabs, saved-run subtabs, and contained scrolling |
| [Mobile catalogue](../artifacts/screenshots/08-mobile-catalogue.png) | Small-screen filters and contained table scrolling |
| [Tablet simulation](../artifacts/screenshots/09-tablet-simulations.png) | 820px layout and collapsed navigation |
| [Creation modal](../artifacts/screenshots/10-player-creation-modal.png) | One name field, focus management, Cancel and Add Player actions |
| [Players table](../artifacts/screenshots/11-players-table.png) | Names, bet/win totals and record counts, last simulation timestamps |
| [General info](../artifacts/screenshots/12-player-general.png) | Player metadata, summary, favourites, and management actions |
| [Bets and Wins](../artifacts/screenshots/13-bets-wins.png) | Paired outcomes, round editing, and pagination |
| [Simulation run subtabs](../artifacts/screenshots/14-simulation-runs.png) | Multiple immutable runs, selected run and New simulation action |
| [Scrollable simulation tabs](../artifacts/screenshots/15-scrollable-simulation-tabs.png) | Sixteen runs in one row, newest first, left New simulation and deletion controls |
| [Mobile run tabs](../artifacts/screenshots/16-mobile-run-tabs.png) | 390px layout with contained horizontal scrolling and no wrapped tabs |
| [Advanced formula legends](../artifacts/screenshots/17-advanced-formula-legends.png) | Info icon beside every V2 value and both preset fields |
| [Formula legend](../artifacts/screenshots/18-formula-legend.png) | Plain-language recency explanation, half-life example, default and allowed range |
| [Mobile formula legend](../artifacts/screenshots/19-mobile-formula-legend.png) | Readable 390px dialog with a concrete similarity-penalty example |
| [Baseline formula legends](../artifacts/screenshots/20-baseline-formula-legends.png) | V1 parameter labels and individual info buttons |

Screenshots are generated by the browser suite and are review artifacts, not pixel-diff baselines. Validation demonstrates local simulation behaviour, not recommendation effectiveness in production.
