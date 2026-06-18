
// 导入Vite的配置函数和环境变量加载函数
// 这就像Java里的import语句，引入我们需要的工具类
import { defineConfig, loadEnv } from 'vite'
// 导入path模块，用来处理文件路径，类似Java的Paths或File类
// path 是 Node.js 内置的核心模块，不需要额外安装
// 就像 Java 的 java.nio.file.Paths 类，是系统自带的工具类
// 它提供了处理文件和目录路径的实用方法，如 path.resolve()、path.join() 等
import path from 'path'

// 导入自定义的Vite插件创建函数
import createVitePlugins from './vite/plugins'

// 后端服务的地址，就像Java里配置的数据库连接地址
const baseUrl = 'http://localhost:8080'

// Vite配置的主函数，接收当前模式(开发/生产)和命令作为参数
// 这就像Spring Boot的配置类，根据不同环境返回不同配置
export default defineConfig(({ mode, command }) => {
  // 加载当前环境的配置文件(.env.development/.env.production等)
  // 类似Java里读取application-{profile}.yml
  const env = loadEnv(mode, process.cwd())
  // 获取应用环境变量
  const { VITE_APP_ENV } = env

  return {
    // 应用部署的基础路径
    // 比如部署在 https://xxx.com/admin/ 这里就要填 '/admin/'
    base: VITE_APP_ENV === 'production' ? '/' : '/',
    
    // 使用的插件列表，类似Java里引入各种依赖
    plugins: createVitePlugins(env, command === 'build'),
    
    // 模块解析配置
    resolve: {
      // 路径别名配置，就像Java里的package别名
      alias: {
        // ~ 代表项目根目录
        '~': path.resolve(__dirname, './'),
        // @ 代表src目录，以后import时可以用 @/xxx 代替 ../../xxx
        '@': path.resolve(__dirname, './src')
      },
      // 引入文件时可以省略的后缀名
      // 比如 import './index' 会自动找 index.js/index.ts/index.vue 等
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    
    // 打包构建配置，类似Maven/Gradle的打包配置
    build: {
      // 是否生成sourcemap(用于调试)
      // 生产环境不生成，减小体积；开发环境用inline模式嵌入
      sourcemap: command === 'build' ? false : 'inline',
      // 打包输出目录，默认dist
      outDir: 'dist',
      // 静态资源存放目录
      assetsDir: 'assets',
      // 单个代码块大小警告阈值(单位KB)，超过这个值会提醒你
      chunkSizeWarningLimit: 2000,
      // Rollup打包工具的详细配置
      rollupOptions: {
        output: {
          // 代码块文件命名规则：[name]是文件名，[hash]是哈希值防止缓存
          chunkFileNames: 'static/js/[name]-[hash].js',
          // 入口文件命名规则
          entryFileNames: 'static/js/[name]-[hash].js',
          // 静态资源(图片、字体等)命名规则
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]'
        }
      }
    },
    
    // 开发服务器配置，类似Tomcat的配置
    server: {
      // 开发服务器端口
      port: 80,
      // 监听所有网络接口，这样局域网内其他设备也能访问
      host: true,
      // 启动时自动打开浏览器
      open: true,
      // 代理配置，解决跨域问题！这个很重要
      proxy: {
        // 前端请求 /dev-api 开头的接口，都会代理到后端
        '/dev-api': {
          // 代理目标地址，就是我们上面定义的后端地址
          target: baseUrl,
          // 允许跨域，修改请求头的origin
          changeOrigin: true,
          // 路径重写：把 /dev-api 去掉，因为后端接口没有这个前缀
          rewrite: (p) => p.replace(/^\/dev-api/, '')
        },
        // SpringDoc API文档的代理配置
        '^/v3/api-docs/(.*)': {
          target: baseUrl,
          changeOrigin: true,
        }
      }
    },
    
    // CSS相关配置
    css: {
      // PostCSS配置，PostCSS类似CSS的编译器
      postcss: {
        plugins: [
          {
            // 自定义插件：移除CSS中的charset声明
            // 因为有些情况下charset会导致问题
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove()
                }
              }
            }
          }
        ]
      }
    }
  }
})

