# Svg_FlowChart

原生 TypeScript + SVG 自研流程图引擎，无第三方绘图库依赖，轻量且可扩展。借鉴 jsPlumb 设计思路，实现节点、锚点、连线的完整交互与渲染。

## 功能特性

- ✅ 全屏无限网格画布，支持平移（空格+拖拽）与滚轮缩放
- ✅ 多种节点形状：矩形、圆形、菱形、椭圆
- ✅ 固定锚点（`static`）与连续锚点（`perimeter`，不可见但可交互）
- ✅ 三种连线类型：直线（`straight`）、贝塞尔曲线（`bezier`）、流程图折线（`flowchart`）
- ✅ 连线支持文本标签与方向箭头（起点/终点/双向）
- ✅ 数据驱动渲染（`Store` 变更自动重绘）
- ✅ 节点拖拽移动，连线自动跟随
- ✅ 锚点拖拽创建连线，悬停高亮，磁吸吸附
- ✅ 选中、删除（Delete/Backspace）节点或连线
- ✅ 视图控制（放大/缩小/重置/适配）
- ✅ 右键菜单（新增/复制/删除）
- ✅ 数据序列化（导入/导出 JSON）
- ✅ 完整 TypeScript 类型支持

## 快速启动

```bash
git clone https://github.com/Nyxis1338/Svg_FlowChart
cd Svg_FlowChart
npm install
npm run dev
```

浏览器访问 http://localhost:5173 即可看到测试页面。

项目结构及文件说明

```
Svg_FlowChart/
├── index.html                # 测试页面，包含工具栏与画布容器
├── package.json              # 项目依赖（Vite + TypeScript）
├── tsconfig.json             # TypeScript 编译配置
├── assets/
│   └── style.css             # 全局样式（可选）
├── src/
│   ├── main.ts               # 入口文件：初始化画布，创建测试数据，绑定UI按钮
│   │
│   ├── types/                # 类型定义（全局共享）
│   │   ├── geometry.ts       # Point, Rect 基础几何接口
│   │   ├── SvgModel.ts       # 核心数据模型：Node, Anchor, Connection, 枚举等
│   │   └── index.ts          # 统一导出
│   │
│   ├── calc/                 # 纯函数计算模块（无状态，可独立测试）
│   │   ├── geometry.ts       # 几何工具集：距离、投影、矩形边缘、周长计算等
│   │   ├── anchor/           # 锚点位置计算
│   │   │   ├── base.ts       # 抽象基类（可扩展）
│   │   │   ├── static.ts     # 固定锚点（上/右/下/左/中心）
│   │   │   ├── perimeter.ts  # 周边均分锚点（沿矩形周长均匀分布）
│   │   │   ├── continuous.ts # 连续锚点（根据两节点相对位置动态计算最佳边缘点）
│   │   │   └── index.ts      # 统一导出 getStaticAnchor, getPerimeterAnchor, getContinuousAnchorPair
│   │   └── connector/        # 连线路径生成
│   │       ├── base.ts       # 抽象基类
│   │       ├── straight.ts   # 直线路径
│   │       ├── bezier.ts     # 三次贝塞尔曲线
│   │       ├── flowchart.ts  # 流程图折线（直角正交）
│   │       └── index.ts      # 导出 generatePath 和 generatePathWithOptions
│   │
│   ├── core/                 # 核心业务模块
│   │   ├── SvgEngine.ts   # **主入口类**：聚合所有子模块，对外暴露统一 API（节点/连线/锚点 CRUD，视图控制，导入/导出，销毁）
│   │   │
│   │   ├── store/            # 数据仓库（状态管理）
│   │   │   └── SvgStore.ts   # 存储节点、锚点、连线数据，提供增删改查，发布订阅（notify），以及连线路径计算（computeConnectionPath）
│   │   │
│   │   ├── renderer/         # SVG 渲染器
│   │   │   └── SvgRenderer.ts # 订阅 Store 和 Selection，渲染节点（多种形状）、锚点（static 可见 / perimeter 透明交互）、连线（路径+标签+箭头），临时虚线，右键菜单
│   │   │
│   │   ├── viewport/         # 视口控制（平移/缩放）
│   │   │   └── ViewportManager.ts # 管理 SVG 的 contentGroup 变换（translate/scale），实现空格拖拽平移、滚轮缩放，坐标转换（screenToCanvas/canvasToScreen）
│   │   │
│   │   ├── interaction/      # 交互逻辑
│   │   │   └── DragManager.ts # 处理节点拖拽、锚点拖拽创建连线、连线重连，鼠标/键盘事件（ESC取消，Delete删除），锚点悬停高亮
│   │   │
│   │   └── selection/        # 选中管理
│   │       └── SelectionManager.ts # 维护当前选中的类型（node/connection）和 ID，提供订阅通知，供渲染器高亮使用
│   │
│   └── utils/                # 工具函数
│       ├── dom.ts            # SVG 元素创建、右键菜单构建、DOM 操作辅助
│       └── uuid.ts           # 生成唯一 ID（uuidv4 / shortId）
│
└── README.md                 # 项目说明文档
```

