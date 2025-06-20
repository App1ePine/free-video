import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/global.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

import router from './router/index.js'
app.use(ElementPlus, { zIndex: 1000 })
app.use(router)

app.mount('#root')
