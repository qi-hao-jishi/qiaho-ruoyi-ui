/**
 * 通用 JS 方法封装处理。
 *
 * 这个文件可以理解为前端项目里的“工具类”，类似 Java 项目中的 Utils 工具类。
 * 里面的方法大多是无状态的公共函数：传入参数，处理后返回结果。
 *
 * Copyright (c) 2019 ruoyi
 */

/**
 * 日期格式化。
 *
 * 作用：把时间戳、日期字符串、Date 对象转换成指定格式的字符串。
 * 类似 Java 里的 LocalDateTime + DateTimeFormatter。
 *
 * 常见用法：
 * parseTime(new Date())
 * parseTime(1718000000000, '{y}-{m}-{d}')
 * parseTime('2024-06-10T12:30:00.000', '{y}-{m}-{d} {h}:{i}:{s}')
 *
 * 支持的占位符：
 * {y} 年
 * {m} 月
 * {d} 日
 * {h} 时
 * {i} 分
 * {s} 秒
 * {a} 星期
 *
 * @param {Date|string|number} time 需要格式化的时间，可以是 Date、时间戳、日期字符串
 * @param {string} pattern 格式模板，不传默认使用 '{y}-{m}-{d} {h}:{i}:{s}'
 * @returns {string|null} 格式化后的时间字符串；time 为空时返回 null
 */
export function parseTime(time, pattern) {
  // 没有传参数，或者 time 是空值时，直接返回 null。
  if (arguments.length === 0 || !time) {
    return null
  }
  // 如果外部没有传格式模板，就使用默认的年月日时分秒格式。
  const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    // 如果传进来的是 Date 对象，直接使用。
    date = time
  } else {
    if ((typeof time === 'string') && (/^[0-9]+$/.test(time))) {
      // 如果是纯数字字符串，比如 '1718000000000'，先转成数字时间戳。
      time = parseInt(time)
    } else if (typeof time === 'string') {
      // 兼容 Safari 等浏览器对日期字符串解析不一致的问题。
      // 例如把 '2024-06-10T12:30:00.000' 转成 '2024/06/10 12:30:00'。
      time = time.replace(new RegExp(/-/gm), '/').replace('T', ' ').replace(new RegExp(/\.[\d]{3}/gm), '')
    }
    if ((typeof time === 'number') && (time.toString().length === 10)) {
      // 如果是 10 位时间戳，说明单位是秒；JS 的 Date 需要毫秒，所以乘以 1000。
      time = time * 1000
    }
    date = new Date(time)
  }
  // 把 Date 对象拆成各个时间字段，方便后面替换模板占位符。
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  // 使用正则匹配模板里的 {y}、{m}、{d} 等占位符，然后替换成真实值。
  const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
    let value = formatObj[key]
    // getDay() 返回 0 表示星期日，这里转换成中文星期。
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
    // 如果模板里占位符长度大于 0，并且值小于 10，就补 0。
    // 例如 9 月格式化成 09。
    if (result.length > 0 && value < 10) {
      value = '0' + value
    }
    return value || 0
  })
  return time_str
}

/**
 * 表单重置。
 *
 * 这个方法通常配合 Element Plus 的 el-form 使用。
 * refName 对应页面中表单组件的 ref 名称。
 *
 * 类似 Java 后端里根据对象名拿到某个 Bean，然后调用它的 reset 方法。
 *
 * @param {string} refName 表单 ref 名称
 */
export function resetForm(refName) {
  // this.$refs 是 Vue 中用来获取页面组件实例的引用集合。
  // 如果对应 ref 存在，就调用表单组件的 resetFields 方法重置表单字段。
  if (this.$refs[refName]) {
    this.$refs[refName].resetFields()
  }
}

/**
 * 添加日期范围查询参数。
 *
 * 作用：把页面上的日期范围数组，转换成后端常用的 beginTime / endTime 参数。
 * 常用于列表查询接口。
 *
 * 例如：
 * dateRange = ['2024-01-01', '2024-01-31']
 * 转换后：
 * params.params.beginTime = '2024-01-01'
 * params.params.endTime = '2024-01-31'
 *
 * 如果传了 propName，比如 'CreateTime'，则生成：
 * beginCreateTime / endCreateTime。
 *
 * @param {Object} params 查询参数对象
 * @param {Array} dateRange 日期范围数组，通常第 0 项是开始时间，第 1 项是结束时间
 * @param {string} propName 自定义日期字段后缀
 * @returns {Object} 添加日期范围后的查询参数对象
 */
export function addDateRange(params, dateRange, propName) {
  let search = params
  // 确保 search.params 一定是普通对象。
  // 如果原来的 params 不存在、为 null、或者是数组，就初始化成空对象。
  search.params = typeof (search.params) === 'object' && search.params !== null && !Array.isArray(search.params) ? search.params : {}
  // 确保 dateRange 一定是数组，防止后面 dateRange[0] 报错。
  dateRange = Array.isArray(dateRange) ? dateRange : []
  if (typeof (propName) === 'undefined') {
    // 默认字段名：beginTime / endTime。
    search.params['beginTime'] = dateRange[0]
    search.params['endTime'] = dateRange[1]
  } else {
    // 自定义字段名：begin + propName / end + propName。
    search.params['begin' + propName] = dateRange[0]
    search.params['end' + propName] = dateRange[1]
  }
  return search
}