### 核心数据模型（SvgModel.ts 简览）

Node：节点，包含位置、尺寸、形状、样式、标签、锚点 ID 列表。

Anchor：锚点（端点），分为 static（固定位置）和 perimeter（连续动态）。static 锚点可见，perimeter 锚点透明但可交互。

Connection：连线，包含类型（straight/bezier/flowchart）、源/目标锚点 ID（或节点 ID 用于连续锚点）、样式、标签配置、箭头配置。

### 常用 API（通过 SvgEngine 实例调用）

```
const chart = new SvgEngine(container);

// 节点操作
chart.addNode({ x, y, width, height, label, shape, fill, stroke });
chart.getNode(id);
chart.getAllNodes();
chart.updateNode(id, partial);
chart.removeNode(id);

// 连线操作
chart.addConnection({ sourceAnchorId, targetAnchorId, connectorType, stroke, label, arrow });
chart.getConnection(id);
chart.getAllConnections();
chart.updateConnection(id, partial);
chart.removeConnection(id);

// 锚点操作
chart.addAnchor({ nodeId, anchorMode, staticType, direction, radius, ... });
chart.getAllAnchors();
chart.getNodeAnchors(nodeId);
chart.removeAnchor(id);

// 视图控制
chart.zoomIn(factor);
chart.zoomOut(factor);
chart.zoomTo(scale);
chart.resetView();
chart.fitToView(padding);

// 数据导入导出
const data = chart.exportData();
chart.importData(data);

// 销毁
chart.destroy();
```

### 操作快捷键

| 操作                | 说明                         |
| ------------------- | ---------------------------- |
| 空格 + 鼠标左键拖拽 | 平移画布                     |
| 鼠标滚轮            | 缩放画布                     |
| 左键拖拽节点        | 移动节点                     |
| 从锚点拖拽          | 创建连线（拖到另一锚点释放） |
| Delete / Backspace  | 删除选中的节点或连线         |
| ESC                 | 取消当前拖拽操作             |

### 开发计划

□ 支持撤销/重做（Undo/Redo）
□ 支持多选与框选
□ 连线路径优化（避免穿越节点）
□ 对齐线与智能吸附
□ 主题定制（颜色/字体）

### 技术栈

Vite（构建工具）

TypeScript（类型安全）

原生 SVG（无第三方绘图库）

### License

MIT

```
Svg_FlowChart
├─ .prettierrc
├─ 1.md
├─ assets
│  └─ style.css
├─ demo
│  ├─ batch-update
│  │  └─ index.html
│  ├─ connection-handle
│  │  └─ index.html
│  ├─ continuous-edge
│  │  └─ index.html
│  └─ stub-demo
│     └─ index.html
├─ index.html
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ calc
│  │  ├─ anchor
│  │  │  ├─ continuous.ts
│  │  │  ├─ index.ts
│  │  │  ├─ perimeter.ts
│  │  │  ├─ position.ts
│  │  │  └─ static.ts
│  │  ├─ connector
│  │  │  ├─ bezier.ts
│  │  │  ├─ flowchart.ts
│  │  │  ├─ generator.ts
│  │  │  ├─ index.ts
│  │  │  ├─ path.ts
│  │  │  └─ straight.ts
│  │  ├─ geometry.ts
│  │  └─ index.ts
│  ├─ core
│  │  ├─ interaction
│  │  │  ├─ ContextMenu.ts
│  │  │  ├─ DragManager.ts
│  │  │  ├─ EventBus.ts
│  │  │  └─ HitTest.ts
│  │  ├─ renderer
│  │  │  ├─ AnchorRenderer.ts
│  │  │  ├─ ConnectionRenderer.ts
│  │  │  ├─ LayerManager.ts
│  │  │  ├─ NodeRenderer.ts
│  │  │  └─ SvgRenderer.ts
│  │  ├─ selection
│  │  │  └─ SelectionManager.ts
│  │  ├─ store
│  │  │  └─ Store.ts
│  │  ├─ SvgEngine.ts
│  │  └─ viewport
│  │     └─ ViewportManager.ts
│  ├─ main.ts
│  ├─ styles
│  │  └─ defaults.ts
│  ├─ types
│  │  ├─ geometry.ts
│  │  ├─ index.ts
│  │  └─ SvgModel.ts
│  └─ utils
│     ├─ anchor-helpers.ts
│     └─ dom.ts
├─ ts.md
└─ tsconfig.json

```
