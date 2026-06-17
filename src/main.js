// 从 Vue 库中导入 createApp 函数，用来创建 Vue 应用实例 💕
import { createApp } from 'vue'
// 导入全局样式文件，让整个项目都有漂亮的样式 ✨
import './style.css'
// 导入根组件 App，这是我们整个应用的主组件 🎨
import App from './vue/Test01.vue'

// 创建 Vue 应用实例，并将其挂载到 index.html 中的 #app 元素上 🚀

createApp(App).mount('#app')