/**
 * 数据字典单值回显。
 *
 * 作用：根据字典 value 找到对应 label，用于页面展示。
 * 类似 Java 里根据枚举 code 获取枚举 name。
 *
 * 例如：
 * datas = [{ label: '正常', value: '0' }, { label: '停用', value: '1' }]
 * value = '0'
 * 返回：'正常'
 *
 * @param {Array|Object} datas 字典数据列表
 * @param {string|number} value 当前字段值
 * @returns {string|number} 匹配成功返回 label，匹配失败返回原 value
 */
export function selectDictLabel(datas, value) {
  // value 为 undefined 时，说明没有值需要回显，返回空字符串。
  if (value === undefined) {
    return ""
  }
  const actions = []
  // 遍历字典集合，找到第一个 value 匹配的字典项。
  Object.keys(datas).some((key) => {
    // 使用 == 是为了兼容数字和字符串，比如 1 和 '1'。
    if (datas[key].value == ('' + value)) {
      actions.push(datas[key].label)
      // some 返回 true 会终止遍历，相当于找到后 break。
      return true
    }
  })
  if (actions.length === 0) {
    // 没找到字典 label 时，直接回显原始值，避免页面空白。
    actions.push(value)
  }
  return actions.join('')
}

/**
 * 数据字典多值回显。
 *
 * 作用：支持字符串或数组形式的多个字典值回显。
 * 常见于多选框、复选框字段。
 *
 * 例如：
 * datas = [{ label: '管理员', value: 'admin' }, { label: '用户', value: 'user' }]
 * value = 'admin,user'
 * 返回：'管理员,用户'
 *
 * @param {Array|Object} datas 字典数据列表
 * @param {string|Array} value 当前字段值，可以是逗号分隔字符串，也可以是数组
 * @param {string} separator 分隔符，不传默认逗号 ','
 * @returns {string} 匹配后的 label 字符串
 */
export function selectDictLabels(datas, value, separator) {
  // value 为空时不需要回显。
  if (value === undefined || value.length ===0) {
    return ""
  }
  if (Array.isArray(value)) {
    // 如果传入的是数组，先转成逗号分隔字符串，统一后续处理流程。
    value = value.join(",")
  }
  const actions = []
  // 如果没有指定分隔符，默认使用逗号。
  const currentSeparator = undefined === separator ? "," : separator
  // 把多值字符串拆成数组。
  const temp = value.split(currentSeparator)
  Object.keys(value.split(currentSeparator)).some((val) => {
    let match = false
    Object.keys(datas).some((key) => {
      // 找到字典 value 对应的 label。
      if (datas[key].value == ('' + temp[val])) {
        actions.push(datas[key].label + currentSeparator)
        match = true
      }
    })
    if (!match) {
      // 字典里没有匹配项时，保留原始值。
      actions.push(temp[val] + currentSeparator)
    }
  })
  // actions 中每个元素后面都拼了分隔符，这里去掉最后一个多余分隔符。
  return actions.join('').substring(0, actions.join('').length - 1)
}

/**
 * 字符串格式化。
 *
 * 作用：用后续参数替换字符串中的 %s 占位符。
 * 类似 Java 里的 String.format("你好 %s", name)。
 *
 * 例如：
 * sprintf('你好，%s', '张三')
 * 期望返回：'你好，张三'
 *
 * @param {string} str 需要格式化的字符串
 * @returns {string} 格式化后的字符串；参数不足时返回空字符串
 */
export function sprintf(str) {
  let flag = true, i = 1
  // 逐个查找 %s，并用调用 sprintf 时传入的后续参数替换。
  str = str.replace(/%s/g, function () {
    const arg = args[i++]
    if (typeof arg === 'undefined') {
      // 如果占位符数量大于参数数量，说明格式化失败。
      flag = false
      return ''
    }
    return arg
  })
  return flag ? str : ''
}

/**
 * 空字符串转换。
 *
 * 作用：把 undefined、null 等无效字符串统一转换成空字符串。
 * 常用于页面展示，避免直接显示 undefined / null。
 *
 * @param {*} str 需要处理的值
 * @returns {*} 如果是空值、'undefined'、'null'，返回空字符串；否则返回原值
 */
export function parseStrEmpty(str) {
  if (!str || str == "undefined" || str == "null") {
    return ""
  }
  return str
}

/**
 * 递归合并对象。
 *
 * 作用：把 target 对象里的属性合并到 source 对象上。
 * 如果某个属性还是对象，会继续向下递归合并。
 *
 * 类似 Java 中把一个配置对象覆盖到另一个配置对象上。
 *
 * @param {Object} source 原始对象，被合并的目标
 * @param {Object} target 新对象，属性会覆盖到 source 上
 * @returns {Object} 合并后的 source 对象
 */
