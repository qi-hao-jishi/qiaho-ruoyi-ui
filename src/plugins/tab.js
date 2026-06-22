// ==================== 页签（Tab）操作工具插件 ====================
//
// 【这个文件是干嘛的？】
//   若依后台管理系统顶部有一排"标签页"（类似浏览器的 Tab），点击侧边栏菜单会打开一个新标签页，
//   用户可以在多个页面间快速切换。这个文件就是封装了对这些标签页的操作工具集。
//
// 【效果图描述】
//   ┌──────────────────────────────────────────────┐
//   │ 顶栏                                          │
//   ├──┬─────────────────────────────────────────────┤
//   │侧│ [首页] [用户管理] [角色管理 ✕] [菜单管理 ✕]  │ ← 这些就是 Tab 页签
//   │边├─────────────────────────────────────────────┤
//   │栏│                                              │
//   │  │     当前激活的页面内容                       │
//   └──┴─────────────────────────────────────────────┘
//
// 【类比 Java】
//   想象一下你在 IDEA 里同时打开了好几个 .java 文件的标签，可以右键"关闭"、"关闭其他"、"关闭右侧"、
//   "关闭全部"。这个文件提供的就是这套操作的 API，类似一个 TabManagerService
//
// 【挂载方式】
//   plugins/index.js 里：app.config.globalProperties.$tab = tab
//   组件中使用：proxy.$tab.closePage()、proxy.$tab.refreshPage() 等

// 引入 tagsView Store —— 真正存储和管理标签页数据的 Pinia store
// 类比 Java：TabStateRepository（数据仓库层）
// 本文件只是 API 封装层，真正改数据要调 store 里的 action
import useTagsViewStore from '@/store/modules/tagsView'

// 引入路由实例 —— 用来跳转页面 / 获取当前路由信息
import router from '@/router'

