// ==================== 标签页（TagsView）状态管理 Store ====================
//
// 【这个文件是干嘛的？】
//   这是若依后台系统"顶部标签页"的"数据层"。
//   它管理着三个核心数组：
//     1. visitedViews —— 用户已打开的标签列表（显示在顶栏）
//     2. cachedViews  —— 需要被 <keep-alive> 缓存起来的组件名列表
//     3. iframeViews  —— 嵌入 iframe 的外部页面标签列表

//
// 【与 tab.js 的关系（重要 ⭐）】
//   plugins/tab.js 是"服务层/API层"（Controller），
//   而这个文件是"数据层"（Repository/DAO）。
//   tab.js 里的每个方法（closePage / refreshPage 等）最终都调用了这个 store 的方法。
//
//   类比 Java 分层：
//     plugins/tab.js       → @Service  （业务逻辑层，对外提供 API）
//     store/tagsView.js    → @Repository（数据访问层，直接操作 state）
//
// 【核心数据流】
//   用户点击侧边栏菜单
//       ↓
//   触发路由跳转 → 路由守卫（permission.js）捕获
//       ↓
//   调用 addView() → 加入 visitedViews + cachedViews
//       ↓
//   标签栏渲染出新的标签
//       ↓
//   用户点击 ✕ → 调用 delView() → 从两个数组中移除

// 引入缓存工具（用于持久化标签状态到 localStorage）
import cache from '@/plugins/cache'

// 引入设置 Store（判断是否启用了标签持久化功能）
import useSettingsStore from '@/store/modules/settings'

// ==================== 持久化相关常量与函数 ====================
// 持久化的目的：刷新浏览器后，之前打开的标签还能恢复回来
// 类比 Java：把 Session 中的数据持久化到数据库，重启恢复

// localStorage 中存储标签数据的 key 名称
const PERSIST_KEY = 'tags-view-visited'

/**
 * 判断是否启用了标签持久化
 * 去 settings store 中读取 tagsViewPersist 配置项
 * 用户在"系统设置 → 标签页设置"中可以开关
 */
function isPersistEnabled() {
  return useSettingsStore().tagsViewPersist
}

/**
 * 保存标签列表到 localStorage
 *
 * @param views 要保存的 visitedViews 数组
 *
 * 处理逻辑：
 *   1. 先判断是否开启了持久化，没开就不存
 *   2. 过滤掉 affix: true 的标签（首页等固定标签，不需要保存，每次自动生成）
 *   3. 只保留必要字段（path / fullPath / name / title / query / meta）
 *      不保存完整对象（避免存了多余的东西占用空间）
 */
function saveVisitedViews(views) {
  if (!isPersistEnabled()) return
  const toSave = views.filter(v => !(v.meta && v.meta.affix)).map(v => ({
    path: v.path, fullPath: v.fullPath, name: v.name,
    title: v.title, query: v.query, meta: v.meta
  }))
  cache.local.setJSON(PERSIST_KEY, toSave)
}

/**
 * 从 localStorage 读取之前持久化的标签列表
 * 页面刷新时调用，恢复用户上次关闭前的标签
 */
function loadVisitedViews() {
  return cache.local.getJSON(PERSIST_KEY) || []
}

/**
 * 清空持久化的标签数据（通常在退出登录或关闭所有标签时调用）
 */
function clearVisitedViews() {
  cache.local.remove(PERSIST_KEY)
}

/**
 * 定义 tagsView Store
 *
 * defineStore('tags-view', {...}) 类比 Java：
 *   @Repository
 *   public class TagsViewRepository { ... }
 *
 * 它的 state 就是"数据库表"，actions 就是"CRUD 方法"
 */
