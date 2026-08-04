import { SvgEngine } from "./core/SvgEngine";
import { NodeShape, ArrowDirection, ConnectorType, AnchorPosition, AnchorType } from "./types/SvgModel";

// ==================== 预设连线颜色（8种优雅色） ====================
const CONNECTOR_COLORS = [
  '#5b6c7d', // 蓝灰
  '#e74c3c', // 红
  '#2ecc71', // 绿
  '#f39c12', // 橙
  '#9b59b6', // 紫
  '#1abc9c', // 青
  '#e67e22', // 橙红
  '#3498db', // 蓝
];

// 随机取色
function randomColor(): string {
  return CONNECTOR_COLORS[Math.floor(Math.random() * CONNECTOR_COLORS.length)];
}

// ==================== 初始化画布 ====================
const appDom = document.getElementById("canvas-container")!;
const chart = new SvgEngine(appDom);
(window as any).chart = chart;
const store = chart.store;

// ==================== 创建节点（使用默认样式，不传 fill/stroke） ====================
// 1. 矩形节点
const nodeA = chart.addNodeWithAnchors({
  x: 80,
  y: 80,
  width: 150,
  height: 90,
  label: "矩形A",
  shape: NodeShape.RECTANGLE,
  // 不指定 fill/stroke，使用 NodeRenderer 默认样式
});

// 2. 圆形节点
const nodeB = chart.addNodeWithAnchors({
  x: 450,
  y: 80,
  width: 120,
  height: 120,
  label: "圆形B",
  shape: NodeShape.CIRCLE,
});

// 3. 菱形节点
const nodeC = chart.addNodeWithAnchors({
  x: 250,
  y: 300,
  width: 140,
  height: 100,
  label: "菱形C",
  shape: NodeShape.DIAMOND,
});

// 4. 椭圆节点
const nodeD = chart.addNodeWithAnchors({
  x: 550,
  y: 300,
  width: 160,
  height: 100,
  label: "椭圆D",
  shape: NodeShape.ELLIPSE,
});

// ==================== 创建连线（使用随机颜色） ====================
const allAnchors = store.getAllAnchors();

function getAnchor(nodeId: string, position: AnchorPosition) {
  return allAnchors.find(ap => ap.nodeId === nodeId && ap.position === position);
}

// 1. A右 → B左（流程图折线，带标签和箭头）
const aRight = getAnchor(nodeA.id, AnchorPosition.RIGHT);
const bLeft = getAnchor(nodeB.id, AnchorPosition.LEFT);
if (aRight && bLeft) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.FLOWCHART,
    sourceAnchorId: aRight.id,
    targetAnchorId: bLeft.id,
    stroke: randomColor(),
    strokeWidth: 2,
    label: {
      text: "折线",
      fontSize: 12,
      color: "#333",
      offset: { x: 0, y: -12 },
    },
    arrow: {
      direction: ArrowDirection.TARGET,
      length: 12,
    },
  });
}

// 2. A下 → C上（直线，带标签和箭头）
const aBottom = getAnchor(nodeA.id, AnchorPosition.BOTTOM);
const cTop = getAnchor(nodeC.id, AnchorPosition.TOP);
if (aBottom && cTop) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.STRAIGHT,
    sourceAnchorId: aBottom.id,
    targetAnchorId: cTop.id,
    stroke: randomColor(),
    strokeWidth: 2,
    label: {
      text: "直线",
      fontSize: 12,
      color: "#333",
      offset: { x: 20, y: 0 },
    },
    arrow: {
      direction: ArrowDirection.TARGET,
      length: 12,
    },
  });
}

// 3. B右 → D左（贝塞尔曲线，两端箭头）
const bRight = getAnchor(nodeB.id, AnchorPosition.RIGHT);
const dLeft = getAnchor(nodeD.id, AnchorPosition.LEFT);
if (bRight && dLeft) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.BEZIER,
    sourceAnchorId: bRight.id,
    targetAnchorId: dLeft.id,
    stroke: randomColor(),
    strokeWidth: 2,
    label: {
      text: "贝塞尔",
      fontSize: 12,
      color: "#333",
      offset: { x: 0, y: -15 },
    },
    arrow: {
      direction: ArrowDirection.BOTH,
      length: 12,
    },
  });
}

