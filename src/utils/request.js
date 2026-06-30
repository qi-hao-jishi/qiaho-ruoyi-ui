import axios from 'axios'
import { ElNotification , ElMessageBox, ElMessage, ElLoading } from 'element-plus'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { tansParams, blobValidate } from '@/utils/ruoyi'
import cache from '@/plugins/cache'
import { saveAs } from 'file-saver'
import useUserStore from '@/store/modules/user'

// 下载文件时的全屏 loading 实例。
// 放在外层变量里，是为了下载成功或失败后都能调用 close 关闭它。
let downloadLoadingInstance

/**
 * 是否正在显示“重新登录”弹窗。
 *
 * 这里用对象而不是普通 boolean，是为了让多个模块引用到同一个对象地址。
 * 类似 Java 里多个地方持有同一个对象引用，修改对象属性后其他地方也能感知。
 *
 * 主要作用：防止多个接口同时返回 401 时，页面连续弹出多个重新登录确认框。
 */
export let isRelogin = { show: false }

// 设置 axios 全局默认请求头。
// 默认告诉后端：请求体是 JSON 格式，并且字符集是 UTF-8。
axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

/**
 * 创建 axios 实例。
 *
 * 可以把它理解为 Java 后端里的 RestTemplate / WebClient 的统一封装对象。
 * 项目中所有接口请求都尽量走这个 service，这样就能统一处理：
 * - baseURL
 * - 超时时间
 * - token
 * - 错误提示
 * - 登录过期
 * - 防重复提交
 */
const service = axios.create({
  // 请求 URL 的公共前缀。
  // import.meta.env.VITE_APP_BASE_API 来自 Vite 环境变量，例如 /dev-api。
  baseURL: import.meta.env.VITE_APP_BASE_API,
  // 请求超时时间，单位毫秒。这里是 10 秒。
  timeout: 10000
})

/**
 * 请求拦截器。
 *
 * 在请求真正发给后端之前执行。
 * 常见用途：
 * - 给请求头追加 token；
 * - 处理 GET 参数；
 * - 防止重复提交；
 * - 统一加租户 ID、语言标识等公共参数。
 */
service.interceptors.request.use(config => {
  // 是否不需要设置 token。
  // 默认需要 token；如果某个接口 headers.isToken === false，则不携带 token。
  const isToken = (config.headers || {}).isToken === false
  // 是否不需要防重复提交。
  // 默认需要防重复提交；如果 headers.repeatSubmit === false，则跳过该校验。
  const isRepeatSubmit = (config.headers || {}).repeatSubmit === false
  // 重复提交判断间隔，单位毫秒。
  // 两次相同 POST/PUT 请求如果间隔小于这个时间，就认为是重复提交。
  const interval = (config.headers || {}).interval || 1000
  if (getToken() && !isToken) {
    // 如果本地存在 token，并且当前接口没有明确关闭 token，则把 token 放入请求头。
    // 后端通常会从 Authorization 里解析 Bearer token。
    config.headers['Authorization'] = 'Bearer ' + getToken()
  }
  // GET 请求参数处理。
  // axios 默认会把 params 拼到 URL 后面，这里手动转换是为了兼容若依后端的参数格式。
  if (config.method === 'get' && config.params) {
    let url = config.url + '?' + tansParams(config.params)
    // tansParams 返回的字符串最后会多一个 &，这里去掉最后一个字符。
    url = url.slice(0, -1)
    // 已经手动拼接到 url 上，所以清空 params，避免 axios 再处理一遍。
    config.params = {}
    config.url = url
  }
  if (!isRepeatSubmit && (config.method === 'post' || config.method === 'put')) {
    // 组装本次请求的关键信息，用来和上一次请求做对比。
    const requestObj = {
      url: config.url,
      data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
      time: new Date().getTime()
    }
    // 计算请求对象字符串长度，用来粗略判断请求数据大小。
    const requestSize = Object.keys(JSON.stringify(requestObj)).length
    // 防重复提交数据最多只缓存 5M，避免大请求占用过多 sessionStorage。
    const limitSize = 5 * 1024 * 1024
    if (requestSize >= limitSize) {
      console.warn(`[${config.url}]: ` + '请求数据大小超出允许的5M限制，无法进行防重复提交验证。')
      return config
    }
    // 从 sessionStorage 里取出上一次请求信息。
    // sessionStorage 是标签页级别的，所以防重复提交只在当前标签页生效。
    const sessionObj = cache.session.getJSON('sessionObj')
    if (sessionObj === undefined || sessionObj === null || sessionObj === '') {
      // 第一次请求时，缓存当前请求信息。
      cache.session.setJSON('sessionObj', requestObj)
    } else {
      const s_url = sessionObj.url                // 上一次请求地址
      const s_data = sessionObj.data              // 上一次请求数据
      const s_time = sessionObj.time              // 上一次请求时间
      if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
        // 如果请求地址相同、请求数据相同，并且时间间隔小于阈值，就认为是重复提交。
        const message = '数据正在处理，请勿重复提交'
        console.warn(`[${s_url}]: ` + message)
        return Promise.reject(new Error(message))
      } else {
        // 不是重复提交，则更新缓存为本次请求。
        cache.session.setJSON('sessionObj', requestObj)
      }
    }
  }
  return config
}, error => {
    // 请求发送前发生异常时进入这里，例如配置错误。
    console.log(error)
    Promise.reject(error)
})

