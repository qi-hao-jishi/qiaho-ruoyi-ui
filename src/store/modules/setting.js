// 使用相对路径替代别名，以便VS Code能够正确识别和跳转
import defaultSettings from '../settings'
import { useDark,useToggle } from '@vueuse-core'
import { useDynamicTitle } from '@/utils/dynamicTitle'
import { handleThemeStyle } from '@/utils/theme'


const useDark = useDark();
const toggleDark = useToggle(isDark);

const { sideTheme, showSettings, navType, tagsView, tagsViewPersist, tagsIcon, tagsViewStyle, fixedHeader, sidebarLogo, dynamicTitle, footerVisible, footerContent } = defaultSettings


// 从 localStorage 中读取保存的布局设置，如果没有则为空对象
const storageSetting = JSON.parse(localStorage.getItem('layout-setting')) || {}


// 定义名为 'settings' 的 Pinia Store
// defineStore 是 Pinia 的核心函数，用于创建一个 Store（状态管理容器）
// 第一个参数 'settings' 是 Store 的唯一标识符（ID）
// 第二个参数是一个配置对象，包含 state（状态）、getters（计算属性）和 actions（方法）
const useSettingsStore = defineStore(
  'settings',
  {
    // 状态定义
    state: () => ({
      // 网页标题
      title: '',
      // 主题色，优先使用本地存储的，没有则使用默认蓝色 '#409EFF'
      theme: storageSetting.theme || '#409EFF',
      // 侧边栏主题
      sideTheme: storageSetting.sideTheme || sideTheme,
      // 是否显示设置面板
      showSettings: showSettings,
      // 导航类型
      navType: storageSetting.navType === undefined ? navType : storageSetting.navType,
      // 是否显示标签页
      tagsView: storageSetting.tagsView === undefined ? tagsView : storageSetting.tagsView,
      // 标签页是否持久化
      tagsViewPersist: storageSetting.tagsViewPersist === undefined ? tagsViewPersist : storageSetting.tagsViewPersist,
      // 是否显示标签页图标
      tagsIcon: storageSetting.tagsIcon === undefined ? tagsIcon : storageSetting.tagsIcon,
      // 标签页样式
      tagsViewStyle: storageSetting.tagsViewStyle === undefined ? tagsViewStyle : storageSetting.tagsViewStyle,
      // 是否固定头部
      fixedHeader: storageSetting.fixedHeader === undefined ? fixedHeader : storageSetting.fixedHeader,
      // 是否显示侧边栏 Logo
      sidebarLogo: storageSetting.sidebarLogo === undefined ? sidebarLogo : storageSetting.sidebarLogo,
      // 是否使用动态标题
      dynamicTitle: storageSetting.dynamicTitle === undefined ? dynamicTitle : storageSetting.dynamicTitle,
      // 是否显示页脚
      footerVisible: storageSetting.footerVisible === undefined ? footerVisible : storageSetting.footerVisible,
      // 页脚内容
      footerContent: footerContent,
      // 是否为暗黑模式
      isDark: isDark.value
    }),
    // 方法定义
    actions: {
      // 修改布局设置
      changeSetting(data) {
        const { key, value } = data
        // 确保 key 存在于 state 中才修改
        if (this.hasOwnProperty(key)) {
          this[key] = value
        }
      },
      // 设置网页标题
      setTitle(title) {
        // 更新 store 中的标题
        this.title = title
        // 调用动态标题函数更新网页标题
        useDynamicTitle()
      },
      // 切换暗黑模式
      toggleTheme() {
        // 切换 isDark 状态
        this.isDark = !this.isDark
        // 调用 VueUse 的切换函数
        toggleDark()
        // DOM 更新后处理主题样式
        nextTick(() => {
          handleThemeStyle(this.theme)
        })
      }
    }
  })

// 导出 useSettingsStore 供其他组件使用
export default useSettingsStore








