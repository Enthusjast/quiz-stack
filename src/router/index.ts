import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/quiz/:bankId',
    name: 'quiz',
    component: () => import('@/pages/QuizPage.vue'),
    props: true,
  },
  {
    path: '/wrong-problems',
    name: 'wrong-problems',
    component: () => import('@/pages/WrongProblemsPage.vue'),
  },
  {
    path: '/records',
    name: 'records',
    component: () => import('@/pages/RecordsPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.afterEach((to) => {
  if (to.name === 'home') {
    document.title = 'Quiz Stack — 刷题自测'
  } else if (to.name === 'wrong-problems') {
    document.title = '错题本 — Quiz Stack'
  } else if (to.name === 'records') {
    document.title = '练习记录 — Quiz Stack'
  } else if (to.name === 'not-found') {
    document.title = '404 — Quiz Stack'
  }
  // quiz page sets title dynamically from bank data
})

export default router
