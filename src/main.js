import { createApp } from "vue";
import App from "./App.vue";
import PrimeVue from "primevue/config";

// PrimeVue стили
import "primeflex/primeflex.css"; // Сетка и утилиты

const app = createApp(App);

app.use(PrimeVue); // Подключаем PrimeVue
app.mount("#app"); // Монтируем приложение
