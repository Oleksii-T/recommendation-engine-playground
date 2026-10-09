# Recommendation Engine Playground — Product and Implementation Specification

## 1. Purpose

Build a standalone Vue dashboard that demonstrates, tests, and compares game-recommendation strategies using entirely mocked data.

The dashboard is a simulation and communication tool. It must let a user:

1. Inspect a hardcoded catalogue of casino games with metadata matching the current PlayLive game model.
2. Create simulated players.
3. Generate realistic but synthetic bet-and-win histories for each player.
4. Run different recommendation-engine versions against an identical player state.
5. See the recommended games and understand, in manager-friendly language, why every game was selected.
6. Compare results from different engine versions without changing the underlying simulation.

The primary audience is product managers and business stakeholders, followed by developers experimenting with recommendation formulas.

This specification uses **V2** to mean the rule-based personalized hybrid engine described below. It is not an ML model. The architecture must allow a future ML learning-to-rank engine to be registered without rewriting the UI.

## 2. Product principles

- **Understandable:** the dashboard explains recommendations in plain language.
- **Noise-free:** use a restrained, professional interface with only decision-relevant information visible by default.
- **Reproducible:** the same player state, engine configuration, as-of date, and random seed must produce the same results.
- **Comparable:** engine versions must be run against the exact same input snapshot.
- **Extensible:** recommendation formulas are isolated behind a stable engine interface.
- **Safe:** use synthetic data only. Do not include real player information or connect to production services.
- **Outcome-neutral:** the default V2 algorithm learns game preferences from engagement, not from how much a player loses, wins, deposits, or wagers.

## 3. Scope

### In scope

- Standalone Vue 3 application.
- Hardcoded mocked games.
- Local player creation and editing.
- Synthetic round, bet, and win generation.
- Derived daily game statistics.
- Multiple recommendation-engine versions.
- V1 versus V2 result comparison.
- Manager-facing explainability.
- Local persistence, reset, and JSON import/export.
- Unit tests for deterministic generation and recommendation formulas.

### Out of scope

- Backend or database.
- Authentication or permissions.
- Production PlayLive integration.
- Real player data.
- Real-money calculations or accounting accuracy.
- A real machine-learning model.
- External AI or LLM API calls.
- Editing the hardcoded game catalogue through the UI.
- Simulating deposits, wallets, KYC, bonuses, or responsible-gambling interventions.

## 4. Existing project and technical baseline

The target project already exists at:

`/Users/oleksiitarbeiev/Documents/playlive/recommendation-engine-playground`

It is currently a clean Vue 3 application created with Vue CLI.

Keep the current build system unless implementation reveals a blocking issue. Add only the dependencies needed for the application:

- `vue-router` for routes.
- `pinia` for application state.
- A lightweight UUID helper, or use `crypto.randomUUID()` with a fallback.
- Prefer native CSS, SVG, and HTML for charts and score bars. Do not add a large charting or UI framework unless clearly justified.

The application must require no network connection after dependencies are installed.

All persistent playground data must be stored in browser `localStorage`. Do not add a backend, database, IndexedDB layer, remote persistence, or synchronization service. In-memory state may be used during a session, but every user-created entity and saved configuration listed in the persistence section must be serialized to `localStorage`.

## 5. Information architecture

### Persistent application shell

The desktop layout contains:

```text
┌──────────────────────┬────────────────────────────────────────────┐
│ Product name         │ Page title                    Reset / Export│
│                      ├────────────────────────────────────────────┤
│ Engine version       │                                            │
│ [ V2 Hybrid       ▾] │ Main page                                  │
│                      │                                            │
│ Navigation           │                                            │
│ • Simulations        │                                            │
│ • Games              │                                            │
│                      │                                            │
│ Local data status    │                                            │
└──────────────────────┴────────────────────────────────────────────┘
```

The sidebar should be approximately 220–250px wide on desktop and collapse into a drawer on smaller screens.

### Routes

- `/` redirects to `/simulations`.
- `/simulations` is the primary workspace and contains player management, history generation, engine execution, results, and comparison.
- `/games` displays the complete mocked game catalogue.

