import { createRouter<%
  if (historyMode) {
    %>, createWebHistory<%
  } else {
    %>, createWebHashHistory<%
  } %>
   } from 'vue-router'
import Home from '@/views/Home'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: Home
  },
  {
    path: '/about',
    name: 'about',
    <%_ if (doesCompile) { _%>
    component: () => import(/* webpackChunkName: "about" */ '@/views/About.vue')
    <%_ } else { _%>
    component: function () {
      return import(/* webpackChunkName: "about" */ '@/views/About.vue')
    }
    <%_ } _%>
  }
];

const router = createRouter({
  <%_ if (historyMode) { _%>
  // history模式需要后端支持：https://router.vuejs.org/zh/guide/essentials/history-mode.html
  history: createWebHistory(process.env.BASE_URL),
  <%_ } else { _%>
  history: createWebHashHistory(),
  <%_ } _%>
  routes
});

export default router;