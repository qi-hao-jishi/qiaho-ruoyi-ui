// ==================== 引入依赖 ====================
// 从 vue-router 引入两个核心 API：
// - createWebHistory：创建 HTML5 History 模式（URL 中没有 #，更美观，但需要后端配合做 nginx 重定向）
// - createRouter：创建路由实例的工厂函数（类比 Spring 的 ApplicationContext 创建）
// 另一种模式叫 createWebHashHistory，URL 带 # 号，无需后端配合（坑：刷新页面 404 多半是用了 history 模式但没配 nginx）
import { createWebHistory, createRouter } from 'vue-router'

/* Layout 整体布局组件 —— 相当于 Java 项目中的"母版页/模板页"，包含侧边栏、顶栏、面包屑等公共结构 */
// 注意这里是直接 import（同步加载），因为 Layout 是核心骨架，必须立即加载
// 而下面的页面组件用 () => import('xxx') 是【懒加载】（路由级代码分割），访问到才加载，类似 Spring 的 @Lazy
import Layout from '@/layout'

/**
 * Note: 路由配置项说明（这是若依框架的自定义扩展属性，不是 vue-router 原生的，别搞混了 ⚠️）
 *
 * hidden: true                     // 当设置 true 的时候该路由不会再侧边栏出现 如401，login等页面，或者如一些编辑页面/edit/1
 * alwaysShow: true                 // 当你一个路由下面的 children 声明的路由大于1个时，自动会变成嵌套的模式--如组件页面
 *                                  // 只有一个时，会将那个子路由当做根路由显示在侧边栏--如引导页面
 *                                  // 若你想不管路由下面的 children 声明的个数都显示你的根路由
 *                                  // 你可以设置 alwaysShow: true，这样它就会忽略之前定义的规则，一直显示根路由
 * redirect: noRedirect             // 当设置 noRedirect 的时候该路由在面包屑导航中不可被点击
 * name:'router-name'               // 设定路由的名字，一定要填写不然使用<keep-alive>时会出现各种问题
 * query: '{"id": 1, "name": "ry"}' // 访问路由的默认传递参数
 * roles: ['admin', 'common']       // 访问路由的角色权限（类比 Spring Security 的 hasRole）
 * permissions: ['a:a:a', 'b:b:b']  // 访问路由的菜单权限（类比 Spring Security 的 hasAuthority）
 * meta : {
    noCache: true                   // 如果设置为true，则不会被 <keep-alive> 缓存(默认 false)
    title: 'title'                  // 设置该路由在侧边栏和面包屑中展示的名字
    icon: 'svg-name'                // 设置该路由的图标，对应路径src/assets/icons/svg
    breadcrumb: false               // 如果设置为false，则不会在breadcrumb面包屑中显示
    activeMenu: '/system/user'      // 当路由设置了该属性，则会高亮相对应的侧边栏。
  }
 */

// ==================== 公共路由（不需要权限，所有人都能访问）====================
// 类比 Spring Security 中的 permitAll() 白名单接口
// 这些路由在项目启动时就注册到路由实例里，不需要登录就能匹配
export const constantRoutes = [
  // 【重定向中转路由】
  // 用途：刷新当前页面用的小技巧 —— 跳转到 /redirect/xxx，再由 redirect 组件跳回原页面
  // 因为 Vue 的 keep-alive 缓存了组件，普通跳转无法触发组件重建，所以借助这个路由"曲线救国"
  {
    path: '/redirect',
    component: Layout,
    hidden: true, // 不显示在侧边栏
    children: [
      {
        // (.*) 是路由正则，匹配任意路径，可以接收任何子路径作为参数
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index.vue')
      }
    ]
  },
  // 【登录页】无需 Layout 包裹（登录页通常是全屏的）
  {
    path: '/login',
    component: () => import('@/views/login'),
    hidden: true
  },
  // 【注册页】同上
  {
    path: '/register',
    component: () => import('@/views/register'),
    hidden: true
  },
  // 【404 页面】⚠️ 重要坑提示：
  // :pathMatch(.*)* 是 vue-router 4 的通配符写法（vue-router 3 是用 *）
  // 必须放在所有具体路由之后，不然会"短路"所有路由都匹配到 404
  // 但这里放在前面也没事，因为最终注册时 vue-router 是按顺序匹配，没匹配到才走通配
  {
    path: "/:pathMatch(.*)*",
    component: () => import('@/views/error/404'),
    hidden: true
  },
  // 【401 无权限页面】类比 Spring 的 AccessDeniedException 处理页
  {
    path: '/401',
    component: () => import('@/views/error/401'),
    hidden: true
  },
  // 【根路由 —— 首页】
  // path: '' 表示访问根路径时，自动 redirect 到 /index
  // children 中的 /index 才是真正的首页组件，被 Layout 包裹（有侧边栏、顶栏）
  {
    path: '',
    component: Layout,
    redirect: '/index',
    children: [
      {
        path: '/index',
        component: () => import('@/views/index'),
        name: 'Index', // 路由名字一定要写！keep-alive 缓存依赖它
        // affix: true 表示这个标签在 tagsView 中是"固定"的，无法被关闭（首页常驻）
        meta: { title: '首页', icon: 'dashboard', affix: true }
      }
    ]
  },
  // 【锁屏页面】用户离开时锁定，回来需要重新输密码
  {
    path: '/lock',
    component: () => import('@/views/lock'),
    hidden: true,
    meta: { title: '锁定屏幕' }
  },
  // 【个人中心路由】
  // hidden: true 不在侧边栏显示（因为通常从右上角头像下拉进入）
  // redirect: 'noredirect' 表示面包屑中此节点不可点击
  {
    path: '/user',
    component: Layout,
    hidden: true,
    redirect: 'noredirect',
    children: [
      {
        // :activeTab? 中的 ? 表示参数可选（这是 vue-router 的语法糖，类似正则的可选量词）
        // 例如 /user/profile 和 /user/profile/basic 都能匹配
        path: 'profile/:activeTab?',
        component: () => import('@/views/system/user/profile/index'),
        name: 'Profile',
        meta: { title: '个人中心', icon: 'user' }
      }
    ]
  }
]