// 默认导出一个对象，里面是所有的页签操作方法
// 类比 Java：相当于一个 @Service 类，提供 8 个 public 方法
export default {

  // ==================== 1. 刷新当前 tab 页签 ====================
  /**
   * 刷新当前页签（重新加载组件，绕过 keep-alive 缓存）
   *
   * 实现思路（巧妙的技巧）：
   *   1. 删除 keep-alive 缓存里的当前组件
   *   2. 跳转到 /redirect/xxx 中转路由（还记得 router/index.js 里那个特殊路由吗？）
   *   3. 中转路由立即跳回原路径 → 组件被重新创建 → 达到刷新效果
   *
   * @param obj 可选，传入要刷新的目标对象 { name, path, query }，不传则刷新当前路由
   */
  refreshPage(obj) {
    // 解构当前路由信息
    // currentRoute.value 是 Vue Router 4 的写法（route 是 ref 响应式对象，要 .value 取值）
    // matched 是当前路由匹配到的"所有层级"路由记录数组（嵌套路由会有多层）
    const { path, query, matched } = router.currentRoute.value

    // ⚠️ 防止在重定向过程中重复刷新
    // 如果当前路径已经是 /redirect/xxx，说明正在中转跳转，直接返回，避免死循环
    if (path.startsWith('/redirect/')) {
      return Promise.resolve()
    }

    // 如果调用方没传 obj，自动从当前路由的 matched 数组中找出"真实页面组件"
    if (obj === undefined) {
      // matched 包含所有嵌套层级，需要过滤掉 Layout、ParentView 这些"外壳"组件
      matched.forEach((m) => {
        // 确保该路由有默认组件且组件有 name 属性
        if (m.components && m.components.default && m.components.default.name) {
          // 排除外壳组件（Layout 是布局，ParentView 是嵌套路由的占位）
          // 类比 Java：跳过抽象类，只要具体实现类
          if (!['Layout', 'ParentView'].includes(m.components.default.name)) {
            obj = { name: m.components.default.name, path: path, query: query }
          }
        }
      })
    }

    // 调用 tagsView store 的 delCachedView：删除 keep-alive 中的组件缓存
    // delCachedView 返回 Promise，缓存清完后再跳转 → 确保下次进入时是新组件实例
    return useTagsViewStore().delCachedView(obj).then(() => {
      const { path, query } = obj
      // 跳到 /redirect 中转路由，由它再跳回原路径
      // 这是若依的"刷新页面"标准套路（router/index.js 里讲过）
      router.replace({
        path: '/redirect' + path,
        query: query
      })
    })
  },

  // ==================== 2. 关闭当前 tab，打开新 tab ====================
  /**
   * 关闭当前标签，并跳转打开新标签
   *
   * 使用场景：例如表单提交完关闭当前编辑页，跳转到列表页
   *
   * @param obj 要打开的新页面（router.push 的参数）
   */
  closeOpenPage(obj) {
    // 先删除当前标签
    useTagsViewStore().delView(router.currentRoute.value)
    // 再跳转到新页面（如果传了 obj）
    if (obj !== undefined) {
      return router.push(obj)
    }
  },

  // ==================== 3. 关闭指定 tab 页签 ====================
  /**
   * 关闭某个标签（不传参数则关闭当前标签）
   *
   * 关闭当前标签时的逻辑：
   *   1. 从 store 删除当前 view
   *   2. 拿到剩余 view 列表的最后一个，自动跳过去
   *   3. 如果没有剩余 view，跳回首页 /
   *
   * @param obj 可选，要关闭的目标 view，不传默认当前
   */
  closePage(obj) {
    if (obj === undefined) {
      // 关闭当前页：delView 返回 { visitedViews } —— 剩余的所有已访问 view
      return useTagsViewStore().delView(router.currentRoute.value).then(({ visitedViews }) => {
        // slice(-1)[0] 取数组最后一个元素（最近访问的标签）
        // 类比 Java：list.get(list.size() - 1)
        const latestView = visitedViews.slice(-1)[0]
        if (latestView) {
          // 有剩余标签 → 跳到最近的那个
          return router.push(latestView.fullPath)
        }
        // 没有剩余标签 → 跳回首页
        return router.push('/')
      })
    }
    // 传了参数 → 直接关闭指定 view，不做跳转
    return useTagsViewStore().delView(obj)
  },

  // ==================== 4. 关闭所有 tab 页签 ====================
  /**
   * 一键关闭所有标签
   * ⚠️ 注意：affix: true 的标签（如首页）通常不会被关闭，这个由 store 内部决定
   */
  closeAllPage() {
    return useTagsViewStore().delAllViews()
  },

  // ==================== 5. 关闭左侧 tab 页签 ====================
  /**
   * 关闭某个标签左边的所有标签
   * @param obj 参照点，不传则以当前路由为参照
   *
   * ⚠️ 这里的 obj || router.currentRoute.value 是【短路求值】写法：
   *    如果 obj 是 undefined（假值），就用 router.currentRoute.value
   *    类比 Java：obj != null ? obj : currentRoute
   */
  closeLeftPage(obj) {
    return useTagsViewStore().delLeftTags(obj || router.currentRoute.value)
  },

  // ==================== 6. 关闭右侧 tab 页签 ====================
  /**
   * 关闭某个标签右边的所有标签
   * @param obj 参照点，不传则以当前路由为参照
   */
  closeRightPage(obj) {
    return useTagsViewStore().delRightTags(obj || router.currentRoute.value)
  },

  // ==================== 7. 关闭其他 tab 页签 ====================
  /**
   * 关闭"除指定标签外"的所有标签（保留当前标签 + affix 标签）
   * 类比浏览器的"关闭其他标签"功能
   * @param obj 要保留的标签，不传则保留当前路由
   */
  closeOtherPage(obj) {
    return useTagsViewStore().delOthersViews(obj || router.currentRoute.value)
  },

  // ==================== 8. 打开 tab 页签 ====================
  /**
   * 编程式打开一个新标签
   *
   * 使用场景：在 JS 代码里手动打开一个页面（比如点击表格的"查看详情"按钮）
   *
   * @param title 标签上显示的标题（如 "用户详情"）
   * @param url   页面路径（如 "/user/detail"）
   * @param params  URL 参数（query 参数，如 { id: 1 }）
   */
  openPage(title, url, params) {
    // 构造一个 view 对象，meta.title 是标签上显示的文字
    const obj = { path: url, meta: { title: title } }
    // 加入 store 的标签列表
    useTagsViewStore().addView(obj)
    // 路由跳转
    return router.push({ path: url, query: params })
  },

  // ==================== 9. 修改 tab 页签 ====================
  /**
   * 更新某个已存在标签的信息（如修改标题、参数等）
   * 使用场景：列表页点击编辑，编辑页保存后改标签标题为"编辑：xxx"
   * @param obj 要更新的 view 对象（包含新的属性）
   */
  updatePage(obj) {
    return useTagsViewStore().updateVisitedView(obj)
  }
}