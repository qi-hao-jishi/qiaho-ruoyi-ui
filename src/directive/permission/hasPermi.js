 /**
 * v-hasPermi 操作权限处理（按钮级权限控制）
 * Copyright (c) 2019 ruoyi
 *
 * 【作用】控制按钮/元素的显示与否，没权限就直接从 DOM 上移除
 *
 * 【使用示例】
 *   <el-button v-hasPermi="['system:user:add']">新增</el-button>
 *   <el-button v-hasPermi="['system:user:edit', 'system:user:remove']">编辑或删除</el-button>
 *
 * 【对比 Java】等价于 Spring Security 的：
 *   @PreAuthorize("hasAuthority('system:user:add')")
 *   只不过 Spring 是控制后端接口，这里是控制前端按钮显示
 *
 * 【为什么前后端都要做权限校验？】
 *   - 前端校验：用户体验好，没权限的按钮直接不显示，避免点了才报错
 *   - 后端校验：安全防线，前端可以被绕过（F12 改代码），最终安全靠后端
 *   ⚠️ 切记：永远不要只依赖前端权限！必须前后端双重校验！
 */

// 引入用户 Pinia store，用来获取当前用户的权限列表
import useUserStore from '@/store/modules/user'

// 默认导出一个指令定义对象
export default {
  /**
   * mounted 钩子：指令所在元素被挂载到 DOM 后触发
   * 类比 Java：相当于 Spring AOP 的 @After 切点 —— 元素渲染后执行权限检查
   *
   * @param el      指令绑定的 DOM 元素（原生 HTMLElement）
   * @param binding 指令的绑定信息对象，包含 value、arg、modifiers 等
   * @param vnode   Vue 的虚拟节点（一般用不到）
   */
  mounted(el, binding, vnode) {
    // 从绑定对象中解构出 value（就是模板里 v-hasPermi="xxx" 的 xxx）
    const { value } = binding

    // 定义"超级权限"标识符，拥有 *:*:* 表示拥有所有权限（类比 Java 的 ROLE_ROOT）
    const all_permission = "*:*:*"

    // 从 Pinia 中拿到当前用户的权限码列表，例如 ['system:user:add', 'system:user:edit']
    const permissions = useUserStore().permissions

    // 校验 value 必须是非空数组（指令使用规范）
    if (value && value instanceof Array && value.length > 0) {
      // 用户在模板中传入的"需要检查的权限码"数组
      const permissionFlag = value

      /**
       * 使用 Array.some() 判断用户权限中是否存在匹配项
       * some() 类比 Java 的 stream().anyMatch()
       *
       * 匹配规则：
       *  1. 只要用户拥有 "*:*:*"（超级权限），直接通过
       *  2. 或者用户的权限码 在 permissionFlag 数组中存在
       */
      const hasPermissions = permissions.some(permission => {
        return all_permission === permission || permissionFlag.includes(permission)
      })

      // 如果没有权限，把元素从父节点中"移除"（不是隐藏，是真的删掉）
      // 类比 Java：相当于 if (!hasPermission) throw new AccessDeniedException();
      //          但这里没有抛错，而是静默移除，用户体验更好
      // ⚠️ 注意：是 removeChild 真的从 DOM 中删除，而不是 display: none 隐藏
      //         区别在于 F12 也看不到这个元素了，更安全
      if (!hasPermissions) {
        el.parentNode && el.parentNode.removeChild(el)
      }
    } else {
      // 使用规范错误：开发者忘了传权限数组，直接抛错提醒（开发期就能发现）
      // 类比 Java 的 IllegalArgumentException
      throw new Error(`请设置操作权限标签值`)
    }
  }
}