A separate Players route is not required for V1 of the playground. Player entities are managed inside the Simulations page so the main workflow remains in one place.

## 6. Recommendation Engine Version control

Place a labelled selector in the sidebar:

```text
Recommendation Engine Version
[ V2 · Personalized Hybrid ▾ ]
```

Initial registered engines:

1. **V1 · Popularity Baseline**
2. **V2 · Personalized Hybrid 2+6+2**

The selected version controls the primary result. A separate `Compare with` selector on the results screen allows side-by-side comparison with another registered version.

Engine labels, descriptions, and versions must come from an engine registry rather than being hardcoded into components.

### Engine interface

Use a contract conceptually equivalent to:

```js
{
  id: 'v2-hybrid-2-6-2',
  version: '2.0.0',
  name: 'Personalized Hybrid 2+6+2',
  shortDescription: 'Balances familiar, similar, and exploratory games.',
  defaultConfig: {},
  run({ player, games, asOf, seed, config }) {
    return simulationResult;
  },
}
```

Rules:

- Engines are pure functions from a snapshot to a result.
- Engines must not read wall-clock time directly. They receive `asOf`.
- Engines must not use `Math.random()` directly. They receive a seeded random source or seed.
- Every result stores engine ID, semantic version, configuration snapshot, input snapshot identifier, seed, and as-of timestamp.
- Adding a future engine should require registering a new module, not changing result components.

## 7. Mock game catalogue

Provide 24–36 hardcoded games. Values are fictional, but the shape should closely resemble the existing PlayLive catalogue.

Ensure the dataset has meaningful diversity:

- At least 6 providers.
- Video slots, live casino, blackjack, roulette, baccarat, crash, bingo, poker, and other/casual categories.
- Several themes per applicable game.
- Several feature combinations.
- Different paylines.
- Desktop-only, mobile-only, and cross-platform examples.
- New and older games.
- A range of popularity values.
- Some Featured, Top, Popular, and Live subgroup assignments.
- A small number of inactive or disabled games to prove eligibility filtering.

### Game fields

Each mocked game should include:

```js
{
  id,                    // stable internal ID
  game_id,               // mocked external/provider ID
  game_code,
  game_url,
  name,
  product,               // provider
  category,              // canonical primary category
  categories,            // optional manual categories
  themes,                // array in playground state
  features,              // array in playground state
  paylines,
  platforms,             // ['desktop', 'mobile']
  enabled,
  status,                // active / disabled
  source,
  created_at,
  weekly_session_count,
  sub_groups,
  isBonusPlay,
  isFreebet,
  url_thumb,
  url_background,
}
```

Use arrays internally for `themes`, `features`, `platforms`, and `sub_groups`. The production string/JSON serialization format does not need to be reproduced in the playground.

Use local placeholder artwork or deterministic CSS covers. Do not depend on remote game images. Each game must be visually distinguishable by name, provider, category, and colour/initial artwork.

## 8. Games page

The Games page displays all hardcoded games in a clear table.

### Required table functionality

- Text search by game name or code.
- Filters for provider, primary category, status, platform, theme, and feature.
- Sort by name, provider, category, release date, and popularity.
- Active/disabled status indicator.
- Result count and clear-filters action.
- Row click opens a details drawer or modal.

### Default visible columns

- Game
- Provider
- Category
- Themes
- Features
- Paylines
- Platforms
- Release date
- Weekly popularity
- Status

Keep secondary identifiers and raw metadata in the details view to prevent a wide, noisy table.

## 9. Player model

A Player is a complete simulation container:

```js
{
  id,
  name,
  createdAt,
  favouriteGameIds,
  bets,
  wins,
  generationBatches,
  recommendationRuns,
}
```

### Bet shape

```js
{
  id,
  playerId,
  gameId,             // internal mocked game ID
  externalGameId,
  token,              // simulated session token
  round,
  amount,
  isFree,
  isBonusBalanceUsed,
  rolledBack,
  createdAt,
}
```

### Win shape

```js
{
  id,
  playerId,
  gameId,
  betId,
  token,
  round,
  amount,
  createdAt,
}
```

Every generated round has one bet and one win outcome. A losing round may have a win amount of zero.

### Recommendation run shape

