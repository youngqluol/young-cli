const os = require('os')
const path = require('path')

// .rc文件保存在系统根目录下
exports.getRcPath = file => {
  return path.join(os.homedir(), file)
}
