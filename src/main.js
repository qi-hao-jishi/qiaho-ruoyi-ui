/**
 * ============================================================================
 * main.js —— Vue 应用的「总启动入口」
 * ----------------------------------------------------------------------------
 * Java 类比：
 *   这就是整个前端项目的 main(String[] args) 方法 +
 *   Spring Boot 的 SpringApplication.run() +
 *   各种 @Configuration 配置类的合体。
 *
 * 它做的 6 件大事：
 *   1. 引入 Vue 框架本身（createApp）
 *   2. 引入 UI 库（Element Plus）和图标
 *   3. 引入项目自己的核心模块（路由、状态管理、指令、插件）
 *   4. 引入若依封装的工具方法 + 常用业务组件
 *   5. 把工具方法挂到「全局属性」、把组件注册成「全局组件」
 *   6. 最后 app.mount('#app') —— 把整个应用渲染到页面的 <div id="app"> 上
 *
 * 启动流程示意：
 *   index.html → main.js → createApp(App) → 注册各种插件/组件 → mount('#app')
 *                                                                       ↓
 *                                                                   页面渲染！
 * ============================================================================
 */


// ============================================================================
// 第 1 区：Vue 核心 API
// ============================================================================

// createApp 是 Vue 3 创建应用实例的工厂函数
// Java 类比：相当于 SpringApplication.run(MyApp.class, args)
import { createApp } from 'vue'


// ============================================================================
// 第 2 区：第三方库
// ============================================================================

// js-cookie —— 操作浏览器 Cookie 的小工具
// Cookies.get('xxx') / Cookies.set('xxx', val)
// Java 类比：相当于一个简化版的 javax.servlet.http.Cookie 工具类
import Cookies from 'js-cookie'

// Element Plus —— 饿了么的 Vue 3 组件库（按钮、表格、表单全家桶）
// Java 类比：相当于前端的 Apache Commons Lang，超级常用的轮子
import ElementPlus from 'element-plus'

// 引入 Element Plus 的样式（CSS 文件）
// 注意：CSS 文件 import 进来不需要变量接收，引入即生效
import 'element-plus/dist/index.css'

// 引入 Element Plus 的暗黑模式 CSS 变量
// 这个文件提供了暗黑模式下的所有颜色变量
import 'element-plus/theme-chalk/dark/css-vars.css'

// 引入 Element Plus 的中文语言包
// 这样所有组件（如分页器、日期选择器）默认显示中文
import locale from 'element-plus/es/locale/lang/zh-cn'


// ============================================================================
// 第 3 区：全局样式
// ============================================================================

// 全局 css —— 项目自定义的 SCSS 样式
// @/assets/styles/index.scss = src/assets/styles/index.scss
// （@/ 是 vite.config.js 里配置的别名，等于 src/）
import '@/assets/styles/index.scss'


// ============================================================================
// 第 4 区：项目核心模块（自己写的"大动脉"）
// ============================================================================

// 根组件 App.vue —— 整个应用的最外层组件
// Java 类比：相当于 SpringApplication 启动类
import App from './App.vue'

// store —— Pinia 状态管理（全局共享数据）
// './store' 不带后缀 → 自动找 store/index.js
// Java 类比：相当于全局的 ApplicationContext，存放各种 @Service 的状态
import store from './store'

// router —— Vue Router 路由系统（页面跳转）
// Java 类比：相当于 SpringMVC 的 DispatcherServlet + 路由映射表
import router from './router'

// directive —— 自定义指令（如 v-hasPermi 权限指令）
// Java 类比：相当于 Spring AOP 的 @Aspect 切面
import directive from './directive'


// ============================================================================
// 第 5 区：插件 & 工具方法
// ============================================================================

// plugins —— 项目自定义插件（封装了 modal、tab、download 等便捷方法）
// 用 app.use(plugins) 注册后，可以在组件里通过 proxy.$xxx 访问
import plugins from './plugins'

// download —— 文件下载工具
// 解构语法：从 request.js 导出的多个函数中，只取 download 这一个
// Java 类比：import static com.xxx.RequestUtil.download;
import { download } from '@/utils/request'


