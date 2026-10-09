# PlayLive Recommendation Lab

A standalone Vue 3 playground for understanding and comparing game recommendations with synthetic players and activity. Implements [the initial specification](docs/INITIAL_SPEC.md). The PlayLive application is not connected or modified.

## Run locally

```sh
npm ci
npm run serve
```

Open http://localhost:8080. The existing Vue CLI build system is retained. Vue Router handles `/simulations` and `/games`; Pinia owns the local workspace. There is no backend, production integration, remote artwork, or AI API.

## Try the workflow

1. Choose **Slot enthusiast** and click **Load demo**, or create a blank player.
2. Expand **Activity history** to generate a seeded batch, review its preview, and confirm it. **Inspect rounds** lets you change amounts, timestamps, play type, or rollback status.
3. Set the platform, UTC as-of timestamp, and seed. **Run recommendation** shows the selected engine's result.
4. Choose a second engine under **Compare with**, then **Run and compare**. The same player snapshot, catalogue, time, platform, and seed are used for both engines.
5. Open **Why this game?** for contributions from the actual ranking calculation. Technical values are available in a secondary disclosure.
6. Open **Advanced formula** to experiment with weights or recency and save a named local preset. Weight groups must total 1; unfinished edits do not replace the saved valid configuration.

Four deterministic demo scenarios are available: cold start, slot enthusiast, live casino player, and mixed player. Loading an existing demo selects its local instance, preserving subsequent experiments.

## Algorithms and conventions

- **V1 · Popularity Baseline** ranks compatible active games by log-normalized weekly sessions with small Featured, Top, and freshness boosts. Player history and favourites do not affect this ranking.
- **V2 · Personalized Hybrid 2+6+2** targets two familiar games, six related discoveries, and two exploratory choices. UTC daily engagement is capped and recency-weighted, with a favourite boost applied once. Content scores renormalize their weights when metadata is missing. A similarity penalty, provider cap, and metadata-combination cap diversify the selection; caps relax when a pool has no remaining compliant candidate. Short pools use the next-best eligible choices and label them as fallbacks.
- V2 preferences use rounds, sessions, recency, and favourites. Wager size, win size, and net outcome are excluded. A zero-valued paid round is not engagement; free or bonus rounds still count with reduced weight.
- All dates, input fields, day boundaries, statistics, and recency calculations use **UTC**. Today's calendar bucket has full weight. Runs exclude future activity. The default demonstration as-of timestamp is **2026-10-09 18:00 UTC**.
- Synthetic outcomes use the specified 60/25/13/2% buckets; their approximate expected return is 89.3%. These are illustrative, not a real game's RTP.
- A recommendation score describes calculated fit, not a probability. Diversity changes selection order; the displayed original score and its contributions are preserved in the trace.
- Domain engines are pure: no wall-clock reads, unseeded randomness, Vue state, or browser storage. IDs and run creation timestamps are added by the store after calculation.

## Local data

One versioned JSON document is saved under `recommendation-playground:v1` in browser `localStorage`. It includes players, favourites, batches, bets, wins, immutable runs with input snapshots, settings, and presets. The hardcoded catalogue is loaded from source and is never persisted as mutable catalogue state.

**Export JSON** downloads the complete document. **Import** validates schema version, game references, amounts, linked rounds and outcomes, formula groups, result traces, and settings before replacing the workspace. Invalid files leave existing data unchanged. Resetting all data, resetting a player, deleting a player, deleting a batch, and importing replacement data require confirmation. Browser quota and damaged-storage warnings retain the in-memory workspace and offer export/recovery.

Editing player history marks saved results **Based on an older player state**. Old runs remain inspectable and can be compared when their input fingerprints match. A fresh execution always creates a new run.

## Code map

```text
src/domain/games/          Immutable 32-game mock catalogue and taxonomy
src/domain/simulation/     Seeded generator, UTC daily stats, canonical fingerprints
src/domain/engines/        Registry, V1, V2, configuration metadata, diversity and traces
src/domain/scenarios/      Four scenarios generated from fixed seeds
src/stores/               Pinia workspace and validated persistence adapter
src/views/                Simulations and searchable/filterable catalogue routes
src/components/           Activity, formula, result and accessible detail components
```

To add an engine, implement the contract in `domain/engines`, including the common result and explanation trace fields, then register its module in `registry.js`. Labels and editable numeric controls are generated from registry metadata. Increment the persistence schema and provide a migration if the stored contract changes.

## Validate

Node 20+ is required for the native unit test runner.

```sh
npm test
npm run lint -- --no-fix
npm run build
npx playwright install chromium
# Keep npm run serve running in another terminal:
npm run test:e2e
```

The browser suite uses the existing server; it does not start or stop one. Set `PLAYWRIGHT_BASE_URL` for another address, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to reuse an installed Chromium executable. Each test uses isolated browser storage and does not modify the workspace in your regular browser.

Playwright saves an HTML report in `artifacts/playwright-report/`, failure traces in `artifacts/test-results/`, and review screenshots in [artifacts/screenshots](artifacts/screenshots/). Screenshots cover the empty state, activity preview, personalized results, explanations, engine comparison, catalogue, and mobile/tablet layouts. See [validation notes](docs/VALIDATION.md).

```sh
npm run format
```

Formats the application, domain modules, tests, and Playwright configuration with Prettier.
