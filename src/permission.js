/**
 * ============================================================================
 * 权限拦截器 —— 全局路由守卫
 * ----------------------------------------------------------------------------
 * 【这个文件是干嘛的？】
 *   拦截每次路由跳转，做登录态检查、权限验证、动态路由加载等
 *
 * 【Java 类比】
 *   相当于 Spring MVC 的 HandlerInterceptor 或 Spring Security 的 Filter
 *
 * 【执行流程】
 *   用户访问页面 → router.beforeEach → 检查登录态 → 检查权限 → 放行/跳转
 * ============================================================================
 */

// 引入路由实例
import router from './router'
// 引入 Element Plus 的消息提示组件
import { ElMessage } from 'element-plus'
// 引入 NProgress 进度条库（页面跳转时显示顶部进度条）
import NProgress from 'nprogress'
// 引入 NProgress 的样式文件
import 'nprogress/nprogress.css'
// 引入获取 Token 的工具函数
import { getToken } from '@/utils/auth'
// 引入验证工具函数
import { isHttp, isPathMatch } from '@/utils/validate'
// 引入重新登录的提示工具
import { isRelogin } from '@/utils/request'
// 引入用户状态管理 Store
import useUserStore from '@/store/modules/user'
// 引入锁屏状态管理 Store
import useLockStore from '@/store/modules/lock'
// 引入设置状态管理 Store
import useSettingsStore from '@/store/modules/settings'
// 引入权限状态管理 Store
import usePermissionStore from '@/store/modules/permission'

// 配置 NProgress：不显示旋转的加载图标
NProgress.configure({ showSpinner: false })

/**
 * 免登录白名单
 * 这些路径不需要登录就可以访问
 * Java 类比：Spring Security 的 permitAll() 白名单
 */
const whiteList = ['/login', '/register']

/**
 * 检查路径是否在白名单中
 * @param {string} path 要检查的路径
 * @returns {boolean} 是否在白名单中
 */
const isWhiteList = (path) => {
  return whiteList.some(pattern => isPathMatch(pattern, path))
}

/**
 * ============================================================================
 * 路由前置守卫（核心拦截逻辑）
 * ============================================================================
 * 每次路由跳转前都会执行这个函数
 * Java 类比：HandlerInterceptor 的 preHandle() 方法
 *
 * @param {object} to 目标路由对象（要跳转到哪里）
 * @param {object} from 当前路由对象（从哪里跳转过来）
 * @returns {object|boolean} 返回值控制路由跳转行为
 */
router.beforeEach(async (to, from) => {
  // 1. 开始显示顶部进度条
  NProgress.start()

  // 2. 检查是否有 Token（是否已登录）
  if (getToken()) {
    // ========== 已登录的逻辑 ==========

    // 如果目标路由有标题，就设置页面标题
    to.meta.title && useSettingsStore().setTitle(to.meta.title)

    // 获取锁屏状态
    const isLock = useLockStore().isLock

    // 场景 1：已登录但还想跳转到登录页 → 直接跳转到首页
    if (to.path === '/login') {
      NProgress.done()
      return { path: '/' }
    }

    // 场景 2：目标路由在白名单中 → 直接放行
    if (isWhiteList(to.path)) {
      return true
    }

    // 场景 3：已锁屏且目标页不是锁屏页 → 跳转到锁屏页
    if (isLock && to.path !== '/lock') {
      NProgress.done()
      return { path: '/lock' }
    }

    // 场景 4：未锁屏但目标页是锁屏页 → 跳转到首页
    if (!isLock && to.path === '/lock') {
      NProgress.done()
      return { path: '/' }
    }

    // 场景 5：用户角色信息还未加载（第一次访问）→ 加载用户信息和动态路由
    if (useUserStore().roles.length === 0) {
      // 显示重新登录提示的遮罩层
      isRelogin.show = true
      try {
        // 2.1 拉取用户信息（角色、权限等）
        await useUserStore().getInfo()
        // 隐藏重新登录提示的遮罩层
        isRelogin.show = false

        // 2.2 根据用户权限生成可访问的动态路由
        const accessRoutes = await usePermissionStore().generateRoutes()

        // 2.3 动态添加路由到 router 中
        accessRoutes.forEach(route => {
          // 只添加非 HTTP 协议的路由（排除外部链接）
          if (!isHttp(route.path)) {
            router.addRoute(route)
          }
        })

        // 2.4 重新导航到目标路由，确保动态路由已注册
        // replace: true 表示替换当前历史记录，不产生新记录
        return { ...to, replace: true }
      } catch (err) {
        // 加载失败 → 退出登录并跳转回首页
        await useUserStore().logOut()
        // 显示错误消息
        ElMessage.error(err)
        return { path: '/' }
      }
    }

    // 场景 6：以上检查都通过 → 直接放行
    return true
  } else {
    // ========== 未登录的逻辑 ==========

    // 场景 1：目标路由在白名单中（登录页、注册页）→ 直接放行
    if (isWhiteList(to.path)) {
      return true
    }

    // 场景 2：不在白名单中 → 跳转到登录页，并记录原来的路径（登录成功后跳回来）
    NProgress.done()
    return `/login?redirect=${to.fullPath}`
  }
})

/**
 * ============================================================================
 * 路由后置守卫
 * ============================================================================
 * 每次路由跳转完成后都会执行这个函数
 * Java 类比：HandlerInterceptor 的 afterCompletion() 方法
 */
router.afterEach(() => {
  // 路由跳转完成，关闭顶部进度条
  NProgress.done()
})
