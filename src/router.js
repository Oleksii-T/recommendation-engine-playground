import { createRouter, createWebHistory } from 'vue-router'
const SimulationsView = () => import('./views/SimulationsView.vue')
const GamesView = () => import('./views/GamesView.vue')
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/simulations' },
    { path: '/simulations', component: SimulationsView },
    { path: '/games', component: GamesView },
    { path: '/:pathMatch(.*)*', redirect: '/simulations' },
  ],
})
