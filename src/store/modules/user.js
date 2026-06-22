// ==================== 用户状态管理 Store（Pinia）====================
//
// 【这个文件是干嘛的？】
//   这是整个项目的"用户认证 & 权限中心"，类比 Spring Security 的：
//     - UserDetailsService（加载用户信息）
//     - AuthenticationManager（处理登录）
//     - SecurityContextHolder（存储当前用户安全上下文）
//   三合一！
//
// 【核心职责】
//   1. 管理登录状态（token）
//   2. 存储用户基本信息（id、name、头像等）
//   3. 存储用户的角色（roles）和权限（permissions）—— 供 hasRole/hasPermi 指令使用
//   4. 提供登录、获取用户信息、退出登录三个核心方法
//
// 【数据流向】
//   登录 → 存 token → 拿用户信息 → 存 roles/permissions → 权限指令消费 → 退出清理

// ==================== 引入依赖 ====================

// router 实例：用于登录后跳转、初始密码/过期密码强制跳转修改密码页
import router from '@/router'

// 缓存工具：用于 sessionStorage 缓存（存密码加密类型，退出时清除）
// 类比 Java 的 HttpSession
import cache from '@/plugins/cache'

// Element Plus 的消息确认弹窗（用于"初始密码/过期密码"提示）
import { ElMessageBox, } from 'element-plus'

// 后端 API 接口：登录、退出、获取用户信息
// 类比 Java 的 Feign 接口或 RestTemplate 调用
import { login, logout, getInfo } from '@/api/login'

// Token 工具：操作 localStorage 中的 token（get/set/remove）
// 类比 Java 中 JWT 的存储和读取
import { getToken, setToken, removeToken } from '@/utils/auth'

// 校验工具：判断是否是 http 开头的完整 URL、判断是否为空
import { isHttp, isEmpty } from "@/utils/validate"

// 锁屏 Store：登录成功后解锁屏幕
import useLockStore from '@/store/modules/lock'

// 默认头像：用户没有设置头像时用这个
import defAva from '@/assets/images/profile.jpg'

/**
 * 定义用户 Store
 *
 * defineStore('user', { ... }) 类比 Java：
 *   @Service("userService")
 *   public class UserService { ... }
 *
 * 第一个参数 'user' 是 Store 的唯一标识符（类比 Bean 的 name）
 * 这个 Store 是整个权限体系的"数据源"：
 *   - hasPermi.js 指令里 import useUserStore() 拿权限
 *   - hasRole.js 指令里拿角色
 *   - 路由守卫（permission.js）里拿 token 判断登录状态
 */