```js
{
  id,
  playerId,
  engineId,
  engineVersion,
  engineConfig,
  seed,
  asOf,
  createdAt,
  inputFingerprint,
  playerProfile,
  dailyStats,
  recommendations,
  summary,
}
```

## 10. Simulations page

The Simulations page is the primary working area. Organize it into four readable sections, not a modal-heavy wizard:

1. Player
2. Activity history
3. Run configuration
4. Recommendation results

Only the currently relevant detail should be expanded. Summary states remain visible when sections are collapsed.

### Player section

- Player selector.
- `Create player` action.
- Rename and delete actions.
- Summary: number of games played, rounds, active days, total bet, total win, and latest activity.
- Optional favourite-game selector using a searchable multi-select or compact game picker.
- Empty state that directs the user to create a player.

Deleting a player must require confirmation because it removes its local simulation history.

## 11. Synthetic activity generator

Provide a fast batch-entry UI so a user does not manually create individual rounds.

### Required batch controls

- Game selector.
- Date and time.
- Number of rounds.
- Number of sessions, default `1`.
- Base bet amount.
- Bet randomness percentage.
- Play type:
  - Organic/paid
  - Bonus-funded
  - Free rounds
- Random seed, automatically populated but editable.
- Generate-preview action.
- Confirm-and-add action.

Reasonable input limits:

- Rounds: 1–1,000 per batch.
- Sessions: 1–50 and not greater than rounds.
- Base amount: greater than zero.
- Randomness: 0–100%.
- Date cannot be after the simulation `asOf` date.

### Bet generation

For base amount `100` and randomness `20%`, generate each bet between `80` and `120`:

```text
minimum = base × (1 - randomness)
maximum = base × (1 + randomness)
bet     = seeded random value between minimum and maximum
```

Round amounts are rounded to two decimals.

Distribute generated rounds across the selected sessions. Within a session, timestamps increase from the selected datetime by a small deterministic interval so ordering is clear.

### Win generation

The default outcome distribution must lean modestly toward an overall player loss while still producing varied outcomes:

- 60% losing outcome: win is 0–0.8× the bet.
- 25% near-break-even outcome: win is 0.8–1.2× the bet.
- 13% moderate win: win is 1.2–3× the bet.
- 2% large win: win is 3–10× the bet.

All choices and values use the seeded random generator. This distribution has an approximate expected return below 100%; it is illustrative, not a representation of any real game RTP.

### Batch preview

Before adding the generated activity, show:

- Number of rounds and sessions.
- Bet range.
- Total bet.
- Total win.
- Net outcome.
- Earliest/latest timestamps.
- Small sample of generated rows.

After confirmation, show the batch in a history list. Users can inspect or delete a whole batch. Deleting a batch removes the bets and wins created by it and invalidates recommendation runs based on the previous state.

### Manual corrections

It must be possible to inspect a round and edit its bet amount, win amount, timestamp, and play type, or mark it rolled back. This can live in an activity details drawer; it does not need to dominate the main screen.

## 12. Derived daily statistics

When an engine run starts, derive in-memory `UserGameDailyStat`-equivalent records from the selected player's current bets and wins.

Each record contains:

```js
{
  playerId,
  gameId,
  date,
  paidRounds,
  bonusRounds,
  engagedSessions,
  lastPlayedAt,
}
```

Rules:

- Ignore rolled-back bets.
- A paid round has a positive bet and is neither free nor bonus-funded.
- A bonus round is free or bonus-funded.
- Count unique `token + round`, not raw records.
- An engaged session is a unique token with at least one valid bet.
- `lastPlayedAt` comes from the latest valid bet, not a bare session.
- Use a single documented timezone consistently. UTC is acceptable for this local playground.

Display the derived statistics in a collapsible `Calculation details` panel. They are useful for developers but should not be the first thing managers see.

## 13. Engine V1 — Popularity Baseline

V1 demonstrates a non-personalized baseline.

### Eligibility

Only games that are active, enabled, and compatible with the selected simulated platform are candidates.

### Ranking

Rank by normalized `weekly_session_count`, with small deterministic boosts for:

- Featured subgroup.
- Top subgroup.
- Recently released games.

