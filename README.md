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
const SE = new SvgEngine(container);

// 创建节点
const nodeA = SE.addNode({
  x: 100,
  y: 100,
  width: 140,
  height: 90,
  label: '开始',
  shape: 'rectangle',
});

// 创建锚点（支持批量）
SE.addAnchor({
  nodeId: nodeA.id,
  position: ['top', 'right', 'bottom', 'left'],
  radius: 5,
});

// 创建连线
SE.addConnection({
  sourceAnchorId: anchorA.id,
  targetAnchorId: anchorB.id,
  connectorType: 'flowchart',
  stroke: '#27ae60',
  arrow: { direction: 'target', length: 12, type: 'triangle' },
});
```

### 使用（UMD）

```typescript
<div id="container"></div>
<script src="dist/svgflow.umd.js"></script>
<script>
  const { SvgEngine } = window.SvgFlow;
  const SE = new SvgEngine(document.getElementById('container'));
  // ... 同上
</script>
```

---

## 🎨 核心 API

所有 API 通过 `SvgEngine` 实例调用（通常命名为 `SE`）。

### 节点操作（Node）

| API                       | 说明               | 常用参数                                                                  |
| :------------------------ | :----------------- | :------------------------------------------------------------------------ |
| `addNode(data)`           | 添加节点           | `{ x, y, width?, height?, label?, shape?, fill?, stroke?, strokeWidth? }` |
| `getNode(id)`             | 获取节点           | `id: string`                                                              |
| `getAllNodes()`           | 获取所有节点       | 无                                                                        |
| `updateNode(id, updates)` | 更新节点           | `id: string, updates: Partial<Node>`                                      |
| `removeNode(id)`          | 删除节点           | `id: string`                                                              |
| `getNodeAnchors(nodeId)`  | 获取节点的所有锚点 | `nodeId: string`                                                          |

**示例**：

```typescript
const node = SE.addNode({ x: 100, y: 100, label: '开始', shape: 'rectangle' });
SE.updateNode(node.id, { fill: '#ffcccc' });
```

---

### 锚点操作（Anchor）

| API                         | 说明                   | 常用参数                                                                                                                      |
| :-------------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `addAnchor(data)`           | 添加锚点（单个或批量） | `{ nodeId, position, radius?, fill?, stroke? }`<br/>`position` 支持单个或数组：`'right'` 或 `['top','right','bottom','left']` |
| `getAllAnchors()`           | 获取所有锚点           | 无                                                                                                                            |
| `getNodeAnchors(nodeId)`    | 获取节点的所有锚点     | `nodeId: string`                                                                                                              |
| `updateAnchor(id, updates)` | 更新锚点               | `id: string, updates: Partial<Anchor>`                                                                                        |
| `removeAnchor(id)`          | 删除锚点               | `id: string`                                                                                                                  |

**示例**：

```typescript
// 单个
SE.addAnchor({ nodeId: node.id, position: 'right', radius: 6 });

// 批量
SE.addAnchor({ nodeId: node.id, position: ['top', 'right', 'bottom', 'left'], radius: 6 });
```

---

### 连线操作（Connection）

| API                             | 说明         | 常用参数                                                                                                 |
| :------------------------------ | :----------- | :------------------------------------------------------------------------------------------------------- |
| `addConnection(data)`           | 添加连线     | `{ sourceAnchorId, targetAnchorId, connectorType?, stroke?, strokeWidth?, stub?, gap?, arrow?, label? }` |
| `getConnection(id)`             | 获取连线     | `id: string`                                                                                             |
| `getAllConnections()`           | 获取所有连线 | 无                                                                                                       |
| `updateConnection(id, updates)` | 更新连线     | `id: string, updates: Partial<Connection>`                                                               |
| `removeConnection(id)`          | 删除连线     | `id: string`                                                                                             |

**示例**：

```typescript
SE.addConnection({
  sourceAnchorId: anchorA.id,
  targetAnchorId: anchorB.id,
  connectorType: 'flowchart',
  stroke: '#27ae60',
  arrow: { direction: 'target', length: 14, type: 'triangle' },
  stub: 20,
  gap: 5,
});
```

---

### 批量更新（Batch Update）

| API                             | 说明             | 常用参数                                    |
| :------------------------------ | :--------------- | :------------------------------------------ |
| `updateAllNodes(updates)`       | 更新所有节点样式 | `{ fill?, stroke?, strokeWidth? }`          |
| `updateAllConnections(updates)` | 更新所有连线样式 | `{ stroke?, strokeWidth?, arrow?, label? }` |
| `updateAllAnchors(updates)`     | 更新所有锚点样式 | `{ radius?, fill?, stroke? }`               |

**示例**：

```typescript
SE.updateAllNodes({ fill: '#ffcccc' });
SE.updateAllConnections({ stroke: '#4caf50', strokeWidth: 3 });
```

---

### 视图控制（Viewport）

| API                   | 说明           | 常用参数                      |
| :-------------------- | :------------- | :---------------------------- |
| `zoomIn(factor?)`     | 放大           | `factor?: number`（默认 0.1） |
| `zoomOut(factor?)`    | 缩小           | `factor?: number`（默认 0.1） |
| `zoomTo(scale)`       | 缩放到指定比例 | `scale: number`（0.3 ~ 3）    |
| `resetView()`         | 重置视图       | 无                            |
| `fitToView(padding?)` | 适配所有节点   | `padding?: number`（默认 50） |

---

### 数据导入/导出

| API                | 说明         | 常用参数          |
| :----------------- | :----------- | :---------------- |
| `exportData()`     | 导出所有数据 | 无                |
| `importData(data)` | 导入数据     | `data: StoreData` |

---

## 🎯 配置参数详解

### 连线类型（connectorType）

| 值            | 说明                             |
| :------------ | :------------------------------- |
| `'straight'`  | 直线                             |
| `'bezier'`    | 贝塞尔曲线                       |
| `'flowchart'` | 正交折线（推荐，带 stub 和 gap） |

### 箭头配置（ArrowConfig）

| 字段        | 类型                                       | 说明                             |
| :---------- | :----------------------------------------- | :------------------------------- |
| `direction` | `'none' \| 'source' \| 'target' \| 'both'` | 箭头位置和指向                   |
| `type`      | `'triangle' \| 'fork'`                     | 箭头样式                         |
| `length`    | `number`                                   | 箭头长度                         |
| `width`     | `number`                                   | 箭头宽度                         |
| `color`     | `string`                                   | 箭头颜色（可选，默认与连线同色） |

**示例**：

```typescript
arrow: { direction: 'target', type: 'triangle', length: 16, width: 10 }
```

### 标签配置（LabelConfig）

| 字段       | 类型       | 说明     |
| :--------- | :--------- | :------- |
| `text`     | `string`   | 标签文本 |
| `fontSize` | `number`   | 字号     |
| `color`    | `string`   | 颜色     |
| `offset`   | `{ x, y }` | 偏移量   |

### 节点形状（shape）

| 值            | 说明         |
| :------------ | :----------- |
| `'rectangle'` | 矩形（默认） |
| `'circle'`    | 圆形         |
| `'diamond'`   | 菱形         |
| `'ellipse'`   | 椭圆         |

### 锚点位置（position）

| 值                                                             | 说明     |
| :------------------------------------------------------------- | :------- |
| `'top'`、`'right'`、`'bottom'`、`'left'`                       | 四边中点 |
| `'top-left'`、`'top-right'`、`'bottom-left'`、`'bottom-right'` | 四个角   |

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

## ✅ 完整示例

```typescript
import { SvgEngine } from 'svg-flowchart';

