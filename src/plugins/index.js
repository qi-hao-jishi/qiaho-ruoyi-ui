// ==================== 项目插件（自定义插件）统一注册入口 ====================
//
// 【这个文件是干嘛的？】
//   这是整个项目的"全局工具方法注册中心"，把所有自定义插件收拢到一起，
//   通过 Vue 的 app.use() 机制注入到应用实例上，让所有组件都能通过 proxy.$xxx 直接调用
//
// 【类比 Java】
//   相当于 Spring 的 @Configuration 配置类 + @Bean 方法：
//     @Configuration
//     public class PluginConfig {
//         @Bean  public TabService    tabService()    { ... }
//         @Bean  public AuthService   authService()   { ... }
//         @Bean  public CacheService  cacheService()  { ... }
//         @Bean  public ModalService  modalService()  { ... }
//         @Bean  public DownloadService downloadService() { ... }
//     }
//   注册后，组件中通过 proxy.$tab、proxy.$auth 等拿到这些"全局单例 Bean"
//
// 【使用示例】
//   // 在 .vue 组件的 <script setup> 中：
//   const { proxy } = getCurrentInstance()
//   proxy.$tab.closePage()          // 关闭当前标签页
//   proxy.$auth.hasPermi('xxx')     // 判断权限
//   proxy.$cache.session.set('k', 'v')  // 缓存操作
//   proxy.$modal.confirm('确定删除？')   // 弹窗确认
//   proxy.$download.file('xxx')     // 下载文件

// 引入各个插件模块
// 每个模块导出一个对象，封装了相关的工具方法
import tab from './tab'            // 页签操作（打开/关闭/刷新标签页）
import auth from './auth'          // 权限认证（判断角色/权限，比指令更灵活）
import cache from './cache'        // 缓存操作（sessionStorage / localStorage 封装）
import modal from './modal'        // 模态框（ElMessageBox 的二次封装，统一确认/提示样式）
import download from './download'  // 文件下载（封装了 Blob/axios 下载逻辑）

/**
 * 默认导出一个 Vue 插件安装函数
 *
 * Vue 的插件机制：导出一个函数（或带有 install 方法的对象），
 * 通过 app.use() 调用时，Vue 会自动把 app 实例作为第一个参数传进来
 *
 * @param {App} app  Vue 3 应用实例（createApp() 的返回值）
 *
 * ⚠️ 重要：app.config.globalProperties 是 Vue 3 的全局属性挂载点
 *   挂载到上面的属性，所有组件的 proxy 对象都能访问
 *   相当于 Java 的 ApplicationContext 中的全局 Bean
 */
export default function installPlugins(app){

  // ===== 1. 页签操作插件 =====
  // 挂载到 $tab，组件中通过 proxy.$tab.xxx() 调用
  // 功能：关闭当前页、跳转到指定页签、刷新页面等
  app.config.globalProperties.$tab = tab

  // ===== 2. 权限认证插件 =====
  // 挂载到 $auth，组件中通过 proxy.$auth.xxx() 调用
  // 功能：在 JS 代码里判断权限（hasPermi/hasRole），不局限于模板指令
  // 与 v-hasPermi/v-hasRole 指令的区别：
  //   - 指令：控制元素是否显示（模板层面）
  //   - $auth：在 JS 逻辑里判断权限（代码层面，如按钮点击前的权限校验）
  app.config.globalProperties.$auth = auth

  // ===== 3. 缓存操作插件 =====
  // 挂载到 $cache，组件中通过 proxy.$cache.xxx() 调用
  // 功能：封装了 sessionStorage（会话级）和 localStorage（持久级）的读写操作
  // 类比 Java 的 HttpSession vs 数据库存储
  app.config.globalProperties.$cache = cache

  // ===== 4. 模态框插件 =====
  // 挂载到 $modal，组件中通过 proxy.$modal.xxx() 调用
  // 功能：对 Element Plus 的 ElMessageBox 做了二次封装
  // 提供统一的 confirm、alert、msg 等方法，减少重复代码
  app.config.globalProperties.$modal = modal

  // ===== 5. 文件下载插件 =====
  // 挂载到 $download，组件中通过 proxy.$download.xxx() 调用
  // 功能：封装了 axios 请求 + Blob 处理 + 创建 <a> 标签触发下载的完整流程
  app.config.globalProperties.$download = download
}