const useUserStore = defineStore(
  'user',
  {
    // ==================== State（状态）====================
    // 类比 Java 类的成员变量
    // 这些数据是"响应式"的，任何组件引用它们都会自动更新视图
    state: () => ({
      // token（JWT）：项目的"身份凭证"，前端存 localStorage，每次请求带在 Header 里
      // 初始化时从 localStorage 读取，如果之前登录过，刷新页面 token 还在
      // 类比 Java：HttpSession 中的 sessionId / JWT token
      token: getToken(),

      // 用户 ID
      id: '',
      // 用户名（登录账号）
      name: '',
      // 昵称（显示名称，可以和用户名不同）
      nickName: '',
      // 头像地址
      avatar: '',

      // ⭐ 角色列表：例如 ['admin', 'editor', 'user']
      // 供 v-hasRole 指令消费，判断用户是否具备某个角色
      roles: [],

      // ⭐ 权限码列表：例如 ['system:user:add', 'system:user:edit', '*:*:*']
      // 供 v-hasPermi 指令消费，判断用户是否具备某个操作权限
      // 这是若依权限体系的核心数据！
      permissions: []
    }),

    // ==================== Actions（方法）====================
    // 类比 Java 类的 public 方法
    // 修改 state 的唯一入口（Pinia 没有 mutations，比 Vuex 简洁）
    actions: {

      // ==================== 1. 登录方法 ====================
      /**
       * 登录流程：
       *  1. 去掉用户名前后空格（trim）
       *  2. 调用后端登录 API
       *  3. 成功后存 token 到 localStorage
       *  4. 解锁屏幕（如果之前锁了）
       *
       * @param userInfo 登录表单数据 { username, password, code, uuid }
       * @returns Promise 用 Promise 包装，让调用方可以 await 或 .then()
       *
       * ⚠️ 为什么用 new Promise 包装？
       *   因为 login() 是异步 AJAX 请求，调用方需要知道"什么时候登录完"
       *   类比 Java 的 CompletableFuture 或 @Async 返回 Future
       */
      login(userInfo) {
        // 去掉用户名前后空格（防用户手滑多打空格导致登录失败）
        const username = userInfo.username.trim()
        const password = userInfo.password
        const code = userInfo.code        // 验证码
        const uuid = userInfo.uuid        // 验证码唯一标识

        // 返回 Promise，让调用方（登录页面）能够 .then() 处理成功 / .catch() 处理失败
        return new Promise((resolve, reject) => {
          // 调用后端 API：POST /login
          login(username, password, code, uuid).then(res => {
            // 登录成功：把 token 存到 localStorage（持久化，关浏览器也不丢）
            setToken(res.token)
            // 更新 state 中的 token
            this.token = res.token
            // 解锁屏幕：登录成功后如果之前锁屏了，自动解锁
            // 类比 Java：登录成功后清除 Session 中的锁屏标记
            useLockStore().unlockScreen()
            resolve()  // 告诉调用方：登录成功！
          }).catch(error => {
            reject(error)  // 告诉调用方：登录失败！
          })
        })
      },

      // ==================== 2. 获取用户信息 ====================
      /**
       * 获取当前登录用户的信息（角色、权限、头像等）
       *
       * 调用时机：
       *  - 路由守卫（permission.js）在每次路由跳转前调用
       *  - 目的是确保 roles 和 permissions 数据是最新的
       *
       * 处理逻辑：
       *  1. 调用后端 getInfo API
       *  2. 处理头像（本地路径拼接完整 URL / 默认头像）
       *  3. 存储角色和权限到 state
       *  4. 检查密码状态（初始密码 / 过期密码 → 弹窗强制跳转修改页）
       *
       * @returns Promise
       */
      getInfo() {
        return new Promise((resolve, reject) => {
          // 调用后端 API：GET /getInfo
          getInfo().then(res => {
            const user = res.user

            // ===== 头像处理逻辑 =====
            let avatar = user.avatar || ""
            // 如果不是完整 HTTP 链接（说明是后端返回的相对路径，如 /profile/avatar/xxx.jpg）
            if (!isHttp(avatar)) {
              // 如果头像为空，用默认头像；否则拼接 API 基础路径
              // import.meta.env.VITE_APP_BASE_API 是 Vite 的环境变量，如 http://localhost:8080
              avatar = (isEmpty(avatar)) ? defAva : import.meta.env.VITE_APP_BASE_API + avatar
            }

            // ===== 角色和权限赋值 =====
            if (res.roles && res.roles.length > 0) {
              // 后端返回了角色列表，正常赋值
              this.roles = res.roles
              this.permissions = res.permissions
            } else {
              // 后端没返回角色（极端情况），给一个默认角色，防止页面一片空白
              this.roles = ['ROLE_DEFAULT']
            }

            // ===== 用户基本信息赋值 =====
            this.id = user.userId
            this.name = user.userName
            this.nickName = user.nickName
            this.avatar = avatar

            // 缓存密码加密类型到 sessionStorage（前端加密密码时用）
            // 类比 Java：把加密算法类型存到 Session 中
            cache.session.set('pwrChrtype', res.pwdChrtype)

            // ===== 密码安全提示 =====
            // 初始密码提示：管理员创建用户后分配了默认密码，首次登录强制修改
            if(res.isDefaultModifyPwd) {
              ElMessageBox.confirm(
                '您的密码还是初始密码，请修改密码！',
                '安全提示',
                { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
              ).then(() => {
                // 点击确定：跳转到个人中心的"修改密码"tab
                // name: 'Profile' 是路由名称，activeTab: 'resetPwd' 是路由参数
                router.push({ name: 'Profile', params: { activeTab: 'resetPwd' } })
              }).catch(() => {})
              // 点击取消：什么都不做（用户自己选择不修改，但下次还会提醒）
            }

            // 过期密码提示：密码超过了有效期，强制修改
            // ⚠️ 注意：只有非初始密码 + 密码过期才弹这个（初始密码已经弹过了，不重复弹）
            if(!res.isDefaultModifyPwd && res.isPasswordExpired) {
              ElMessageBox.confirm(
                '您的密码已过期，请尽快修改密码！',
                '安全提示',
                { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
              ).then(() => {
                router.push({ name: 'Profile', params: { activeTab: 'resetPwd' } })
              }).catch(() => {})
            }

            resolve(res)
          }).catch(error => {
            reject(error)
          })
        })
      },

      // ==================== 3. 退出登录 ====================
      /**
       * 退出登录流程：
       *  1. 调用后端注销 API（告诉后端这个 token 作废了）
       *  2. 清空前端 state（token、角色、权限）
       *  3. 移除 localStorage 中的 token
       *
       * ⚠️ 注意顺序：先调后端 API，再清前端。如果后端调用失败，前端数据还在
       */
      logOut() {
        return new Promise((resolve, reject) => {
          // 调用后端 API：POST /logout，传当前 token
          logout(this.token).then(() => {
            // 清空 state
            this.token = ''
            this.roles = []
            this.permissions = []
            // 移除 localStorage 中的 token
            removeToken()
            resolve()
          }).catch(error => {
            reject(error)
          })
        })
      }
    }
  })

// 默认导出，供其他模块使用
// 使用方式：import useUserStore from '@/store/modules/user'
//          const userStore = useUserStore()
//          userStore.login({ username, password, code, uuid })
export default useUserStore