export function mergeRecursive(source, target) {
  for (const p in target) {
    try {
      if (target[p].constructor == Object) {
        // 如果当前属性还是普通对象，就继续递归合并。
        source[p] = mergeRecursive(source[p], target[p])
      } else {
        // 非对象类型直接覆盖。
        source[p] = target[p]
      }
    } catch (e) {
      // 如果 source[p] 不存在或访问异常，直接赋值。
      source[p] = target[p]
    }
  }
  return source
}

/**
 * 构造树型结构数据。
 *
 * 作用：把后端返回的扁平列表转换成树结构。
 * 常用于菜单树、部门树、权限树。
 *
 * 类似 Java 后端里把 List<Menu> 转成 children 嵌套的树。
 *
 * 例如扁平数据：
 * [
 *   { id: 1, parentId: 0, name: '系统管理' },
 *   { id: 2, parentId: 1, name: '用户管理' }
 * ]
 *
 * 转换后：
 * [
 *   {
 *     id: 1,
 *     parentId: 0,
 *     name: '系统管理',
 *     children: [
 *       { id: 2, parentId: 1, name: '用户管理', children: [] }
 *     ]
 *   }
 * ]
 *
 * @param {Array} data 数据源，扁平数组
 * @param {string} id id 字段名，默认 'id'
 * @param {string} parentId 父节点字段名，默认 'parentId'
 * @param {string} children 子节点字段名，默认 'children'
 * @returns {Array} 树形结构数组
 */
export function handleTree(data, id, parentId, children) {
  const config = {
    id: id || 'id',
    parentId: parentId || 'parentId',
    childrenList: children || 'children'
  }

  // childrenListMap 用来建立 id 到节点对象的映射。
  // 类似 Java 里先把 List 转成 Map<Id, Node>，方便后续 O(1) 查父节点。
  const childrenListMap = {}
  const tree = []
  for (const d of data) {
    const id = d[config.id]
    childrenListMap[id] = d
    if (!d[config.childrenList]) {
      // 确保每个节点都有 children 字段，方便页面树组件渲染。
      d[config.childrenList] = []
    }
  }

  for (const d of data) {
    const parentId = d[config.parentId]
    const parentObj = childrenListMap[parentId]
    if (!parentObj) {
      // 找不到父节点，说明当前节点是根节点。
      tree.push(d)
    } else {
      // 找到父节点，就把当前节点放到父节点的 children 里。
      parentObj[config.childrenList].push(d)
    }
  }
  return tree
}

/**
 * 参数处理。
 *
 * 作用：把对象转换成 URL 查询参数字符串。
 * 常用于 GET 请求拼接 query 参数。
 *
 * 类似 Java 后端里把 Map<String, Object> 转成 key=value&key2=value2。
 *
 * 例如：
 * tansParams({ name: '张三', status: 1 })
 * 返回：name=%E5%BC%A0%E4%B8%89&status=1&
 *
 * @param {Object} params 参数对象
 * @returns {string} URL 查询参数字符串
 */
export function tansParams(params) {
  let result = ''
  for (const propName of Object.keys(params)) {
    const value = params[propName]
    const part = encodeURIComponent(propName) + "="
    // 只处理非 null、非空字符串、非 undefined 的参数。
    if (value !== null && value !== "" && typeof (value) !== "undefined") {
      if (typeof value === 'object') {
        // 如果参数值是对象，就展开成 xxx[key]=value 的形式。
        // 例如 params: { beginTime: '2024-01-01' } 会变成 params%5BbeginTime%5D=2024-01-01。
        for (const key of Object.keys(value)) {
          if (value[key] !== null && value[key] !== "" && typeof (value[key]) !== 'undefined') {
            const params = propName + '[' + key + ']'
            const subPart = encodeURIComponent(params) + "="
            result += subPart + encodeURIComponent(value[key]) + "&"
          }
        }
      } else {
        // 普通值直接拼接成 key=value&。
        result += part + encodeURIComponent(value) + "&"
      }
    }
  }
  return result
}

/**
 * 返回标准化项目路径。
 *
 * 作用：把路径中的双斜杠替换成单斜杠，并去掉末尾多余斜杠。
 * 常用于路由路径处理。
 *
 * @param {string} p 原始路径
 * @returns {string} 标准化后的路径
 */
export function getNormalPath(p) {
  if (p.length === 0 || !p || p == 'undefined') {
    return p
  }
  // 把路径中的双斜杠替换成单斜杠。
  let res = p.replace('//', '/')
  if (res[res.length - 1] === '/') {
    // 如果最后一个字符是斜杠，去掉末尾斜杠。
    return res.slice(0, res.length - 1)
  }
  return res
}

/**
 * 验证响应数据是否为 Blob 文件流。
 *
 * 作用：下载文件时，后端可能返回真正的文件流，也可能返回 JSON 错误信息。
 * 这里通过 MIME 类型判断：如果类型不是 application/json，就认为是文件流。
 *
 * @param {Blob} data 接口返回的 Blob 数据
 * @returns {boolean} true 表示是文件流；false 表示可能是 JSON 错误信息
 */
export function blobValidate(data) {
  return data.type !== 'application/json'
}
