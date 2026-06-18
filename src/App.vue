<!--
  ============================================================================
  App.vue —— 整个 Vue 应用的「根组件」（最外层入口）
  ----------------------------------------------------------------------------
  Java 类比：
    相当于 Spring Boot 项目里的 Application.java 启动类 + 全局配置类的合体。
    所有页面都是它的"子组件"，所有路由都在它的 <router-view /> 里渲染。

  本文件做的 3 件事：
    1. 引入"全局设置 Store"（Pinia），拿到用户保存的主题色
    2. 在组件挂载完毕后，把主题色应用到整个应用（CSS 变量级换肤）
    3. 在模板里挂载一个 <router-view />，让路由系统接管页面切换
  ============================================================================
-->

<!--
  <script setup> 是 Vue 3 的「组合式 API 语法糖」
  - setup 关键字让我们可以"裸写" import / 变量 / 函数，全部自动暴露给模板
  - 不用再写 export default { setup() { return {...} } } 这种繁琐结构

  Java 类比：
    相当于 Spring Boot 的 @SpringBootApplication，
    自动开了一堆配置，让你少写很多样板代码。
-->
<script setup>
// ========== 模块导入区 ==========

// 引入全局设置 Store（Pinia 状态管理）
// 这个 Store 里保存了：主题色、暗黑模式、侧边栏样式 等全局配置
// Java 类比：相当于 @Autowired SettingService settingService;
import useSettingsStore from '@/store/modules/setting'

// 引入主题样式工具函数
// handleThemeStyle(themeColor) 会把主题色翻译成 19 个 CSS 变量写到 <html> 上
import { handleThemeStyle } from '@/utils/theme'

// 引入 Vue 的生命周期钩子 onMounted
// onMounted = 组件挂载到 DOM 之后触发（类似 Spring 的 @PostConstruct）
//
// 注意：nextTick 因为 vite 配置了 unplugin-auto-import 的 'vue'，
// 所以这里没显式 import 也能直接用，构建时会自动注入
import { onMounted } from 'vue'


// ========== 生命周期钩子 ==========

/**
 * onMounted —— 组件挂载完成后触发的钩子
 *
 * Vue 组件生命周期（和 Spring Bean 生命周期对照）：
 *   beforeCreate  → Bean 实例化前
 *   created       → Bean 属性注入完成
 *   beforeMount   → DOM 渲染前
 *   mounted       → DOM 渲染完成（≈ @PostConstruct，最常用！）
 *   beforeUnmount → 销毁前
 *   unmounted     → 销毁后（≈ @PreDestroy）
 *
 * 为什么要在 mounted 里做主题初始化？
 *   因为只有挂载之后，<html> 这个 DOM 元素才确定存在，
 *   才能往它身上写 CSS 变量。如果在 created 里写，
 *   有可能 DOM 还没准备好就报错。
 */
onMounted(() => {
  // ---------- nextTick 双重保险 ----------
  // nextTick 是 Vue 的「下一帧 DOM 更新」回调
  // 即使在 onMounted 里，也可能存在 DOM 还在更新中的瞬间，
  // nextTick 保证这个回调一定在所有 DOM 更新结束之后才执行
  //
  // Java 类比：
  //   类似 Spring 的 ApplicationReadyEvent —— 比 @PostConstruct 更晚，
  //   保证整个上下文都"稳定可用"了才触发
  nextTick(() => {
    // ---------- 初始化主题样式 ----------
    // 1. useSettingsStore() 调用 Store 的工厂函数，拿到 store 实例
    //    （类似 applicationContext.getBean(SettingsStore.class)）
    // 2. .theme 读取 state 里保存的主题色（默认 '#409EFF' 蓝色）
    // 3. 传给 handleThemeStyle 应用到 <html> 上，整个应用瞬间换肤！
    //
    // ⚠️ 注意：之前这里写的是 useSettingStore（单数）和 useSettingsStore（复数）
    //         不一致会直接报 "useSettingsStore is not defined"，
    //         现在已统一为 useSettingsStore
    handleThemeStyle(useSettingsStore().theme)
  })
})
</script>


<!--
  <template> 块是组件的 HTML 模板
  Java 类比：相当于 Thymeleaf / FreeMarker 的模板文件，
            只不过这里直接写在组件里，更紧凑。

  <router-view /> 是 Vue Router 提供的「路由出口」组件
  - 它就像一个"占位符"
  - 用户访问 /login 时，这里显示 Login.vue
  - 用户访问 /index 时，这里显示 Index.vue
  - 路由切换时，整个页面只有这部分会变，外层 App.vue 不会重新挂载
  - 自闭合写法 <router-view /> = <router-view></router-view>
-->
<template>
  <router-view />
</template>
