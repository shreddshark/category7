import { createRouter, createWebHistory } from "vue-router"

const routes = [
  {
    path: "/verify",
    name: "VerifyEmail",
    component: () => import("@/pages/VerifyEmail.vue"),
  },
  {
    path: "/",
    name: "Home",
    component: () => import("@/pages/HomePage.vue"),
  },
  {
    path: "/leaderboard",
    name: "Leaderboard",
    component: () => import("@/pages/LeaderboardPage.vue"),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
