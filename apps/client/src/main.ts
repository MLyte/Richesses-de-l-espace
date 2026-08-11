import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import DisplayView from "./views/DisplayView.vue";
import PlayerView from "./views/PlayerView.vue";
import CreditsView from "./views/CreditsView.vue";
import CreateGameView from "./views/CreateGameView.vue";
import "./styles.css";
import "./theme-space.css";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: CreateGameView },
    { path: "/display", component: DisplayView },
    { path: "/play/:code", component: PlayerView },
    { path: "/credits", component: CreditsView }
  ]
});

createApp(App).use(createPinia()).use(router).mount("#app");