Apply provider/category diversity and return 10 games.

V1 must not use the player's activity. Its purpose is to show what personalization changes compared with a sensible global baseline.

## 14. Engine V2 — Personalized Hybrid 2+6+2

V2 returns 10 games:

- **2 Familiar:** favourites or games with strong repeated engagement.
- **6 Discovery:** unplayed or rarely played games similar to the player's demonstrated preferences.
- **2 Exploration:** popular or new games with reasonable compatibility.

If a pool lacks enough candidates, fill from the next-best eligible candidates while preserving a total of 10 where possible.

### 14.1 Recency weighting

Recent play counts more than old play:

```js
recencyWeight = 2 ** (-daysAgo / 30);
```

Manager-facing explanation:

- Today: 100% importance.
- 30 days ago: 50%.
- 60 days ago: 25%.
- 90 days ago: 12.5%.

Use a 90-day history window by default. Expose the window and half-life only in an Advanced Formula panel.

### 14.2 Daily engagement

For each player/game/day:

```js
dailyEngagement =
  2.0 * hasPaidRound
  1.0 * Math.log1p(Math.min(paidRounds, 100))
  0.5 * Math.log1p(Math.min(engagedSessions, 10))
  0.25 * Math.log1p(Math.min(bonusRounds, 100));
```

Plain-language explanation:

- Organic play is the strongest signal.
- Repeated rounds add confidence, with diminishing impact.
- Multiple engaged sessions strengthen the signal.
- Bonus/free play counts less because it may be promotion-driven.

Wins and losses are deliberately not part of the V2 preference formula. They remain visible in the player history to demonstrate that financial outcome is separate from game preference.

### 14.3 Game affinity

```js
gameAffinity = sum(recencyWeight * dailyEngagement);

if (isFavourite) {
  gameAffinity += 6.0;
}
```

Plain-language label: `Player interest in this game`.

### 14.4 Attribute preferences

Normalize games into these primary categories:

- Video Slots
- Live Roulette
- Live Blackjack
- Live Baccarat
- Blackjack
- Roulette
- Baccarat
- Poker
- Crash
- Bingo
- Casual/Other

For each category, provider, theme, feature, and paylines bucket:

```text
attribute preference =
interest points from games having that attribute
÷ total game-interest points
```

Examples shown to managers:

```text
Video Slots          81%
Pragmatic Play       42%
Egyptian theme       35%
Free Spins feature   64%
20–30 paylines       48%
```

For multi-value attributes such as themes and features, values do not need to total 100% because a game may contain several attributes.

### 14.5 Content-match score

For each candidate:

```js
contentMatch =
  0.30 * categoryPreference
  + 0.20 * providerPreference
  + 0.20 * averageThemePreference
  + 0.20 * averageFeaturePreference
  + 0.10 * paylinesPreference;
```

If a game lacks metadata for a component, renormalize the available weights rather than assigning an automatic penalty.

Plain-language label: `How closely this game matches the player's taste`.

### 14.6 Supporting signals

Normalize all supporting scores to 0–1:

- `ownAffinity`: candidate's affinity relative to the player's other games.
- `popularity`: log-normalized or percentile-normalized weekly session count.
- `freshness`: `exp(-gameAgeDays / 45)`.
- `editorial`: `1` when Featured or Top; otherwise `0`.

### 14.7 Pool scores

Familiar:

```js
score =
  0.65 * ownAffinity
  + 0.20 * contentMatch
  + 0.10 * popularity
  + 0.05 * editorial;
```

Discovery:

```js
score =
  0.70 * contentMatch
  + 0.20 * popularity
  + 0.05 * freshness
  + 0.05 * editorial;
```

Exclude current favourites and games played in the last 14 days from the initial Discovery pool.

Exploration:

```js
score =
  0.45 * contentMatch
  + 0.35 * popularity
  + 0.15 * freshness
  + 0.05 * editorial;
```

Prefer games the player has not played for Exploration.

### 14.8 Diversity reranking

After initial ranking, select candidates using a small similarity penalty:

```js
selectionScore = originalScore
  - 0.15 * maximumSimilarityToAlreadySelectedGames;
```

Additionally:

