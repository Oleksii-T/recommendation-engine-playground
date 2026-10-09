import { createRouter, createWebHistory } from 'vue-router'
const PlayersView = () => import('./views/PlayersView.vue')
const PlayerView = () => import('./views/PlayerView.vue')
const GamesView = () => import('./views/GamesView.vue')
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/players' },
    { path: '/players', name: 'players', component: PlayersView },
    {
      path: '/players/:playerId',
      redirect: (to) => ({
        name: 'player',
        params: { playerId: to.params.playerId, tab: 'general' },
        query: to.query,
      }),
    },
    {
      path: '/players/:playerId/:tab(general|activity|simulation)',
      name: 'player',
      component: PlayerView,
    },
    { path: '/simulations', redirect: '/players' },
    { path: '/games', name: 'games', component: GamesView },
    { path: '/:pathMatch(.*)*', redirect: '/players' },
  ],
})
