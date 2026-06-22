// ==================== 自定义指令统一注册入口 ====================
// 类比 Java：相当于 Spring 的 @Configuration 配置类，统一把所有指令"注册"到 Vue 应用中
// 这样所有 .vue 文件里都可以直接用 v-hasRole、v-hasPermi、v-copyText 这些指令

// 引入三个自定义指令模块
import hasRole from './permission/hasRole'      // v-hasRole 角色权限指令
import hasPermi from './permission/hasPermi'    // v-hasPermi 操作权限指令
import copyText from './common/copyText'        // v-copyText 复制文本指令

/**
 * 导出一个函数，接收 Vue 应用实例 app，把所有指令注册上去
 *
 * 使用方式：在 main.js 里
 *   import directive from '@/directive'
 *   directive(app)
 *
 * @param {App} app Vue 应用实例（createApp() 创建出来的）
 *
 * ⚠️ 注意：app.directive(name, definition) 是 Vue 3 全局注册指令的 API
 *  - 第一个参数 'hasRole' 是指令名（在模板中用时不带 v-，前缀会自动加）
 *  - 第二个参数是指令定义对象（包含 mounted、updated 等钩子函数）
 *
 * 类比 Java：app.directive() 类似 ApplicationContext.registerBean()
 *           把自定义的"切面/拦截器"注册到容器里
 */
export default function directive(app){
  // 注册 v-hasRole：判断用户是否具备某个角色
  app.directive('hasRole', hasRole)
  // 注册 v-hasPermi：判断用户是否具备某个操作权限
  app.directive('hasPermi', hasPermi)
  // 注册 v-copyText：点击元素复制指定文本到剪贴板
  app.directive('copyText', copyText)
}
