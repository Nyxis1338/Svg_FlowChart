# SVG Flow Chart

一个轻量级、开箱即用的 SVG 流程图绘制引擎，支持节点拖拽、连线创建、样式定制等核心功能。

---

## ✨ 特性

- 🎯 **开箱即用**：无需复杂配置，直接引入即可使用
- 🎨 **4 种节点形状**：矩形、圆形、菱形、椭圆
- 🔗 **3 种连线类型**：直线、贝塞尔曲线、流程图正交折线
- 📍 **8 个锚点方向**：上下左右及四个角，支持双向连接
- 🖱️ **交互完整**：节点拖拽、连线拖拽创建/重连、右键菜单
- 🎭 **箭头样式**：三角形箭头、三叉箭头
- 📐 **Stub 垂直引出**：连线从节点边缘沿法线方向垂直引出
- 🎨 **样式定制**：批量更新节点/连线/锚点样式
- 📦 **UMD 打包**：支持 `<script>` 标签直接引入
- ⚡ **轻量高效**：纯 TypeScript 编写，无第三方依赖

---

## 🚀 快速开始

### 安装

```bash
npm install svg-flow-chart
```

### 使用（ES Module）

```typescript
import { SvgEngine } from 'svg-flow-chart';

const container = document.getElementById('container');
const engine = new SvgEngine(container);

// 创建节点
const nodeA = engine.addNode({
  x: 100,
  y: 100,
  width: 140,
  height: 90,
  label: '开始',
  shape: 'rectangle',
});

// 创建锚点
engine.addAnchor({
  nodeId: nodeA.id,
  position: 'right',
  radius: 5,
});

// 创建连线
engine.addConnection({
  sourceAnchorId: anchorA.id,
  targetAnchorId: anchorB.id,
  connectorType: 'flowchart',
  stroke: '#27ae60',
  arrow: { direction: 'target', length: 12, type: 'triangle' },
});
```

### 使用（UMD）

```html
<script src="dist/svgflow.umd.js"></script>
<script>
  const { SvgEngine } = window.SvgFlow;
  const engine = new SvgEngine(document.getElementById('container'));
  // ... 同上
</script>
```

---

## 🎨 核心 API

### 节点操作

```typescript
// 添加节点
const node = engine.addNode({
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
  shape?: 'rectangle' | 'circle' | 'diamond' | 'ellipse',
  fill?: string,
  stroke?: string,
  strokeWidth?: number,
});

// 获取/更新/删除节点
engine.getNode(id);
engine.updateNode(id, updates);
engine.removeNode(id);
```

### 锚点操作

```typescript
// 添加锚点
engine.addAnchor({
  nodeId: string,
  position: 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  radius?: number,
  fill?: string,
  stroke?: string,
});

engine.getNodeAnchors(nodeId);
engine.removeAnchor(id);
```

### 连线操作

```typescript
// 添加连线
engine.addConnection({
  sourceAnchorId: string,
  targetAnchorId: string,
  connectorType: 'straight' | 'bezier' | 'flowchart',
  stroke?: string,
  strokeWidth?: number,
  stub?: number,     // stub 长度
  gap?: number,      // 间隙
  arrow?: {
    direction: 'none' | 'source' | 'target' | 'both',
    type?: 'triangle' | 'fork',
    length?: number,
    width?: number,
    color?: string,
  },
  label?: {
    text: string,
    fontSize?: number,
    color?: string,
    offset?: { x: number; y: number },
  },
});

engine.updateConnection(id, updates);
engine.removeConnection(id);
```

### 批量更新

```typescript
// 批量更新所有节点/连线/锚点样式
engine.updateAllNodes({ fill: '#ffcccc' });
engine.updateAllConnections({ stroke: '#4caf50' });
engine.updateAllAnchors({ radius: 8 });
```

### 视图控制

```typescript
engine.zoomIn(); // 放大
engine.zoomOut(); // 缩小
engine.zoomTo(1.5); // 缩放到指定比例
engine.resetView(); // 重置视图
engine.fitToView(30); // 适配所有节点
```

### 导入/导出

```typescript
const data = engine.exportData(); // 导出 JSON
engine.importData(data); // 导入 JSON
```

---

## 🎨 默认配色

| 元素     | 颜色   | 色值      |
| :------- | :----- | :-------- |
| 节点边框 | 海洋蓝 | `#2980b9` |
| 锚点     | 蓝紫色 | `#5470c6` |
| 连线     | 舒适绿 | `#27ae60` |
| 箭头     | 舒适绿 | `#27ae60` |

可通过 `Defaults` 全局修改：

```typescript
import { Defaults } from 'svg-flow-chart';

Defaults.node.stroke = '#your-color';
Defaults.connection.stroke = '#your-color';
```

---

## 🧪 示例

- [主示例](http://localhost:5173/) — 基础功能展示
- [批量更新](http://localhost:5173/demo/batch-update/index.html) — 样式批量更新
- [Stub 演示](http://localhost:5173/demo/stub-demo/index.html) — stub 垂直引出
- [Stub + 多形状](http://localhost:5173/demo/stub-gap/index.html) — 多种节点形状 + stub

---

## 📦 构建

```bash
npm install
npm run build
```

生成 `dist/svgflow.umd.js`，可直接在浏览器中使用。

---

## 📝 License

MIT

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️**