/**
 * 响应拦截器。
 *
 * 在后端响应回来之后先经过这里，再返回给业务页面。
 * 常见用途：
 * - 统一判断业务状态码；
 * - 统一弹出错误提示；
 * - 登录过期统一跳转；
 * - Blob 文件流直接放行。
 */
service.interceptors.response.use(res => {
    // 若后端没有返回 code，则默认按成功 200 处理。
    const code = res.data.code || 200
    // 根据状态码获取错误提示文案，优先级：errorCode 映射 > 后端 msg > 默认错误信息。
    const msg = errorCode[code] || res.data.msg || errorCode['default']
    // 如果返回的是二进制数据，说明可能是文件下载，直接返回 data，不走普通 JSON 状态码逻辑。
    if (res.request.responseType ===  'blob' || res.request.responseType ===  'arraybuffer') {
      return res.data
    }
    if (code === 401) {
      // 401 表示未登录、token 无效或登录状态过期。
      if (!isRelogin.show) {
        // 标记弹窗已经显示，避免多个接口同时 401 导致重复弹窗。
        isRelogin.show = true
        ElMessageBox.confirm('登录状态已过期，您可以继续留在该页面，或者重新登录', '系统提示', { confirmButtonText: '重新登录', cancelButtonText: '取消', type: 'warning' }).then(() => {
          isRelogin.show = false
          // 调用用户 store 的退出登录逻辑，通常会清除 token、用户信息等。
          useUserStore().logOut().then(() => {
            // 退出后跳转到首页/登录入口。
            location.href = '/index'
          })
      }).catch(() => {
        // 用户点击取消时，恢复弹窗状态。
        isRelogin.show = false
      })
    }
      return Promise.reject('无效的会话，或者会话已过期，请重新登录。')
    } else if (code === 500) {
      // 500：后端业务或系统异常，弹出错误提示。
      ElMessage({ message: msg, type: 'error' })
      return Promise.reject(new Error(msg))
    } else if (code === 601) {
      // 601：若依里常用于业务警告，例如操作受限、参数不符合业务规则。
      ElMessage({ message: msg, type: 'warning' })
      return Promise.reject(new Error(msg))
    } else if (code !== 200) {
      // 其他非成功状态码，统一用通知组件提示。
      ElNotification.error({ title: msg })
      return Promise.reject('error')
    } else {
      // 成功时只把后端响应体 data 返回给业务代码。
      // 这样页面里调用接口时，不需要每次都写 res.data。
      return  Promise.resolve(res.data)
    }
  },
  error => {
    // HTTP 层面的错误会进入这里，例如网络断开、请求超时、HTTP 500 且没有正常业务响应体等。
    console.log('err' + error)
    let { message } = error
    if (message == "Network Error") {
      message = "后端接口连接异常"
    } else if (message.includes("timeout")) {
      message = "系统接口请求超时"
    } else if (message.includes("Request failed with status code")) {
      message = "系统接口" + message.slice(-3) + "异常"
    }
    ElMessage({ message: message, type: 'error', duration: 5 * 1000 })
    return Promise.reject(error)
  }
)

/**
 * 通用下载方法。
 *
 * 作用：统一处理文件下载请求。
 * 下载接口通常返回 Blob 文件流，前端再通过 file-saver 保存到本地。
 *
 * 流程：
 * 1. 打开下载 loading；
 * 2. 发送 POST 请求，参数按表单格式传给后端；
 * 3. 判断响应是不是 Blob 文件；
 * 4. 是文件就保存；
 * 5. 不是文件就按 JSON 错误信息解析并提示；
 * 6. 最后关闭 loading。
 *
 * @param {string} url 下载接口地址
 * @param {Object} params 下载参数
 * @param {string} filename 保存到本地的文件名
 * @param {Object} config 额外 axios 配置，会覆盖默认下载配置
 * @returns {Promise<void>} 下载处理 Promise
 */
export function download(url, params, filename, config) {
  // 打开全屏 loading，提示用户正在下载。
  downloadLoadingInstance = ElLoading.service({ text: "正在下载数据，请稍候", background: "rgba(0, 0, 0, 0.7)", })
  return service.post(url, params, {
    // 把参数对象转换成 application/x-www-form-urlencoded 格式。
    transformRequest: [(params) => { return tansParams(params) }],
    // 下载接口一般使用表单格式提交参数。
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    // 告诉 axios 按 Blob 二进制文件接收响应。
    responseType: 'blob',
    // 允许调用方传入额外配置，比如自定义 headers。
    ...config
  }).then(async (data) => {
    // 判断返回内容是否是真正的文件流。
    const isBlob = blobValidate(data)
    if (isBlob) {
      // 是文件流：创建 Blob 对象并保存到本地。
      const blob = new Blob([data])
      saveAs(blob, filename)
    } else {
      // 不是文件流：说明后端可能返回了 JSON 格式的错误信息。
      const resText = await data.text()
      const rspObj = JSON.parse(resText)
      const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default']
      ElMessage.error(errMsg)
    }
    downloadLoadingInstance.close()
  }).catch((r) => {
    // 下载过程出现异常时，提示用户联系管理员。
    console.error(r)
    ElMessage.error('下载文件出现错误，请联系管理员！')
    downloadLoadingInstance.close()
  })
}

// 导出封装好的 axios 实例，业务接口文件统一使用它发送请求。
export default service
