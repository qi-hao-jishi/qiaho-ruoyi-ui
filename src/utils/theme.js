/**
 * ============================================================================
 * 主题样式工具类 (theme.js)
 * ----------------------------------------------------------------------------
 * 作用：动态切换 Element Plus 的主题色（包括 9 档变浅 + 9 档变深的衍生色）
 *
 * Java 类比：
 *   就像 Spring Boot 里的一个 ThemeUtils 工具类，
 *   只不过它操作的不是数据库，而是浏览器里的 CSS 变量（CSS Variables）。
 *
 * 工作原理一句话：
 *   把用户选择的主题色（如 #409EFF）写到 <html> 标签的 style 上，
 *   Element Plus 的所有组件都通过 var(--el-color-primary) 引用这个变量，
 *   所以一改全应用立刻变色！这就是「CSS 变量级换肤」。
 * ============================================================================
 */


/**
 * 【对外主入口】处理并应用主题样式
 *
 * @param {string} theme 用户选择的主题色，十六进制格式，例如 '#409EFF'
 *
 * 流程拆解：
 *   1. 判断当前是不是「暗黑模式」（看 <html> 上有没有 .dark 这个 class）
 *   2. 如果是暗黑模式，把主题色"柔化"一下（避免在黑底上太刺眼）
 *   3. 把最终主题色写到 CSS 变量 --el-color-primary
 *   4. 再生成 9 档「浅色」 和 9 档「深色」的衍生色，写到对应的 CSS 变量
 *      - --el-color-primary-light-1 ~ --el-color-primary-light-9（越来越浅）
 *      - --el-color-primary-dark-1  ~ --el-color-primary-dark-9 （越来越深）
 *
 * 为什么要生成这 18 档衍生色？
 *   Element Plus 的按钮、Tag、Alert 等组件的 hover、disabled、border 状态
 *   都用了这些衍生色（光是 button hover 就用了 light-3），
 *   所以必须一次性把它们全算出来覆盖掉，主题才会"全身换色"成功。
 */
export function handleThemeStyle(theme) {
  // ========== 第 1 步：检测是否为暗黑模式 ==========
  // typeof document !== 'undefined' 是「服务端渲染（SSR）保护」
  //   - 浏览器里有 document，typeof 返回 'object'
  //   - Node.js 里没有 document，typeof 返回 'undefined'
  // Java 类比：相当于在调用前先判断 if (request != null)，避免 NPE
  //
  // document.documentElement 就是 <html> 这个根标签
  // classList.contains('dark') 判断 <html> 上有没有 dark 这个 class
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  // ========== 第 2 步：暗黑模式下柔化主题色 ==========
  // 比如 #409EFF 这种亮蓝色，在纯黑背景上会很扎眼，
  // 所以混入一点深灰色，让它"暗"下来，看起来更柔和。
  // 三元表达式：isDark ? A : B  → 等同于 Java 的 isDark ? A : B
  const primary = isDark ? softenPrimaryForDark(theme) : theme

  // ========== 第 3 步：把主题色写入 CSS 变量 ==========
  // document.documentElement.style.setProperty 等同于在 <html> 上加 style="--xxx: yyy"
  // CSS 变量的好处：所有 CSS 里 var(--el-color-primary) 引用它的地方都会立刻变色
  //
  // Java 类比：相当于改了一个全局配置，所有 @Value("${el.color.primary}") 注入的地方都跟着变
  document.documentElement.style.setProperty('--el-color-primary', primary)

  // ========== 第 4 步：生成 9 档浅色衍生色 ==========
  // i = 1..9，对应混入白色的比例 0.1, 0.2, ... 0.9
  // i 越大 → 越浅（越接近白色）
  // 反引号 `` 是 ES6 模板字符串，相当于 Java 的 String.format()
  //   `--el-color-primary-light-${i}` → '--el-color-primary-light-3'
  for (let i = 1; i <= 9; i++) {
    document.documentElement.style.setProperty(
      `--el-color-primary-light-${i}`,
      `${getLightColor(primary, i / 10)}`
    )
  }

  // ========== 第 5 步：生成 9 档深色衍生色 ==========
  // i = 1..9，对应混入黑色的比例 0.1, 0.2, ... 0.9
  // i 越大 → 越深（越接近黑色）
  for (let i = 1; i <= 9; i++) {
    document.documentElement.style.setProperty(
      `--el-color-primary-dark-${i}`,
      `${getDarkColor(primary, i / 10)}`
    )
  }
}


/**
 * 【工具函数】混合两种十六进制颜色
 *
 * @param {string} fg 前景色（要混入的颜色），如 '#409EFF'
 * @param {string} bg 背景色（被混入的颜色），如 '#2d3036'
 * @param {number} t  混合比例 0~1
 *                    t=0 → 完全是 fg
 *                    t=1 → 完全是 bg
 *                    t=0.5 → 各占一半
 * @returns {string} 混合后的十六进制颜色
 *
 * 数学原理：线性插值（Linear Interpolation, lerp）
 *   公式：result = fg * (1 - t) + bg * t
 *   分别对 R、G、B 三个通道单独计算，再合并回去
 *
 * Java 类比：
 *   就像两瓶颜料按比例混合，t 是 bg 颜料的占比
 */
