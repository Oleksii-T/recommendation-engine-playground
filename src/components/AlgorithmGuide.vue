<template>
  <section
    class="algorithm-guide"
    :class="{ 'baseline-guide': !hybrid }"
    aria-label="How recommendations are built"
  >
    <h3>How recommendations are built</h3>
    <ol class="algorithm-steps">
      <li>
        <div class="algorithm-step-title">
          <span aria-hidden="true">1</span>
          <h4>Choose eligible games</h4>
        </div>
        <p>Only enabled, active games that support {{ platform }} can appear.</p>
        <code>enabled AND active AND platform match</code>
        <small>Purpose: decide what can be shown.</small>
      </li>
      <li v-if="hybrid">
        <div class="algorithm-step-title">
          <span aria-hidden="true">2</span>
          <h4>Learn player taste</h4>
        </div>
        <p>
          Use rounds, sessions and favourites. Older play fades. Bonus and free play count less.
        </p>
        <code>interest → preferred game attributes</code>
        <small
          >Purpose: learn what this player likes. Bet amounts, wins and losses add no
          interest.</small
        >
      </li>
      <li>
        <div class="algorithm-step-title">
          <span aria-hidden="true">{{ hybrid ? 3 : 2 }}</span>
          <h4>Score each game</h4>
        </div>
        <p v-if="hybrid">
          Match games to those preferences. Mix in popularity, freshness and Featured/Top tags.
        </p>
        <p v-else>
          Use global popularity, Featured/Top tags and freshness. This player's history and
          favourites are ignored.
        </p>
        <code>score = sum(signal × weight)</code>
        <small>Purpose: rank candidates. Each group has its own mix of weights.</small>
      </li>
      <li>
        <div class="algorithm-step-title">
          <span aria-hidden="true">{{ hybrid ? 4 : 3 }}</span>
          <h4>Choose a varied set</h4>
        </div>
        <p>Pick games in score order. Reduce the chance of showing several very similar games.</p>
        <code>{{
          hybrid ? '2 Familiar + 6 Discovery + 2 Explore' : 'Up to 10 popular games'
        }}</code>
        <small
          >Purpose: balance relevance and variety. Provider and repeated-combination limits also
          apply.</small
        >
      </li>
    </ol>
    <p v-if="hybrid" class="algorithm-branch">
      <strong>Without player interest:</strong> use the Cold start formula for all 10 places. If a
      group is short, fill its places with other eligible games.
    </p>
    <div class="algorithm-settings-notes">
      <p>
        <strong>As-of date</strong>
        {{
          hybrid
            ? 'sets the activity cutoff and the age of play and new games.'
            : 'sets game age for the freshness signal.'
        }}
      </p>
      <p><strong>Seed</strong> breaks ties between equal selection scores.</p>
      <p v-if="compare">
        <strong>Compare</strong> runs both engines on the same player, date, platform and seed.
      </p>
    </div>
  </section>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
defineProps({ hybrid: Boolean, platform: String, compare: Boolean })
</script>
