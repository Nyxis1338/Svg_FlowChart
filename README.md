# 项目整体梳理 + 后续开发建议 + README模板
## 一、项目结构总览
仓库地址：https://github.com/Nyxis1338/Svg_FlowChart
技术栈：Vite + TypeScript + 原生SVG，无第三方绘图库，自研流程图引擎
目录分层清晰：
1. `src/types`：全局类型定义（几何、节点/锚点/连线模型）
2. `src/calc`：坐标、锚点、连线路径计算库
3. `src/core`：核心业务
   - FlowChart 入口类
   - SvgRenderer SVG渲染器
   - ViewportManager 画布平移缩放网格
   - FlowStore 状态仓库
   - DragManager 拖拽交互
   - SelectionManager 选中管理
4. `src/utils`：工具（DOM、UUID）
5. assets / index.html / main.ts 项目入口

## 二、当前已完成功能
1. 基础节点渲染、节点拖拽移动
2. 视口：空格+左键平移、滚轮缩放、无限网格背景
3. 选中元素 Delete/Backspace 删除（可加确认弹窗）
4. 节点自动生成上下左右4个合一锚点（端点=锚点）
5. 连线路径计算（直线/贝塞尔预留）
6. 数据分层Store管理，数据变更自动重绘
7. 完整TS类型约束，无any滥用

## 三、待完善核心功能（按优先级）
### 1. 锚点拖拽连线（最高优先级）
DragManager 补充锚点拖拽逻辑：
- 鼠标按下锚点 → 生成临时虚线
- 拖动到另一节点锚点松开 → 创建连线存入Store
- 拖拽中途ESC取消临时连线

### 2. 右键菜单扩展
右键画布：新增节点
右键节点：复制、删除
右键连线：删除连线

### 3. 视图快捷操作
- 适配键盘：Ctrl+A 全选
- 画布居中（所有节点自动适配可视区）
- 缩放重置快捷键

### 4. 持久化功能
导出JSON / 导入JSON（`exportData`/`importData` 已有API，做页面按钮）

### 5. 细节体验优化
1. 删除弹窗确认
2. 节点拖拽时吸附网格
3. 连线hover高亮、选中加粗
4. 多层图层鼠标穿透优化

## 四、配套 README.md 模板

### Svg_FlowChart
原生TS+SVG自研流程图引擎，无第三方绘图库依赖，轻量化画布工具。

### 功能特性
- ✅ 全屏无限网格画布（仿jsPlumb）
- ✅ 空格拖拽平移、鼠标滚轮缩放
- ✅ 节点拖拽移动
- ✅ 四向合一锚点（端点/锚点统一）
- ✅ 连线自动路径计算
- ✅ 数据驱动渲染，状态仓库管理
- ✅ TypeScript 完整类型约束
- ✅ 节点/锚点/连线分级图层渲染

## 五、快速启动
### 1. 克隆仓库
```bash
git clone https://github.com/Nyxis1338/Svg_FlowChart
cd Svg_FlowChart
```

### 2. 安装依赖
```bash
npm install
```

### 3. 开发调试
```bash
npm run dev
```
打开浏览器访问 `http://localhost:5173`

### 4. 打包部署
```bash
npm run build
```
打包产物输出 `dist` 静态文件夹，可直接部署静态服务器

## 操作快捷键
| 操作 | 功能 |
|------|------|
| 空格 + 鼠标左键 | 平移画布 |
| 鼠标滚轮 | 放大/缩小画布 |
| 左键拖动节点 | 移动节点 |
| Delete / Backspace | 删除选中元素 |

## 项目目录
```
Svg_FlowChart
├─ assets        全局样式
├─ src
│  ├─ types       全局TS类型
│  ├─ utils       DOM、UUID工具
│  ├─ calc        锚点、连线几何计算
│  └─ core        画布核心逻辑
│     ├─ FlowChart.ts     项目入口
│     ├─ SvgRenderer     SVG渲染
│     ├─ ViewportManager  视口/网格/缩放平移
│     ├─ FlowStore        全局状态仓库
│     └─ DragManager      拖拽交互
├─ index.html     页面入口
├─ package.json
└─ tsconfig.json
```

## 开发计划
- [ ] 锚点拖拽创建连线
- [ ] 右键菜单（新增/复制/删除）
- [ ] 导出/导入JSON画布数据
- [ ] 网格吸附功能
- [ ] 多类型连线（贝塞尔曲线）
- [ ] 撤销/重做栈


## 六、下一步开发建议
如果你现在优先做**拖拽连线功能**，我可以直接完整编写 DragManager.ts 锚点拖拽、临时连线、生成连线的全套交互代码；
需要的话告诉我即可。
