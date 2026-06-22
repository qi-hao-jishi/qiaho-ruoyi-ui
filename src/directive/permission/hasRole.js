 /**
 * v-hasRole 角色权限处理（按钮级角色控制）
 * Copyright (c) 2019 ruoyi
 *
 * 【作用】根据用户的"角色"判断元素是否显示（角色 ≠ 权限）
 *
 * 【角色 vs 权限的区别】这是个面试常考点 ⭐
 *   - 角色（Role）：粗粒度，例如 admin（管理员）、user（普通用户）、editor（编辑）
 *   - 权限（Permission）：细粒度，例如 system:user:add、system:user:delete
 *   - 一个角色拥有多个权限，类似 Java 的"组+用户"关系
 *
 * 【使用示例】
 *   <el-button v-hasRole="['admin']">仅管理员可见</el-button>
 *   <el-button v-hasRole="['admin', 'editor']">管理员或编辑可见</el-button>
 *
 * 【对比 Java】等价于 Spring Security 的：
 *   @PreAuthorize("hasRole('admin')")
 *   @Secured("ROLE_ADMIN")
 */

// 引入用户 Pinia store，用来获取当前用户的角色列表
import useUserStore from '@/store/modules/user'

export default {
  /**
   * mounted 钩子：元素挂载到 DOM 后触发权限检查
   * （与 hasPermi.js 逻辑几乎一致，只是判断的字段从 permissions 换成了 roles）
   *
   * @param el      指令绑定的 DOM 元素
   * @param binding 包含 value 等绑定信息
   * @param vnode   Vue 虚拟节点
   */
  mounted(el, binding, vnode) {
    // 解构出 value（模板里传入的角色数组）
    const { value } = binding

    // 定义"超级管理员"角色标识，admin 角色拥有所有权限
    // 类比 Java 的 ROLE_SUPER_ADMIN
    const super_admin = "admin"

    // 从 Pinia 拿到当前用户的角色列表，例如 ['editor', 'reviewer']
    const roles = useUserStore().roles

    // 校验传入的 value 必须是非空数组
    if (value && value instanceof Array && value.length > 0) {
      const roleFlag = value

      /**
       * 判断逻辑：
       *  1. 用户拥有 "admin" 超级管理员角色 → 直接通过
       *  2. 或者用户的某个角色 在 roleFlag 中存在 → 通过
       *
       * Array.some() 等价于 Java 的 stream().anyMatch()
       */
      const hasRole = roles.some(role => {
        return super_admin === role || roleFlag.includes(role)
      })

      // 没角色就把元素从 DOM 中移除
      // ⚠️ 优雅的判空写法：el.parentNode && el.parentNode.removeChild(el)
      //    如果 parentNode 为 null（元素已经不在 DOM 中），不执行后面的代码
      //    这是 JS 的"短路求值"，类比 Java 的 if (parentNode != null) parentNode.remove()
      if (!hasRole) {
        el.parentNode && el.parentNode.removeChild(el)
      }
    } else {
      // 开发者忘了传角色数组，抛错提醒
      throw new Error(`请设置角色权限标签值`)
    }
  }
}
