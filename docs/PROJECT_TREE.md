# Court Ledger 项目文件树 (Project Tree)

```text
lebintoolbox/
├── frontend/                          # [前端应用] 纯原生单页应用
│   ├── index.html                     # 纯离线计算器主入口
│   ├── venues.csv                     # 默认球场数据集 (CSV 编码)
│   ├── favicon.ico
│   ├── assets/
│   ├── css/
│   │   ├── variables.css              # 主题变量与颜色规范
│   │   ├── base.css                   # 全局排版与基础底座
│   │   └── courtledger.css            # 计算器界面与面板样式
│   └── js/
│       ├── main.js                    # 主程序引导
│       ├── core/
│       │   ├── drawer.js              # 移动端数字选择抽屉
│       │   └── theme.js               # 深浅色主题引擎
│       └── courtledger/
│           ├── calculator.js          # AA 数学计算算法核心
│           ├── state.js               # CSV 解析与本地存储状态
│           └── ui.js                  # 界面事件绑定与实时渲染
├── docs/                              # 项目文档
│   ├── ARCHITECTURE.md                # 架构设计说明
│   └── PROJECT_TREE.md                # 项目文件树
├── tests/
│   └── calculator.test.mjs            # 核心算法与 CSV 解析自动化单元测试
├── package.json                       # 依赖与脚本
└── README.md                          # 项目说明文件
```