// 4. D下 → C右（流程图，无标签，无箭头）
const dBottom = getAnchor(nodeD.id, AnchorPosition.BOTTOM);
const cRight = getAnchor(nodeC.id, AnchorPosition.RIGHT);
if (dBottom && cRight) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.FLOWCHART,
    sourceAnchorId: dBottom.id,
    targetAnchorId: cRight.id,
    stroke: randomColor(),
    strokeWidth: 2,
  });
}

// ==================== 连续锚点示例（节点无可见锚点） ====================
// 连续锚点示例使用 chart.addNode（不生成锚点）
const nodeCont1 = chart.addNode({
  x: 700,
  y: 500,
  width: 130,
  height: 80,
  label: "连续源",
  shape: NodeShape.RECTANGLE,
});
chart.addAnchor({
  nodeId: nodeCont1.id,
  type: AnchorType.PERIMETER,
  direction: 'output',
  radius: 6,
});

const nodeCont2 = chart.addNode({
  x: 900,
  y: 520,
  width: 130,
  height: 80,
  label: "连续目标",
  shape: NodeShape.RECTANGLE,
});
chart.addAnchor({
  nodeId: nodeCont2.id,
  type: AnchorType.PERIMETER,
  direction: 'input',
  radius: 6,
});


store.addConnection({
  id: crypto.randomUUID(),
  connectorType: ConnectorType.FLOWCHART,
  sourceNodeId: nodeCont1.id,
  targetNodeId: nodeCont2.id,
  stroke: randomColor(),
  strokeWidth: 2,
  label: {
    text: "连续锚点",
    fontSize: 12,
    color: "#333",
    offset: { x: 0, y: -12 },
  },
  arrow: {
    direction: ArrowDirection.TARGET,
    length: 12,
  },
});

// ==================== 控制台提示 ====================
console.log("✅ 自研SVG流程图引擎初始化完成（默认样式 + 随机连线颜色）");
console.log("📌 操作说明：");
console.log("  空格 + 左键拖动：平移画布");
console.log("  滚轮：缩放");
console.log("  左键拖拽节点：移动");
console.log("  从锚点拖拽：创建连线（拖到其他锚点释放）");
console.log("  Delete/Backspace：删除选中元素");
console.log("  ESC：取消拖拽");
console.log("📦 全局对象 chart 已挂载，可调用 API");

// ==================== UI 按钮事件绑定 ====================
document.getElementById("addNodeBtn")?.addEventListener("click", () => {
  const shapes = [NodeShape.RECTANGLE, NodeShape.CIRCLE, NodeShape.DIAMOND, NodeShape.ELLIPSE];
  const randShape = shapes[Math.floor(Math.random() * shapes.length)];
  const randX = 50 + Math.random() * 500;
  const randY = 50 + Math.random() * 400;
  store.addNodeWithAnchors({
    x: randX,
    y: randY,
    width: 120 + Math.random() * 60,
    height: 70 + Math.random() * 40,
    label: `节点${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    shape: randShape,
    // 不指定 fill/stroke，使用默认样式
  });
});

// 缩放控制
document.getElementById("zoomInBtn")?.addEventListener("click", () => chart.zoomIn());
document.getElementById("zoomOutBtn")?.addEventListener("click", () => chart.zoomOut());
document.getElementById("resetViewBtn")?.addEventListener("click", () => chart.resetView());
document.getElementById("fitViewBtn")?.addEventListener("click", () => chart.fitToView(30));

// 导出数据
document.getElementById("exportBtn")?.addEventListener("click", () => {
  const data = chart.exportData();
  console.log("📤 导出数据：", data);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flowchart-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

// 导入数据
document.getElementById("importBtn")?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        chart.importData(data);
        console.log("📥 数据导入成功");
      } catch (err) {
        console.error("导入失败：", err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

// 清空所有
document.getElementById("clearAllBtn")?.addEventListener("click", () => {
  if (confirm("确定清空所有节点和连线吗？")) {
    const nodes = store.getAllNodes();
    for (const node of nodes) {
      store.removeNode(node.id);
    }
  }
});