// ==================== 动态路由（需要权限才能访问）====================
// 这些路由不是一开始就注册的，而是用户【登录后】根据后端返回的权限列表，
// 通过 router.addRoute() 动态添加进去 —— 这就是若依的【权限路由】机制
// 类比 Spring Security：用户认证成功后，根据角色赋予不同的 GrantedAuthority
export const dynamicRoutes = [
  // 【分配角色】
  // permissions 字段：拥有 'system:user:edit' 权限的用户才能访问
  // 这个字段不是 vue-router 原生的，是若依在权限拦截器（permission.js）里自定义校验的
  {
    path: '/system/user-auth',
    component: Layout,
    hidden: true,
    permissions: ['system:user:edit'],
    children: [
      {
        // :userId(\\d+) 表示参数必须是数字（正则约束）
        // 双反斜杠是因为字符串里 \ 需要转义，实际正则是 \d+
        // 类比 Spring MVC 的 @PathVariable 校验：@GetMapping("/{userId:\\d+}")
        path: 'role/:userId(\\d+)',
        component: () => import('@/views/system/user/authRole'),
        name: 'AuthRole',
        // activeMenu：访问这个页面时，侧边栏高亮 /system/user 那一项
        // 因为"分配角色"是从用户列表点进来的，逻辑上属于用户管理
        meta: { title: '分配角色', activeMenu: '/system/user' }
      }
    ]
  },
  // 【角色 → 分配用户】跟上面对称，角色管理页点进来的子页面
  {
    path: '/system/role-auth',
    component: Layout,
    hidden: true,
    permissions: ['system:role:edit'],
    children: [
      {
        path: 'user/:roleId(\\d+)',
        component: () => import('@/views/system/role/authUser'),
        name: 'AuthUser',
        meta: { title: '分配用户', activeMenu: '/system/role' }
      }
    ]
  },
  // 【字典数据管理】点击具体字典类型查看下面的字典项
  {
    path: '/system/dict-data',
    component: Layout,
    hidden: true,
    permissions: ['system:dict:list'],
    children: [
      {
        path: 'index/:dictId(\\d+)',
        component: () => import('@/views/system/dict/data'),
        name: 'Data',
        meta: { title: '字典数据', activeMenu: '/system/dict' }
      }
    ]
  },
  // 【定时任务调度日志】点击具体任务查看执行历史
  {
    path: '/monitor/job-log',
    component: Layout,
    hidden: true,
    permissions: ['monitor:job:list'],
    children: [
      {
        path: 'index/:jobId(\\d+)',
        component: () => import('@/views/monitor/job/log'),
        name: 'JobLog',
        meta: { title: '调度日志', activeMenu: '/monitor/job' }
      }
    ]
  },
  // 【代码生成器编辑页】若依的"灵魂"功能 —— 根据数据库表自动生成 CRUD 代码
  {
    path: '/tool/gen-edit',
    component: Layout,
    hidden: true,
    permissions: ['tool:gen:edit'],
    children: [
      {
        path: 'index/:tableId(\\d+)',
        component: () => import('@/views/tool/gen/editTable'),
        name: 'GenEdit',
        meta: { title: '修改生成配置', activeMenu: '/tool/gen' }
      }
    ]
  }
]

// ==================== 创建路由实例 ====================
// 类比 Java：相当于 new Router()，并通过配置对象注入参数（构造器注入思想）
const router = createRouter({
  // 使用 HTML5 History 模式（URL 干净，不带 #）
  // ⚠️ 部署到生产环境时，nginx 需配置 try_files $uri $uri/ /index.html
  // 否则刷新页面会 404（因为后端找不到对应路由的物理文件）
  history: createWebHistory(),

  // 初始注册的路由表 —— 只放公共路由，动态路由后续由 permission.js 添加
  routes: constantRoutes,

  /**
   * scrollBehavior: 路由切换时的滚动行为控制
   * @param to            目标路由对象
   * @param from          离开的路由对象
   * @param savedPosition 浏览器前进/后退时保存的滚动位置（只在 popstate 触发时有值）
   * @returns 滚动位置 { top, left } 或 false（不滚动）
   *
   * 逻辑：
   *  - 如果是浏览器前进/后退，恢复之前的滚动位置（提升体验）
   *  - 否则滚动到页面顶部（避免新页面打开后停留在上个页面的滚动位置，那样很尴尬 😅）
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

// 导出路由实例，给 main.js 通过 app.use(router) 挂载到 Vue 应用
// 同时也会在 permission.js 等地方被 import 进去做路由守卫、动态添加路由
export default router