- Maximum 3 games from one provider unless insufficient candidates exist.
- Avoid more than 2 near-identical games from one franchise or metadata combination.
- Use seeded tie-breaking.
- Do not hide a player's clear preference merely to force artificial variety.

### 14.9 Cold start

If the player has no meaningful history, use:

```js
score =
  0.70 * popularity
  + 0.20 * editorial
  + 0.10 * freshness;
```

Apply diversity and label the result clearly:

`Not enough player history yet — showing a varied popular selection.`

## 15. Running a simulation

The Run Configuration section contains:

- Active recommendation engine, inherited from the sidebar.
- Simulated platform: desktop or mobile.
- As-of date and time.
- Seed.
- `Run recommendation` button.
- `Run and compare` button when a comparison engine is selected.
- Advanced Formula disclosure containing editable engine parameters.
- Restore-defaults action for formula parameters.

The run button is disabled when no player exists. A player with no history is valid and demonstrates cold-start behaviour.

Changing the player state after a run marks existing results as `Based on an older player state`, but keeps them available for comparison. The next run creates a new immutable result.

## 16. Results and explainability

The result must make the 2+6+2 composition immediately visible.

### Result header

- Player name.
- Engine name/version.
- As-of date.
- Input summary.
- Run seed.
- Overall explanation sentence.

Example:

`This player strongly prefers video slots, free-spin features, and two providers. The engine kept two familiar choices, added six related discoveries, and reserved two places for exploration.`

### Player taste profile

Show compact horizontal bars for the leading:

- Categories
- Providers
- Themes
- Features
- Paylines ranges

Show the top 3–5 per group, with `View all` in a drawer or disclosure.

### Recommended-game layout

Display three clearly labelled groups:

```text
Familiar · 2
Discovery · 6
Explore · 2
```

Each game card shows:

- Rank.
- Artwork, name, and provider.
- Group badge.
- Overall score as a percentage-like match indicator, labelled `Recommendation score` rather than probability.
- Two or three plain-language reason chips.
- `Why this game?` action.

Example reasons:

- `Strong interest in Video Slots`
- `Preferred provider · 42%`
- `Free Spins is a top feature`
- `Played repeatedly and recently`
- `Saved as a favourite`
- `Popular with players`
- `New game worth exploring`

Do not show raw formulas on cards.

### Why-this-game drawer

The detail view contains:

1. A one-sentence explanation.
2. Score contribution bars for category, provider, themes, features, paylines, popularity, freshness, affinity, and editorial boost as applicable.
3. The pool formula translated into plain language.
4. Raw values and formula only inside a secondary `Technical calculation` disclosure.
5. Eligibility facts such as active status and platform compatibility.

The displayed contributions must come from the actual calculation trace returned by the engine, not be reconstructed separately by the UI.

### Explainability result contract

Each recommendation should include:

```js
{
  gameId,
  rank,
  pool,                 // familiar / discovery / exploration / fallback
  score,
  reasonCodes,
  reasonText,
  components: {
    ownAffinity,
    contentMatch,
    categoryMatch,
    providerMatch,
    themeMatch,
    featureMatch,
    paylinesMatch,
    popularity,
    freshness,
    editorial,
    diversityPenalty,
  },
  calculationTrace,
}
```

## 17. Version comparison

Comparison must use the same player snapshot, games, as-of time, platform, and seed.

### Comparison summary

Show:

- Number and percentage of overlapping games.
- Games unique to each engine.
- Rank changes for shared games.
- Provider count.
- Category count.
- Average popularity.
- Average content match where supported.
- Familiar/discovery/exploration distribution where supported.

### Comparison presentation

Use either two aligned columns or a single comparison table:

```text
Rank | V1 Popularity Baseline | V2 Personalized Hybrid | Difference
```

Highlight meaningful differences, not every numeric change. Examples:

- `V2 replaced 7 globally popular games with games matching this player's slot and free-spin preferences.`
- `Both engines selected 3 of the same games.`
- `V2 uses 5 providers versus V1's 3.`

Allow opening the explanation for any game from either result.

Do not claim that one engine is objectively better. This playground compares behaviour, not measured production performance.

## 18. Formula experimentation

