import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import App from "./App.vue";
import DisplayView from "./views/DisplayView.vue";
import PlayerView from "./views/PlayerView.vue";
import CreditsView from "./views/CreditsView.vue";
import CreateGameView from "./views/CreateGameView.vue";
import "./styles.css";
import "./theme-space.css";

const router = createRouter({
  history: import.meta.env.VITE_STATIC_DEMO === "true" ? createWebHashHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: CreateGameView },
    { path: "/display", component: DisplayView },
    { path: "/play/:code", component: PlayerView },
    { path: "/credits", component: CreditsView }
  ]
});

createApp(App).use(createPinia()).use(router).mount("#app");
