<script setup>
// 从 Vue 中导入 ref 函数，用来创建响应式数据 🌟
import { ref } from 'vue'

// 创建一个响应式的计数器变量，初始值为 0 🔢
const count = ref(0)
</script>

<template>
  <!-- 大标题，欢迎来到 Vue 3 的世界 👋 -->
  <h1>Hello Vue 3!</h1>

  <!-- 卡片容器，用来包裹按钮和文字内容 📦 -->
  <div class="card">
    <!-- 点击按钮，让计数器加 1，并且实时显示当前的数值 🎯 -->
    <button type="button" @click="count++">count is {{ count }}</button>
    <!-- 提示信息，告诉你可以编辑这个文件来测试热更新功能 🔥 -->
    <p>
      Edit
      <code>src/App.vue</code> to test HMR
    </p>
  </div>

  <!-- 底部提示文字 💬 -->
  <p class="read-the-docs">
    Click on the Vite and Vue logos to learn more
  </p>
</template>

<style scoped>
/* 设置底部提示文字的颜色为灰色 🌈 */
.read-the-docs {
  color: #888;
}
</style>
