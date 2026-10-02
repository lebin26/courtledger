# Court Ledger 架构设计 (Offline Architecture)

## 1. 架构目标
- **100% 纯离线**：打开浏览器即用，无需任何云端 API、数据库或服务端环境。
- **零依赖与零构建 (Zero-Build)**：采用标准原生 ES 与语义化 HTML5/CSS3，免除任何打包、构建与编译摩擦。
- **纯本地数据持久化**：球场预设数据集通过 `venues.csv` 格式定义并保存在客户端 `localStorage` 中。

## 2. 模块划分
- **Calculator Engine (`frontend/js/courtledger/calculator.js`)**：纯函数式计算核心，独立测试、无任何 DOM 耦合。
- **Domain State (`frontend/js/courtledger/state.js`)**：CSV 数据解析、本地球场缓存读取与写入。
- **UI Controller (`frontend/js/courtledger/ui.js`)**：DOM 事件监听、滑动条交互、数值更新与剪贴板导出。
- **Core Modules (`frontend/js/core/`)**：深浅色主题切换 (`theme.js`) 与移动端抽屉选择器 (`drawer.js`)。