// ============================================================================
// 第 6 区：SVG 图标
// ============================================================================

// 'virtual:svg-icons-register' 是 vite-plugin-svg-icons 提供的"虚拟模块"
// 它会把 src/assets/icons 下的所有 SVG 文件打包成一个 sprite（雪碧图）
// 引入即生效，不需要变量接收
// 'virtual:svg-icons-register' 是 vite-plugin-svg-icons 提供的"虚拟模块"
// 它会把 src/assets/icons 下的所有 SVG 文件打包成一个 sprite（雪碧图）
// 引入即生效，不需要变量接收
//
// 为什么知道去 src/assets/icons 找文件？
// 答案在 vite.config.js 里配置的！vite-plugin-svg-icons 插件初始化时指定了 iconDirs 路径：
//   createSvgIconsPlugin({
//     iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
//     symbolId: 'icon-[dir]-[name]'
//   })
// 所以这个虚拟模块是"有记忆的"，打包时会自动扫描该目录下的所有 .svg 文件


import 'virtual:svg-icons-register'

// SvgIcon 组件 —— 用来在模板里显示 SVG 图标，如 <svg-icon icon-class="user" />

import SvgIcon from '@/components/SvgIcon'

// elementIcons 插件 —— 把 Element Plus 的图标库批量注册为全局组件
// 这样模板里可以直接用 <el-icon><Edit /></el-icon>，不用每个文件都 import
import elementIcons from '@/components/SvgIcon/svgicon'


// ============================================================================
// 第 7 区：路由权限拦截
// ============================================================================

// './permission' —— 全局路由守卫（登录态检查、动态路由加载等）
// 这个文件里只有"副作用代码"（注册 router.beforeEach），不导出任何东西
// 所以只 import 不接收变量
//
// Java 类比：相当于 SpringMVC 的 HandlerInterceptor，拦截每次路由切换
import './permission'


// ============================================================================
// 第 8 区：业务工具函数
// ============================================================================

// useDict —— 字典数据的组合式函数（从后端拉取字典并缓存）
// 用法：const { sys_normal_disable } = useDict('sys_normal_disable')
import { useDict } from '@/utils/dict'

// getConfigKey —— 调后端接口获取系统参数（如登录页是否显示验证码）
import { getConfigKey } from "@/api/system/config"

// 若依框架的常用工具方法
// parseTime         —— 时间格式化（类似 Java 的 SimpleDateFormat）
// resetForm         —— 重置表单
// addDateRange      —— 给查询参数追加日期范围
// handleTree        —— 把扁平数组转成树形结构（递归处理）
// selectDictLabel   —— 根据值取字典文本（单选）
// selectDictLabels  —— 根据值取字典文本（多选）
import {
  parseTime,
  resetForm,
  addDateRange,
  handleTree,
  selectDictLabel,
  selectDictLabels
} from '@/utils/ruoyi'


// ============================================================================
// 第 9 区：业务全局组件
// ============================================================================
// 这些组件几乎每个页面都会用，所以注册成「全局组件」省得每个文件都 import

// 分页组件 —— 封装了 el-pagination，统一了若依项目的分页样式
import Pagination from '@/components/Pagination'

// 表格右上角工具栏（刷新、列设置、密度切换等）
import RightToolbar from '@/components/RightToolbar'

// 富文本编辑器组件（基于 Quill / TinyMCE）
import Editor from "@/components/Editor"

// 文件上传组件
import FileUpload from "@/components/FileUpload"

// 图片上传组件
import ImageUpload from "@/components/ImageUpload"

// 图片预览组件
import ImagePreview from "@/components/ImagePreview"

// 字典标签组件 —— 根据字典值显示对应的彩色标签
import DictTag from '@/components/DictTag'


// ============================================================================
// 第 10 区：创建 Vue 应用实例
// ============================================================================

// createApp(App) —— 以 App.vue 为根组件，创建一个 Vue 应用实例
// Java 类比：相当于 ApplicationContext context = SpringApplication.run(App.class)
const app = createApp(App)