const SE = new SvgEngine(container);

// 节点
const nodeA = SE.addNode({ x: 100, y: 100, width: 140, height: 90, label: 'A', shape: 'rectangle' });
const nodeB = SE.addNode({ x: 400, y: 100, width: 140, height: 90, label: 'B', shape: 'rectangle' });

// 锚点（批量）
const anchorsA = SE.addAnchor({ nodeId: nodeA.id, position: ['top', 'right', 'bottom', 'left'], radius: 6 });
const anchorsB = SE.addAnchor({ nodeId: nodeB.id, position: ['top', 'right', 'bottom', 'left'], radius: 6 });

// 连线
SE.addConnection({
  sourceAnchorId: anchorsA[1].id, // right
  targetAnchorId: anchorsB[2].id, // left
  connectorType: 'flowchart',
  stroke: '#27ae60',
  strokeWidth: 3,
  stub: 20,
  gap: 5,
  arrow: { direction: 'target', type: 'triangle', length: 16 },
  label: { text: '流程', fontSize: 14, color: '#333' },
});

// 适配视图
SE.fitToView(30);
```

### 便捷 API（Convenience APIs）

| API                              | 说明                            | 常用参数                                                        |
| :------------------------------- | :------------------------------ | :-------------------------------------------------------------- |
| `setLabel(id, text)`             | 设置节点或连线的标签文本        | `id: string, text: string`                                      |
| `setArrow(id, options)`          | 设置连线的箭头方向/样式         | `id: string, options: Partial<ArrowConfig>`                     |
| `getAnchorId(nodeId, positions)` | 获取指定节点上指定位置的锚点 ID | `nodeId: string, positions: AnchorPosition \| AnchorPosition[]` |

**示例**：

```typescript
// 1. 修改节点标签
SE.setLabel('node-xxx', '新节点名称');

// 2. 修改连线标签
SE.setLabel('connect-xxx', '新连线标签');

// 3. 修改箭头方向
SE.setArrow('connect-xxx', { direction: 'both' });

// 4. 获取锚点 ID
const ids = SE.getAnchorId('node-1', 'right');
// ids = { right: 'anchor-xxx' }

const multipleIds = SE.getAnchorId('node-1', ['top', 'bottom']);
// multipleIds = { top: 'anchor-xxx', bottom: 'anchor-yyy' }

// 5. 使用 getAnchorId 配合 addConnection
const source = SE.getAnchorId('nodeA', 'right');
const target = SE.getAnchorId('nodeB', 'left');
if (source.right && target.left) {
  SE.addConnection({
    sourceAnchorId: source.right,
    targetAnchorId: target.left,
    connectorType: 'flowchart',
  });
}
```

---

### `updateConnection` 详细用法

更新连线的属性，支持修改 `stroke`、`strokeWidth`、`stub`、`gap`、`label`、`arrow` 等。

```typescript
// 修改连线颜色和宽度
SE.updateConnection('connect-xxx', {
  stroke: '#ff0000',
  strokeWidth: 3,
});

// 修改标签文本
SE.updateConnection('connect-xxx', {
  label: { text: '新标签', fontSize: 16, color: '#333' },
});

// 修改箭头方向（保留其他箭头属性）
SE.updateConnection('connect-xxx', {
  arrow: { direction: 'both' },
});

// 重连（修改目标锚点）
const newTarget = SE.getAnchorId('nodeC', 'top');
if (newTarget.top) {
  SE.updateConnection('connect-xxx', {
    targetAnchorId: newTarget.top,
  });
}
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
