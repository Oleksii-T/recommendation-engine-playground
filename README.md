# PlayLive Recommendation Lab

A standalone Vue 3 playground for understanding and comparing game recommendations with synthetic players and activity. Implements [the initial specification](docs/INITIAL_SPEC.md). The PlayLive application is not connected or modified.

## Run locally

```sh
npm ci
npm run serve
```

Open http://localhost:8080. The existing Vue CLI build system is retained. Vue Router handles `/players`, `/players/:playerId/:tab`, and `/games`; Pinia owns the local workspace. There is no backend, production integration, remote artwork, or AI API.

## Try the workflow

1. Open **Players** for the player table, showing names, bet and win totals/counts, and each player's last simulation run.
2. Click **+ Add Player**, enter a name in the single-field modal, and submit. The new player's page opens on **General info**. **Load demo** offers the four built-in scenarios in a separate dialog.
3. **General info** contains player metadata, activity summaries, favourite games, rename, reset, and delete actions.
4. **Bets and Wins** contains the seeded activity generator, saved batches, and a paginated round table showing paired bet/win outcomes. Each row's **Edit** action opens the correction drawer.
5. Open **Simulation** to configure and run an engine. Every saved engine result becomes its own subtab, labelled **Run 1 · V2**, **Run 2 · V1**, and so on. Newest runs appear first in a single horizontally scrollable row. **+ New simulation** stays on the left and opens another configuration. Each subtab's **×** deletes that run after confirmation; remaining labels stay stable.
6. Choose a second engine in the new-run configuration and click **Run and compare**. This saves two separate runs against identical inputs and opens their comparison. Saved simulation views start with Recommendation results immediately below the subtabs.
7. Click **ⓘ** beside **Recommendation results** to see the selected simulation’s player, engine/version, summary, date, seed, snapshot, player-state status and saved configuration. **Why this game?** shows the actual score contributions. **Advanced formula** on a new simulation provides formula presets and editable parameters; scoring groups must total 1. Click the **ⓘ** beside any value for its effect, a practical example, default and allowed range. Legends explain each engine and scoring group separately, and also cover preset controls.

Player tabs and selected run/comparison IDs are encoded in the URL, so reload and browser navigation preserve the selected view. `/simulations` remains a compatibility redirect to `/players`. Existing locally saved players and runs use the same storage schema and appear automatically in the new structure.

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

For server hosting with your existing PM2 and Nginx setup, see [deployment instructions](docs/DEPLOYMENT.md), [ecosystem.config.js](ecosystem.config.js), and [Nginx config](deploy/nginx.conf).

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
src/views/                Players list, player detail tabs, and catalogue routes
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

Playwright saves an HTML report in `artifacts/playwright-report/`, failure traces in `artifacts/test-results/`, and review screenshots in [artifacts/screenshots](artifacts/screenshots/). Screenshots cover the player table, creation modal, general information, bets/wins, saved-run subtabs, recommendations, comparisons, catalogue, and mobile/tablet layouts. See [validation notes](docs/VALIDATION.md).

```sh
npm run format
```

Formats the application, domain modules, tests, and Playwright configuration with Prettier.