Each engine exposes configuration metadata describing editable numeric parameters:

```js
{
  key: 'categoryWeight',
  label: 'Category match',
  description: 'Importance of the player\'s preferred game category.',
  type: 'number',
  min: 0,
  max: 1,
  step: 0.05,
  default: 0.30,
}
```

The Advanced Formula panel should support:

- Editing relevant weights.
- Validating that grouped weights total 1 where required.
- Restoring defaults.
- Saving a named local preset.
- Running a preset without changing source code.
- Showing the active configuration on saved results.

Keep formula controls hidden by default so manager demonstrations remain clean.

## 19. Persistence and reproducibility

Browser `localStorage` is the sole persistence mechanism for the playground.

Persist locally:

- Players.
- Generated activity batches.
- Favourites.
- Recommendation runs.
- Active engine selection.
- Saved engine presets.
- UI preferences that improve continuity.

Use versioned local-storage keys so future schema changes can be migrated or reset safely. Persist through Pinia subscriptions or a small explicit persistence adapter so domain code does not call `localStorage` directly.

Suggested shape:

```text
recommendation-playground:schema-version
recommendation-playground:players
recommendation-playground:runs
recommendation-playground:settings
recommendation-playground:presets
```

It is acceptable to use one versioned root document instead if atomic export/import and migrations are simpler. Do not store the immutable hardcoded game catalogue in `localStorage`; load it from source and persist only user-created state and overrides.

Provide:

- Export complete playground state as JSON.
- Import previously exported state with validation.
- Reset current player.
- Reset all playground data with confirmation.
- Load a built-in demonstration scenario.

### Built-in demonstration scenarios

Include at least:

1. **Cold start:** player with no history.
2. **Slot enthusiast:** strong slots, free-spins, and provider preferences.
3. **Live casino player:** roulette/blackjack-heavy history.
4. **Mixed player:** diverse activity to demonstrate weaker preferences.

Scenarios must be generated deterministically from fixed seeds.

## 20. Visual design

### Design direction

- Professional analytics tool, not casino marketing UI.
- Neutral warm-grey or off-white canvas.
- White surfaces with subtle borders.
- Charcoal text.
- One restrained blue/indigo accent.
- Green, amber, and red only for meaningful states.
- Very limited shadows and no decorative gradients.
- System font stack or one locally available sans-serif.
- Consistent 8px spacing scale.
- Clear typographic hierarchy with compact explanatory copy.

### Noise-control rules

- Prefer progressive disclosure to showing every formula at once.
- Show at most 3 reason chips on a recommendation card.
- Use tables for exact data and bars for relative preferences.
- Avoid pie charts, gauges, decorative charts, and excessive badges.
- Avoid full-screen modals for the primary workflow.
- Keep primary actions visually distinct; secondary actions quiet.
- Empty states must explain the next action.

### Accessibility

- Keyboard-accessible navigation, controls, drawers, and dialogs.
- Visible focus states.
- Proper labels and semantic table markup.
- Do not communicate meaning through colour alone.
- Meet WCAG AA contrast where practical.
- Respect reduced-motion preferences.

### Responsiveness

- Optimized for desktop demonstrations at 1280px and wider.
- Fully usable at tablet widths.
- On small screens, collapse the sidebar and stack result groups.
- Large comparison tables may use deliberate horizontal scrolling.

## 21. State architecture

Suggested Pinia stores:

- `useGamesStore`: immutable mocked catalogue and catalogue selectors.
- `usePlayersStore`: player CRUD, favourites, bets, wins, and generation batches.
- `useSimulationStore`: run configuration, run execution, saved results, comparison selection.
- `useSettingsStore`: active engine, local presets, persistence schema version.

Suggested domain modules:

```text
src/
  domain/
    engines/
      registry.js
      v1PopularityEngine.js
      v2HybridEngine.js
      shared/
        eligibility.js
        normalization.js
        diversity.js
        explainability.js
    simulation/
      seededRandom.js
      activityGenerator.js
      dailyStats.js
      fingerprint.js
    games/
      mockGames.js
      taxonomy.js
    scenarios/
      builtInScenarios.js
```

