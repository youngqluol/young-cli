const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.config');

module.exports = merge(commonConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: '../dist',
    compress: true,
    port: 9000,
    open: true,
    client: {
      overlay: false,
      // progress: true // 编译进度
    }
  },
  plugins: [
    // webpack v4+ 指定 mode 会自动地配置 process.env.NODE_ENV
    // 在 webpack 5 中 HMR 已自动支持。无需配置HotModuleReplacementPlugin
  ]
});
