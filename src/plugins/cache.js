/**
 * sessionStorage 会话级缓存封装。
 *
 * sessionStorage 的生命周期类似 Java Web 里的 HttpSession：
 * - 同一个浏览器标签页内有效；
 * - 标签页关闭后数据会被浏览器清理；
 * - 适合存放“本次会话临时需要”的数据。
 */
const sessionCache = {
  /**
   * 存储普通字符串值。
   *
   * @param {string} key 缓存键，类似 Map 的 key
   * @param {string} value 缓存值，sessionStorage 原生只支持字符串
   */
  set (key, value) {
    // 浏览器不支持 sessionStorage 时直接退出，避免后续调用报错。
    if (!sessionStorage) {
      return
    }
    // key 和 value 都不为空时才写入，避免存入无意义的数据。
    if (key != null && value != null) {
      sessionStorage.setItem(key, value)
    }
  },
  /**
   * 根据 key 获取字符串缓存。
   *
   * @param {string} key 缓存键
   * @returns {string|null} 命中返回字符串，未命中或 key 为空返回 null
   */
  get (key) {
    // 浏览器不支持 sessionStorage 时返回 null，表示没有可用缓存。
    if (!sessionStorage) {
      return null
    }
    // key 为空没有查询意义，直接返回 null。
    if (key == null) {
      return null
    }
    return sessionStorage.getItem(key)
  },
  /**
   * 存储对象或数组等 JSON 数据。
   *
   * 浏览器缓存只能保存字符串，所以这里会先调用 JSON.stringify 序列化。
   * 类似 Java 中把对象转成 JSON 字符串后再放入 Redis。
   *
   * @param {string} key 缓存键
   * @param {Object|Array|number|boolean|string} jsonValue 需要缓存的数据
   */
  setJSON (key, jsonValue) {
    if (jsonValue != null) {
      this.set(key, JSON.stringify(jsonValue))
    }
  },
  /**
   * 获取 JSON 缓存并反序列化。
   *
   * @param {string} key 缓存键
   * @returns {*} 有值时返回 JSON.parse 后的数据，无值返回 null
   */
  getJSON (key) {
    const value = this.get(key)
    if (value != null) {
      return JSON.parse(value)
    }
    return null
  },
  /**
   * 删除指定 key 的会话缓存。
   *
   * @param {string} key 缓存键
   */
  remove (key) {
    sessionStorage.removeItem(key)
  }
}

/**
 * localStorage 本地持久化缓存封装。
 *
 * localStorage 的生命周期类似把数据保存到本地文件：
 * - 关闭浏览器后仍然存在；
 * - 需要手动 remove 或 clear，或者用户清理浏览器数据才会删除；
 * - 适合存放登录 token、用户偏好、页面状态等需要持久化的数据。
 */
const localCache = {
  /**
   * 存储普通字符串值。
   *
   * @param {string} key 缓存键
   * @param {string} value 缓存值，localStorage 原生只支持字符串
   */
  set (key, value) {
    // 浏览器不支持 localStorage 时直接退出。
    if (!localStorage) {
      return
    }
    // key 和 value 都不为空时才写入。
    if (key != null && value != null) {
      localStorage.setItem(key, value)
    }
  },
  /**
   * 根据 key 获取字符串缓存。
   *
   * @param {string} key 缓存键
   * @returns {string|null} 命中返回字符串，未命中或 key 为空返回 null
   */
  get (key) {
    // 浏览器不支持 localStorage 时返回 null。
    if (!localStorage) {
      return null
    }
    // key 为空没有查询意义。
    if (key == null) {
      return null
    }
    return localStorage.getItem(key)
  },
  /**
   * 存储对象或数组等 JSON 数据。
   *
   * @param {string} key 缓存键
   * @param {Object|Array|number|boolean|string} jsonValue 需要缓存的数据
   */
  setJSON (key, jsonValue) {
    if (jsonValue != null) {
      this.set(key, JSON.stringify(jsonValue))
    }
  },
  /**
   * 获取 JSON 缓存并反序列化。
   *
   * 注意：如果对应缓存值不是合法 JSON 字符串，JSON.parse 会抛异常。
   * 当前工具假设 setJSON 和 getJSON 成对使用。
   *
   * @param {string} key 缓存键
   * @returns {*} 有值时返回 JSON.parse 后的数据，无值返回 null
   */
  getJSON (key) {
    const value = this.get(key)
    if (value != null) {
      return JSON.parse(value)
    }
    return null
  },
  /**
   * 删除指定 key 的本地缓存。
   *
   * @param {string} key 缓存键
   */
  remove (key) {
    localStorage.removeItem(key)
  }
}

export default {
  /**
   * 会话级缓存。
   *
   * 使用方式：
   * cache.session.set('key', 'value')
   * cache.session.get('key')
   * cache.session.setJSON('user', userInfo)
   * cache.session.getJSON('user')
   */
  session: sessionCache,
  /**
   * 本地持久化缓存。
   *
   * 使用方式：
   * cache.local.set('token', token)
   * cache.local.get('token')
   * cache.local.setJSON('settings', settings)
   * cache.local.getJSON('settings')
   */
  local: localCache
}