export function mixHexColors(fg, bg, t) {
  // String(fg) 是防御性转换：万一传进来的不是字符串（比如数字），先转成字符串
  // .replace('#', '') 把开头的 # 去掉，方便后面解析
  const a = hexToRgb(String(fg).replace('#', ''))  // a = [r, g, b]
  const b = hexToRgb(String(bg).replace('#', ''))  // b = [r, g, b]

  // [0, 1, 2].map(...) 是 JS 数组的"映射"操作
  // 等同于 Java Stream：Arrays.stream(new int[]{0,1,2}).map(i -> ...).toArray()
  // 这里对 R(下标0)、G(下标1)、B(下标2) 三个通道分别做线性插值
  // Math.round() 四舍五入取整（颜色通道必须是 0-255 的整数）
  const out = [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t))

  // 把三个通道的整数值合并成 #RRGGBB 格式
  return rgbToHex(out[0], out[1], out[2])
}


/**
 * 【工具函数】暗黑模式下柔化主题色
 *
 * @param {string} theme 原始主题色，如 '#409EFF'
 * @returns {string} 柔化后的颜色
 *
 * 实现：把主题色和深灰色 #2d3036 按 66:34 比例混合
 *   - 0.34 表示混入 34% 的深灰
 *   - 这样亮色会被压暗，但还能看出原来的色调
 *
 * 为什么是 0.34？这是经验值，开发者调出来视觉最舒服的比例。
 */
export function softenPrimaryForDark(theme) {
  return mixHexColors(theme, '#2d3036', 0.34)
}


/**
 * 【工具函数】十六进制颜色 → RGB 数组
 *
 * @param {string} str 十六进制颜色字符串，如 '409EFF' 或 '#409EFF'
 * @returns {number[]} [r, g, b] 三个 0-255 的整数
 *
 * 例子：
 *   hexToRgb('409EFF') → [64, 158, 255]
 *
 * 解析过程：
 *   '409EFF' → 拆成 ['40', '9E', 'FF'] → 每两位按 16 进制解析 → [64, 158, 255]
 */
export function hexToRgb(str) {
  // 先去掉可能存在的 # 号，做容错
  str = str.replace('#', '')

  // 正则 /../g 表示"每两个字符切一刀"
  //   match() 返回匹配到的数组：['40', '9E', 'FF']
  // Java 类比：相当于 String.split() 但更精准
  let hexs = str.match(/../g)

  // 把每个两位的十六进制字符串转成十进制整数
  // parseInt(str, 16) 第二个参数是进制，16 表示按 16 进制解析
  // Java 类比：Integer.parseInt(hexs[i], 16)
  for (let i = 0; i < 3; i++) {
    hexs[i] = parseInt(hexs[i], 16)
  }
  return hexs
}


/**
 * 【工具函数】RGB 三个值 → 十六进制颜色字符串
 *
 * @param {number} r 红色通道 0-255
 * @param {number} g 绿色通道 0-255
 * @param {number} b 蓝色通道 0-255
 * @returns {string} 十六进制颜色，如 '#409EFF'
 *
 * 例子：
 *   rgbToHex(64, 158, 255) → '#409EFF'
 */
export function rgbToHex(r, g, b) {
  // toString(16) 把十进制转成十六进制字符串
  // Java 类比：Integer.toHexString(r)
  let hexs = [r.toString(16), g.toString(16), b.toString(16)]

  // 关键补零：比如数字 5 转 16 进制是 '5'（一位），需要补成 '05'（两位）
  // 否则拼出来 '#5...' 解析就错了，必须保证每个通道都是两位
  for (let i = 0; i < 3; i++) {
    if (hexs[i].length == 1) {
      hexs[i] = `0${hexs[i]}`
    }
  }

  // join('') 把数组拼成字符串，无分隔符
  // Java 类比：String.join("", hexs)
  return `#${hexs.join('')}`
}


/**
 * 【工具函数】把颜色"变浅"（向白色靠拢）
 *
 * @param {string} color 原始十六进制颜色，如 '#409EFF'
 * @param {number} level 变浅程度 0~1，越大越浅
 *                       0   → 完全不变
 *                       1   → 完全变成白色
 *                       0.5 → 与白色各占一半
 * @returns {string} 变浅后的十六进制颜色
 *
 * 算法：每个通道向 255（白色最大值）靠拢
 *   公式：new = (255 - old) * level + old
 *   理解：
 *     - (255 - old) 是离白色的距离
 *     - 乘以 level 取这段距离的一部分
 *     - 加回 old → 得到向白色移动后的新值
 */
export function getLightColor(color, level) {
  let rgb = hexToRgb(color)
  for (let i = 0; i < 3; i++) {
    // Math.floor() 向下取整（向白色靠拢但不会越过白色边界）
    rgb[i] = Math.floor((255 - rgb[i]) * level + rgb[i])
  }
  return rgbToHex(rgb[0], rgb[1], rgb[2])
}


/**
 * 【工具函数】把颜色"变深"（向黑色靠拢）
 *
 * @param {string} color 原始十六进制颜色，如 '#409EFF'
 * @param {number} level 变深程度 0~1，越大越深
 *                       0   → 完全不变
 *                       1   → 完全变成黑色
 *                       0.5 → 各通道值减半
 * @returns {string} 变深后的十六进制颜色
 *
 * 算法：每个通道按比例衰减（向 0 靠拢）
 *   公式：new = old * (1 - level)
 *   理解：
 *     - level 是"被吃掉"的比例
 *     - (1 - level) 是"剩下"的比例
 *     - 比如 level=0.3 → 每个通道只剩 70%
 */
export function getDarkColor(color, level) {
  let rgb = hexToRgb(color)
  for (let i = 0; i < 3; i++) {
    rgb[i] = Math.floor(rgb[i] * (1 - level))
  }
  return rgbToHex(rgb[0], rgb[1], rgb[2])
}
