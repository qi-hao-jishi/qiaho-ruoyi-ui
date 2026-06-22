/**
* v-copyText 复制文本内容指令
* Copyright (c) 2022 ruoyi
*
* 【作用】给任意元素绑定"点击复制"功能，类似很多网站的"一键复制邀请码"
*
* 【使用示例】
*   <!-- 点击按钮复制 "hello world" 到剪贴板 -->
*   <el-button v-copyText="'hello world'">复制</el-button>
*
*   <!-- 复制成功后触发回调函数（注意 arg 是 callback）-->
*   <el-button v-copyText="'hello'" v-copyText:callback="onCopySuccess">复制并回调</el-button>
*
* 【对比 Java】没有直接对应的概念，但思路类似 Spring AOP 的"动态织入"行为：
*    给原本无关的元素织入"点击事件 + 复制逻辑"
*/
export default {
  /**
   * beforeMount 钩子：元素挂载到 DOM 之前触发
   * 注意这里用 beforeMount 而不是 mounted，因为要在元素显示前就绑定事件，避免错过点击
   *
   * @param el      DOM 元素
   * @param binding 解构出 value（要复制的文本）和 arg（指令参数，如 :callback）
   *
   * ⚠️ 指令参数 arg 的概念：
   *    v-copyText="xxx"            → arg 为 undefined
   *    v-copyText:callback="xxx"   → arg 为 "callback"
   *    冒号后面那个就是 arg，可以让一个指令实现多种功能
   */
  beforeMount(el, { value, arg }) {
    if (arg === "callback") {
      // 如果是 v-copyText:callback 形式，把 value（一个函数）存到元素上，作为复制成功后的回调
      // 类比 Java：把一个 Lambda/方法引用 作为字段存起来，后面调用
      el.$copyCallback = value
    } else {
      // 普通用法：v-copyText="要复制的内容"
      // 把要复制的内容存到元素的自定义属性 $copyValue 上
      // 注意：用 $ 前缀是为了避免和原生 DOM 属性冲突（约定俗成）
      el.$copyValue = value

      // 定义点击处理函数
      const handler = () => {
        // 执行真正的复制操作
        copyTextToClipboard(el.$copyValue)
        // 如果之前注册过 callback，复制成功后调用它（传入被复制的内容）
        if (el.$copyCallback) {
          el.$copyCallback(el.$copyValue)
        }
      }
      // 给元素绑定点击事件
      el.addEventListener("click", handler)

      // ⚠️ 防内存泄漏小细节：保存一个"销毁函数"到元素上
      //    元素从 DOM 中移除时（unmounted 钩子）可以调用它来移除监听
      //    类比 Java 的 close() 方法，避免资源泄漏
      el.$destroyCopy = () => el.removeEventListener("click", handler)
    }
  }
}

/**
 * 核心函数：把字符串复制到剪贴板（兼容老浏览器的写法）
 *
 * 【为什么这么复杂？】
 *  现代浏览器有 navigator.clipboard.writeText() 一行搞定，
 *  但是兼容老浏览器（尤其是 IE、Safari）必须用这种"假装选中文本然后执行 copy 命令"的 hack 方式
 *
 *  类比 Java：就像为了兼容 Java 7 你不能用 List.of()，只能用 Arrays.asList()，一样的兼容性烦恼 😅
 *
 * @param input 要复制的文本内容
 * @param target 临时 textarea 挂载的父节点，默认是 body
 * @returns {boolean} 是否复制成功
 */
function copyTextToClipboard(input, { target = document.body } = {}) {
  // 1. 创建一个隐藏的 textarea 元素，把要复制的文字放进去
  //    （因为只有可编辑元素才能被 select() 选中，div 不行）
  const element = document.createElement('textarea')

  // 2. 记录当前聚焦的元素，复制完后要把焦点还回去（用户体验细节 👍）
  const previouslyFocusedElement = document.activeElement

  element.value = input

  // 3. 移动端防止弹出键盘（readonly 让 textarea 不可编辑）
  element.setAttribute('readonly', '')

  // 4. 把 textarea 移到屏幕外，用户看不见但能选中
  //    contain: strict 是性能优化，告诉浏览器这个元素跟外面无关，不用重排
  element.style.contain = 'strict'
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.fontSize = '12pt' // 防止 iOS 自动缩放

  // 5. 备份当前用户的文本选区（比如用户正选中了一段文字，复制完要恢复）
  const selection = document.getSelection()
  const originalRange = selection.rangeCount > 0 && selection.getRangeAt(0)

  // 6. 把 textarea 挂载到 DOM 上（不挂载没法操作）
  target.append(element)
  // 7. 选中 textarea 里的所有文字
  element.select()

  // 8. iOS 特殊处理：select() 在 iOS 上有 bug，要手动设置选区
  element.selectionStart = 0
  element.selectionEnd = input.length

  // 9. 执行浏览器复制命令（这是关键的一步！）
  let isSuccess = false
  try {
    // document.execCommand('copy') 是老 API，把当前选中的内容复制到剪贴板
    // 已被标记为 deprecated，但现在还能用，未来可能被废弃
    isSuccess = document.execCommand('copy')
  } catch { }

  // 10. 清理工作：把临时 textarea 删掉
  element.remove()

  // 11. 恢复用户原本的选区
  if (originalRange) {
    selection.removeAllRanges()
    selection.addRange(originalRange)
  }

  // 12. 恢复用户原本聚焦的元素
  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus()
  }

  return isSuccess
}