const useTagsViewStore = defineStore(
  'tags-view',
  {
    // ==================== State（数据表）====================
    state: () => ({

      // 【已访问标签列表】—— 显示在顶栏的标签
      // 每个元素的结构：{ path, fullPath, name, title, meta, query, ... }
      // 类比 Java 的 List<TabVO> visitedViews
      visitedViews: [],

      // 【缓存组件名列表】—— 被 <keep-alive> 缓存起来的组件
      // 里面存的是组件的 name（路由配置里的 name 字段）
      // 只存 name（字符串）不是对象
      // 类比 Java：Set<String> cachedComponentNames
      // <keep-alive :include="cachedViews"> 会根据这个数组决定缓存哪些组件
      // ⚠️ 如果 name 不在这个数组里，组件每次访问都会重新创建（不缓存）
      cachedViews: [],

      // 【iframe 标签列表】—— 内嵌外部网页的标签
      // 若依支持在菜单里配置"外链"（如嵌入百度、其他管理后台页面）
      // 这些页面通过 <iframe> 展示，单独管理
      iframeViews: []
    }),

    // ==================== Actions（CRUD 方法）====================
    actions: {

      // ==================== 1. 添加标签（访存 + 缓存）====================
      /**
       * 添加一个标签（同时添加到 visitedViews 和 cachedViews）
       *
       * 调用时机：路由守卫在每次跳转到新页面时调用
       * 作用：在标签栏新增一个标签
       *
       * @param view 路由对象（包含 path, name, meta.title 等）
       */
      addView(view) {
        this.addVisitedView(view)  // 加入标签栏显示
        this.addCachedView(view)   // 加入 keep-alive 缓存
      },

      // ==================== 2. 添加 iframe 标签 ====================
      /**
       * 添加一个 iframe 页面标签
       * 用于"外链菜单"（比如菜单配置了外部网址）
       *
       * ⚠️ 防重复：用 some() 判断 path 是否已经存在，存在就不加了
       */
      addIframeView(view) {
        if (this.iframeViews.some(v => v.path === view.path)) return
        this.iframeViews.push(
          Object.assign({}, view, {
            title: view.meta.title || 'no-name'
          })
        )
      },

      // ==================== 3. 添加到标签栏 ====================
      /**
       * 添加到 visitedViews（标签栏显示）
       *
       * ⚠️ some() 防重复：如果 path 已经存在，不重复添加
       *   some() 类比 Java 的 stream().anyMatch()
       *   if (list.stream().anyMatch(v -> v.path.equals(view.path))) return;
       *
       * Object.assign({}, view, { title }) 是"浅拷贝 + 合并"
       *   类比 Java 的 BeanUtils.copyProperties() + 额外设置 title
       *
       * 添加后调用 saveVisitedViews() 持久化到 localStorage
       */
      addVisitedView(view) {
        if (this.visitedViews.some(v => v.path === view.path)) return
        this.visitedViews.push(
          Object.assign({}, view, {
            title: view.meta.title || 'no-name'
          })
        )
        saveVisitedViews(this.visitedViews)
      },

      // ==================== 4. 添加固定标签（affix 标签）====================
      /**
       * 将 affix 标签插入到标签栏最前面
       *
       * affix 标签：meta 里设置了 affix: true 的标签（如首页），
       * 特点是"固定在左侧，无法被关闭"
       *
       * ⚠️ unshift() 是数组头部插入，类比 Java 的 list.add(0, element)
       * 这和普通标签的 push()（尾部追加）不同，affix 标签永远在最前面
       */
      addAffixView(view) {
        if (this.visitedViews.some(v => v.path === view.path)) return
        this.visitedViews.unshift(
          Object.assign({}, view, {
            title: view.meta.title || 'no-name'
          })
        )
      },

      // ==================== 5. 添加到缓存列表 ====================
      /**
       * 将组件 name 加入 cachedViews（keep-alive 缓存）
       *
       * ⚠️ 条件判断：
       *   1. 如果 name 已存在 → 不重复添加（includes() 检查）
       *   2. 如果 view.meta.noCache 为 true → 跳过（用户明确设置不缓存）
       *   3. 否则 → 添加 name
       *
       * 类比 Java：if (!set.contains(name)) { if (!noCache) set.add(name); }
       */
      addCachedView(view) {
        if (this.cachedViews.includes(view.name)) return
        if (!view.meta.noCache) {
          this.cachedViews.push(view.name)
        }
      },

      // ==================== 6. 删除标签 ====================
      /**
       * 删除一个标签（从标签栏 + 缓存中同时移除）
       *
       * 返回 Promise，resolve 时带出删除后的剩余数据
       * 让调用方（tab.js 的 closePage）可以拿到剩余标签做跳转
       *
       * @returns {{ visitedViews, cachedViews }}
       */
      delView(view) {
        return new Promise(resolve => {
          this.delVisitedView(view)  // 从标签栏移除
          this.delCachedView(view)   // 从缓存中移除
          resolve({
            visitedViews: [...this.visitedViews],  // 展开运算符拷贝新数组
            cachedViews: [...this.cachedViews]     // 防止外部修改原始数据
          })
        })
      },

      // ==================== 7. 从标签栏移除 ====================
      /**
       * 从 visitedViews 中移除指定标签
       *
       * ⚠️ 遍历 + splice 删除：
       *   for...of 遍历，找到 path 匹配的，用 splice(i, 1) 删除
       *   类比 Java：list.removeIf(v -> v.path.equals(view.path))
       *
       * 同时从 iframeViews 中过滤掉该路径（如果它也是 iframe 页面）
       * 保存到 localStorage
       */
      delVisitedView(view) {
        return new Promise(resolve => {
          // entries() 返回可迭代的 [index, value] 对
          for (const [i, v] of this.visitedViews.entries()) {
            if (v.path === view.path) {
              this.visitedViews.splice(i, 1)  // 从第 i 个删 1 个
              break  // 找到就退出循环，避免重复删除
            }
          }
          // 也清理 iframeViews 中的同路径项
          this.iframeViews = this.iframeViews.filter(item => item.path !== view.path)
          saveVisitedViews(this.visitedViews)
          resolve([...this.visitedViews])
        })
      },

      // ==================== 8. 从 iframe 列表移除 ====================
      delIframeView(view) {
        return new Promise(resolve => {
          this.iframeViews = this.iframeViews.filter(item => item.path !== view.path)
          resolve([...this.iframeViews])
        })
      },

      // ==================== 9. 从缓存中移除 ====================
      /**
       * 从 cachedViews 中移除指定组件的 name
       *
       * 作用：清除 keep-alive 缓存，下次进入该组件时会重新创建
       * 这就是"刷新页面"时 tab.js 调用的第一步
       *
       * ⚠️ indexOf + splice 写法：
       *   index > -1 && this.cachedViews.splice(index, 1)
       *   这是 JS 的短路求值：只有 index 存在时才执行 splice
       *   类比 Java：if (index > -1) { list.remove(index); }
       */
      delCachedView(view) {
        return new Promise(resolve => {
          const index = this.cachedViews.indexOf(view.name)
          index > -1 && this.cachedViews.splice(index, 1)
          resolve([...this.cachedViews])
        })
      },

      // ==================== 10. 关闭其他标签 ====================
      /**
       * 保留指定标签，关闭其他所有非 affix 标签
       * 对应右键菜单的"关闭其他"
       */
      delOthersViews(view) {
        return new Promise(resolve => {
          this.delOthersVisitedViews(view)
          this.delOthersCachedViews(view)
          resolve({
            visitedViews: [...this.visitedViews],
            cachedViews: [...this.cachedViews]
          })
        })
      },

      /**
       * 保留下两个类别的标签：
       *   1. meta.affix 为 true 的（固定标签）
       *   2. path 与指定 view 相同的（要保留的那个）
       * 其他全删
       */
      delOthersVisitedViews(view) {
        return new Promise(resolve => {
          this.visitedViews = this.visitedViews.filter(v => {
            return v.meta.affix || v.path === view.path
          })
          // iframe 也只保留匹配的那个
          this.iframeViews = this.iframeViews.filter(item => item.path === view.path)
          saveVisitedViews(this.visitedViews)
          resolve([...this.visitedViews])
        })
      },

      /**
       * 保留指定 view 的缓存，其他全清
       *
       * ⚠️ slice(index, index + 1)：
       *   把 cachedViews 截取成只有 view.name 的那一项
       *   如果 view.name 不存在（index = -1），就清空整个数组
       */
      delOthersCachedViews(view) {
        return new Promise(resolve => {
          const index = this.cachedViews.indexOf(view.name)
          if (index > -1) {
            this.cachedViews = this.cachedViews.slice(index, index + 1)
          } else {
            this.cachedViews = []
          }
          resolve([...this.cachedViews])
        })
      },

      // ==================== 11. 关闭所有标签 ====================
      /**
       * 关闭所有标签（保留 affix 固定标签）
       * 对应右键菜单的"关闭全部"
       */
      delAllViews(view) {
        return new Promise(resolve => {
          this.delAllVisitedViews(view)
          this.delAllCachedViews(view)
          resolve({
            visitedViews: [...this.visitedViews],
            cachedViews: [...this.cachedViews]
          })
        })
      },

      /**
       * 只保留 affix 标签（固定标签不能被关闭）
       * 清空 iframeViews
       * 清空 localStorage 中的持久化数据
       */
      delAllVisitedViews(view) {
        return new Promise(resolve => {
          const affixTags = this.visitedViews.filter(tag => tag.meta.affix)
          this.visitedViews = affixTags
          this.iframeViews = []
          clearVisitedViews()
          resolve([...this.visitedViews])
        })
      },

      /**
       * 清空所有缓存
       * 相当于"重置 keep-alive"，所有页面下次都会重新创建
       */
      delAllCachedViews(view) {
        return new Promise(resolve => {
          this.cachedViews = []
          resolve([...this.cachedViews])
        })
      },

      // ==================== 12. 更新标签信息 ====================
      /**
       * 更新 visitedViews 中某个标签的信息
       * 使用场景：比如编辑页面保存后，把标签标题从"新增用户"改为"编辑用户"
       *
       * ⚠️ Object.assign(v, view) 是"合并到原对象"（修改原数组中的对象）
       *   不是替换！原引用不变，所以 Vue 的响应式能检测到变化
       */
      updateVisitedView(view) {
        for (let v of this.visitedViews) {
          if (v.path === view.path) {
            v = Object.assign(v, view)  // 把 view 的属性合并到 v 上
            break
          }
        }
      },

      // ==================== 13. 关闭右侧标签 ====================
      /**
       * 关闭指定标签右侧的所有标签
       * 对应右键菜单的"关闭右侧"
       *
       * 复杂逻辑 ⚠️：
       *   1. findIndex() 找到参照标签的位置
       *   2. filter() 遍历，保留：索引 <= 参照位置 或 affix 标签
       *   3. 删除标签时同时清理 cachedViews 和 iframeViews
       */
      delRightTags(view) {
        return new Promise(resolve => {
          // findIndex 获取索引，类比 Java 的 IntStream 找元素下标
          const index = this.visitedViews.findIndex(v => v.path === view.path)
          if (index === -1) return

          // ⚠️ filter() 里的回调函数可以执行"副作用"（清理缓存）
          this.visitedViews = this.visitedViews.filter((item, idx) => {
            // 参照标签本身 + affix 标签 → 保留
            if (idx <= index || (item.meta && item.meta.affix)) {
              return true
            }
            // 要删除的标签 → 同时清理缓存
            const i = this.cachedViews.indexOf(item.name)
            if (i > -1) {
              this.cachedViews.splice(i, 1)
            }
            if(item.meta.link) {  // 如果是外链类型，还要从 iframe 列表删除
              const fi = this.iframeViews.findIndex(v => v.path === item.path)
              this.iframeViews.splice(fi, 1)
            }
            return false  // filter 返回 false → 不保留此项
          })
          saveVisitedViews(this.visitedViews)
          resolve([...this.visitedViews])
        })
      },

      // ==================== 14. 关闭左侧标签 ====================
      /**
       * 关闭指定标签左侧的所有标签
       * 对应右键菜单的"关闭左侧"
       *
       * 逻辑与 delRightTags 对称，只改条件 idx >= index
       */
      delLeftTags(view) {
        return new Promise(resolve => {
          const index = this.visitedViews.findIndex(v => v.path === view.path)
          if (index === -1) return

          this.visitedViews = this.visitedViews.filter((item, idx) => {
            // 参照标签本身 + 右侧标签 + affix 标签 → 保留
            if (idx >= index || (item.meta && item.meta.affix)) {
              return true
            }
            // 左侧要删的 → 清理缓存
            const i = this.cachedViews.indexOf(item.name)
            if (i > -1) {
              this.cachedViews.splice(i, 1)
            }
            if(item.meta.link) {
              const fi = this.iframeViews.findIndex(v => v.path === item.path)
              this.iframeViews.splice(fi, 1)
            }
            return false
          })
          saveVisitedViews(this.visitedViews)
          resolve([...this.visitedViews])
        })
      },

      // ==================== 15. 恢复持久化的标签 ====================
      /**
       * 从 localStorage 读取之前保存的标签数据，重新添加到标签栏
       *
       * 调用时机：页面初始化时（layout 组件创建时）
       * 效果：刷新后用户之前打开的标签都恢复显示
       *
       * ⚠️ 注意：只是恢复 visitedViews，cachedViews 不恢复（因为刷新后缓存自然丢失了）
       *   keep-alive 的缓存是内存级的，刷新页面就没了
       */
      loadPersistedViews() {
        const views = loadVisitedViews()  // 读取持久化的数据
        views.forEach(view => {
          this.addVisitedView(view)       // 逐个添加到标签栏
        })
      }
    }
  })

export default useTagsViewStore