// ============================================================================
// 第 11 区：挂载全局方法（globalProperties）
// ============================================================================
// 把工具方法挂到 app.config.globalProperties 上，
// 这样在任意组件里都可以通过 proxy.useDict / proxy.parseTime 访问，
// 不用每个组件都 import。
//
// Java 类比：
//   相当于把 @Component 注册到 ApplicationContext，
//   然后任意 Bean 都能通过 @Autowired 拿到。
//
// ⚠️ 缺点：用了之后 IDE 不容易跟踪定义，团队规范上越来越倾向于"显式 import"。

app.config.globalProperties.useDict = useDict
app.config.globalProperties.download = download
app.config.globalProperties.parseTime = parseTime
app.config.globalProperties.resetForm = resetForm
app.config.globalProperties.handleTree = handleTree
app.config.globalProperties.addDateRange = addDateRange
app.config.globalProperties.getConfigKey = getConfigKey
app.config.globalProperties.selectDictLabel = selectDictLabel
app.config.globalProperties.selectDictLabels = selectDictLabels


// ============================================================================
// 第 12 区：注册全局组件
// ============================================================================
// app.component('组件名', 组件对象) 把组件注册为全局组件
// 注册后，模板里直接 <DictTag /> 就能用，不用每个文件都 import
//
// Java 类比：
//   相当于把 Bean 注册到 ApplicationContext，全局可见。
//
// 命名规则：
//   - PascalCase（DictTag）和 kebab-case（<dict-tag />）模板里都能用
//   - 但全局组件名最好和组件文件名保持一致

app.component('DictTag', DictTag)
app.component('Pagination', Pagination)
app.component('FileUpload', FileUpload)
app.component('ImageUpload', ImageUpload)
app.component('ImagePreview', ImagePreview)
app.component('RightToolbar', RightToolbar)
app.component('Editor', Editor)


// ============================================================================
// 第 13 区：安装插件（app.use）
// ============================================================================
// app.use(插件) 是 Vue 注册插件的标准写法
// 插件内部会通过 install(app) 钩子做初始化（注册全局组件、挂方法等）
//
// Java 类比：
//   相当于 Spring 的 @EnableXxx 注解，开启某项能力。


app.use(router)        // 启用路由系统
app.use(store)         // 启用 Pinia 状态管理
app.use(plugins)       // 启用项目自定义插件
app.use(elementIcons)  // 启用 Element Plus 图标全局注册

// 这一行不是 use，而是直接注册一个全局组件 svg-icon
// 注意它的命名：'svg-icon'（kebab-case），模板里写 <svg-icon /> 调用

app.component('svg-icon', SvgIcon)


// ============================================================================
// 第 14 区：注册自定义指令
// ============================================================================
// directive 是个函数，传入 app 后内部会调用 app.directive('xxx', {...})
// 注册类似 v-hasPermi="['system:user:add']" 这样的权限指令
//
// Java 类比：相当于把 @Aspect 切面应用到全局。
directive(app)


// ============================================================================
// 第 15 区：安装 Element Plus 并配置全局选项
// ============================================================================
// 第二个参数是 ElementPlus 的全局配置对象：
//   - locale  : 语言包（中文）
//   - size    : 全局组件尺寸（large / default / small）
//
// Cookies.get('size') —— 优先读用户上次保存的尺寸偏好
// || 'default'        —— 没有则默认用 default
//
// Java 类比：相当于在 application.yml 里配置全局参数
app.use(ElementPlus, {
  locale: locale,
  // 支持 large、default、small
  size: Cookies.get('size') || 'default'
})


// ============================================================================
// 第 16 区：挂载到 DOM —— 真正"启动"应用！
// ============================================================================
// '#app' 是 CSS 选择器，对应 index.html 里的 <div id="app"></div>
//
// 执行这行后，Vue 把整个组件树渲染并插入到这个 div 中，页面才真正显示出来。
// 这是整个 main.js 唯一一行"产生可见效果"的代码，前面所有的注册都是为它铺路。
//
// Java 类比：
//   相当于 Spring Boot 的 SpringApplication.run() 真正启动 Tomcat、监听端口的那一刻。
//
// ⚠️ 重要规则：mount 必须放在最后！
//   因为 mount 之后再 use/component 注册的东西，已经渲染的组件感知不到。
app.mount('#app')
