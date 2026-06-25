/**
 * ============================================================================
 * SvgIcon 组件 —— 项目自定义 SVG 图标组件
 * ----------------------------------------------------------------------------
 * 【这个组件是干嘛的？】
 *   用于显示 src/assets/icons/svg/ 目录下的自定义 SVG 图标
 *
 * 【Java 类比】
 *   相当于一个通用的图标组件类，封装了 SVG 图标的渲染逻辑
 *
 * 【使用示例】
 *   <svg-icon icon-class="user" />
 *   <svg-icon icon-class="user" className="nav-icon" color="red" />
 * ============================================================================
 */

<!-- ==================== 模板部分：定义组件的 HTML 结构 ==================== -->
<!-- Java 类比：toString() 方法，定义了对象渲染出来的样子 -->
<template>
  <!-- 
    svg 标签：SVG 图标的容器
    :class="svgClass"：动态绑定 class，值来自 setup() 返回的 svgClass
    aria-hidden="true"：无障碍访问属性，表示这个图标只是装饰性的，不需要读屏软件读出来
  -->
  <svg :class="svgClass" aria-hidden="true">
    <!-- 
      use 标签：引用 SVG 雪碧图中的图标
      :xlink:href="iconName"：引用的图标 ID，值来自 setup() 返回的 iconName
      :fill="color"：图标颜色，值来自 props 的 color
    -->
    <use :xlink:href="iconName" :fill="color" />
  </svg>
</template>

<!-- ==================== 脚本部分：定义组件的逻辑和数据 ==================== -->
<!-- Java 类比：类的业务逻辑代码 -->
<script>
// 导入 Vue 3 的 API
import { defineComponent, computed } from 'vue'

// 导出组件（默认导出）
// defineComponent 是 Vue 3 提供的类型提示工具
export default defineComponent({
  /**
   * props：组件的输入参数（父组件给子组件传值）
   * Java 类比：类的构造器参数或 setter 方法
   */
  props: {
    /**
     * 图标名称（必填）
     * 对应 src/assets/icons/svg/ 目录下的文件名（不带 .svg 后缀）
     */
    iconClass: {
      type: String,      // 参数类型：字符串
      required: true     // 必填项
    },
    /**
     * 自定义类名（可选）
     * 给组件额外添加 CSS 类名
     */
    className: {
      type: String,      // 参数类型：字符串
      default: ''        // 默认值：空字符串
    },
    /**
     * 图标颜色（可选）
     * 比如 'red'、'#ff0000'、'rgb(255,0,0)'
     */
    color: {
      type: String,      // 参数类型：字符串
      default: ''        // 默认值：空字符串
    },
  },

  /**
   * setup()：Vue 3 Composition API 的入口函数
   * Java 类比：类的构造器或 main 方法，初始化逻辑在这里
   *
   * @param props 组件的 props 对象
   * @returns 返回一个对象，里面的属性可以在模板中直接使用
   */
  setup(props) {
    // 返回对象，里面的属性会暴露给模板
    return {
      /**
       * iconName：计算属性，根据 iconClass 生成图标的 ID
       * Java 类比：getter 方法
       *
       * 比如 iconClass = 'user'，则 iconName = '#icon-user'
       * 这个 ID 对应 SVG 雪碧图中的图标 ID
       */
      iconName: computed(() => `#icon-${props.iconClass}`),

      /**
       * svgClass：计算属性，根据 className 生成 CSS 类名
       * Java 类比：getter 方法
       *
       * 逻辑：
       *   - 如果有 className，就拼接成 'svg-icon className'
       *   - 如果没有 className，就只用 'svg-icon'
       */
      svgClass: computed(() => {
        if (props.className) {
          return `svg-icon ${props.className}`
        }
        return 'svg-icon'
      })
    }
  }
})
</script>

<!-- ==================== 样式部分：定义组件的 CSS 样式 ==================== -->
<!-- Java 类比：样式配置类 -->
<!-- 
  scoped：表示样式只作用于当前组件，不会污染其他组件
  lang="scss"：表示使用 SCSS 预处理器
-->
<style scoped lang="scss">
/* 子图标和导航图标的通用样式 */
.sub-el-icon,
.nav-icon {
  display: inline-block;   /* 行内块级元素 */
  font-size: 15px;         /* 字体大小 */
  margin-right: 12px;      /* 右边距 */
  position: relative;      /* 相对定位 */
}

/* SVG 图标组件的核心样式 */
.svg-icon {
  width: 1em;              /* 宽度：1 个字体大小 */
  height: 1em;             /* 高度：1 个字体大小 */
  position: relative;      /* 相对定位 */
  fill: currentColor;      /* 填充颜色：继承当前文字颜色 */
  vertical-align: -2px;    /* 垂直对齐：向下偏移 2px，和文字对齐 */
}
</style>
