// 从 Vite 中导入 defineConfig 函数，用来定义配置 📝
import { defineConfig } from 'vite'
// 导入 Vue 插件，让 Vite 能够处理 .vue 单文件组件 🎉
import vue from '@vitejs/plugin-vue'

// 导出 Vite 配置对象 🚀
export default defineConfig({
  // 注册 Vue 插件，这样 Vite 就知道怎么处理 Vue 文件啦 ✨
  plugins: [vue()],
})
