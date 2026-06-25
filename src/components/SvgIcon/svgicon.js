/**
 * ============================================================================
 * svgicon.js —— Element Plus 图标全局注册插件
 * ----------------------------------------------------------------------------
 * 【这个文件是干嘛的？】
 *   把 Element Plus 的所有图标组件批量注册成 Vue 全局组件，
 *   这样在任何页面的模板里都能直接用，不用每次都 import。
 *
 * 【Java 类比】
 *   相当于一个 @Configuration 配置类，批量把所有图标 Bean 注册到 ApplicationContext。
 *
 * 【使用示例】
 *   <!-- 注册后，模板里直接这样用，不需要 import -->
 *   <el-icon><Edit /></el-icon>
 *   <el-icon><Delete /></el-icon>
 * ============================================================================
 */


// 导入 Element Plus 的所有图标组件
// @element-plus/icons-vue 是 npm 包名，不是路径别名！
// * as components 表示把包里导出的所有组件都收集到 components 对象中
// Java 类比：import org.springframework.web.*; （导入整个包）
import * as components from '@element-plus/icons-vue'


/**
 * 默认导出一个 Vue 插件对象
 *
 * Vue 插件规范：
 *   - 要么是一个带有 install 方法的对象
 *   - 要么直接是一个函数（会被当成 install 方法）
 *
 * 当 app.use(elementIcons) 被调用时，Vue 会自动执行这个 install 方法
 */
export default {
  /**
   * 插件安装方法
   *
   * @param {App} app  Vue 3 应用实例（createApp() 的返回值）
   *
   * 逻辑：
   *   1. 遍历 components 对象（里面有所有图标）
   *   2. 把每个图标组件注册成全局组件
   */
  install: (app) => {
    // 遍历所有图标组件
    for (const key in components) {
      // 获取单个图标组件的配置对象
      const componentConfig = components[key]
      // 注册为全局组件
      // componentConfig.name 就是组件名（如 'Edit'、'Delete'）
      app.component(componentConfig.name, componentConfig)
    }
  }
}