Keep calculations outside Vue components. Components render state and dispatch actions; domain modules own formulas.

## 22. Testing requirements

At minimum, add unit tests for:

- Seeded random generation returns identical data for identical inputs.
- Bet amounts remain within the configured range.
- Win distribution uses the configured buckets.
- Rolled-back bets do not enter daily statistics.
- Unique rounds and sessions are counted correctly.
- Recency weight equals 1 today, approximately 0.5 at 30 days, and approximately 0.25 at 60 days.
- Favourite boost is applied exactly once.
- Attribute preference normalization is correct.
- Missing metadata causes weight renormalization.
- V1 ignores player activity.
- V2 produces 2 Familiar, 6 Discovery, and 2 Exploration games when enough candidates exist.
- V2 uses deterministic fallback when a pool is short.
- Disabled and incompatible games never appear.
- Provider diversity rule is applied.
- Comparison runs use the same input fingerprint.

Add high-level component tests for:

- Creating a player.
- Generating and confirming an activity batch.
- Running V2 and opening a recommendation explanation.
- Comparing V1 and V2.
- Exporting, resetting, and importing state.

## 23. Error and edge states

Handle explicitly:

- No players.
- Player with no history.
- Player with only bonus/free activity.
- Fewer than 10 eligible games.
- All preferred games disabled.
- Invalid imported JSON.
- Changed player state after a saved run.
- Formula weights that do not total the required value.
- Duplicate game IDs in mocked data: fail loudly during development.
- Local-storage quota or parsing failure: show a recoverable warning and allow reset/export where possible.

## 24. Acceptance criteria

The implementation is complete when:

1. The application has a persistent sidebar with engine selector and routes to Simulations and Games.
2. The Games page shows a diverse hardcoded catalogue in a searchable, filterable table.
3. A user can create, rename, select, and delete simulated players.
4. A user can generate a deterministic batch of bets and wins using game, datetime, round count, session count, base amount, randomness, play type, and seed.
5. Base `100` with randomness `20%` never generates a bet below `80` or above `120`.
6. Generated wins follow the documented loss-leaning distribution and are clearly labelled as illustrative.
7. The system derives daily player/game statistics from the generated history.
8. V1 produces a diversified popularity-based list without using player history.
9. V2 produces the 2+6+2 result when sufficient candidates exist and uses documented fallbacks otherwise.
10. V2 preference calculations do not use wager amount, win amount, loss amount, or deposit behaviour.
11. Results show a clear player taste profile and plain-language reasons for every recommended game.
12. A technical calculation trace is available through progressive disclosure.
13. V1 and V2 can be compared using an identical input snapshot, as-of timestamp, platform, and seed.
14. Formula weights can be adjusted through an Advanced panel and reset to defaults.
15. Simulation state survives reload through versioned local persistence.
16. State can be exported, reset, and re-imported.
17. Built-in deterministic demo scenarios are available.
18. Core generation and recommendation logic is covered by unit tests.
19. The production build and lint command pass.
20. The interface remains readable, restrained, and usable without knowledge of the underlying formulas.

## 25. Suggested implementation sequence

1. Establish router, Pinia stores, application shell, and design tokens.
2. Add mocked game catalogue and Games page.
3. Add player CRUD and local persistence.
4. Implement seeded generator, batch preview, and activity history.
5. Implement derived daily statistics.
6. Implement engine registry and V1 baseline.
7. Implement V2 calculations with calculation traces.
8. Build taste-profile and recommendation explanation UI.
9. Add version comparison.
10. Add formula presets, import/export, and built-in scenarios.
11. Add tests, polish accessibility, lint, and production-build verification.

## 26. Implementation handoff notes

- Do not simplify the engine into calculations embedded in Vue components.
- Do not use win/loss outcome as a preference signal in default V2, even though wins are generated and displayed.
- Preserve the distinction between `recommendation score` and probability. A score of 82% means normalized fit within this simulation, not an 82% chance of play.
- Ensure all displayed explanations are generated from the same calculation trace that produced the ranking.
- Prefer a polished, complete primary workflow over adding many secondary charts.
- Keep the engine boundary stable so an eventual Python-trained ML ranker or imported score set can implement the same result contract.
