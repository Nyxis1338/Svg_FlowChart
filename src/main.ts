import { SvgEngine } from "./core/SvgEngine";
import { NodeShape, ArrowDirection, ConnectorType } from "./types/SvgModel";

// ==================== 初始化画布 ====================
const appDom = document.getElementById("canvas-container")!;
const chart = new SvgEngine(appDom);
(window as any).chart = chart; // 挂载到全局，方便控制台调试
const store = chart.store;

// ==================== 测试数据：创建多个节点 ====================
// 1. 矩形节点（默认）
const nodeA = store.addNodeWithAnchors({
  x: 80,
  y: 80,
  width: 150,
  height: 90,
  label: "矩形A",
  shape: NodeShape.RECTANGLE,
  fill: "#e3f2fd",
  stroke: "#1976d2",
});

// 2. 圆形节点
const nodeB = store.addNodeWithAnchors({
  x: 450,
  y: 80,
  width: 120,
  height: 120,
  label: "圆形B",
  shape: NodeShape.CIRCLE,
  fill: "#fce4ec",
  stroke: "#c62828",
});

// 3. 菱形节点
const nodeC = store.addNodeWithAnchors({
  x: 250,
  y: 300,
  width: 140,
  height: 100,
  label: "菱形C",
  shape: NodeShape.DIAMOND,
  fill: "#e8f5e9",
  stroke: "#2e7d32",
});

// 4. 椭圆节点
const nodeD = store.addNodeWithAnchors({
  x: 550,
  y: 300,
  width: 160,
  height: 100,
  label: "椭圆D",
  shape: NodeShape.ELLIPSE,
  fill: "#fff3e0",
  stroke: "#e65100",
});

// ==================== 创建连线（测试多种类型 + 标签/箭头） ====================
const allAnchors = store.getAllAnchors();

// 辅助：根据节点ID和方向获取锚点
function getAnchor(nodeId: string, staticType: "Top" | "Right" | "Bottom" | "Left") {
  return allAnchors.find(ap => ap.nodeId === nodeId && ap.staticType === staticType);
}

// 1. A右 → B左（流程图折线，带标签，带目标箭头）
const aRight = getAnchor(nodeA.id, "Right");
const bLeft = getAnchor(nodeB.id, "Left");
if (aRight && bLeft) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.FLOWCHART,
    sourceAnchorId: aRight.id,
    targetAnchorId: bLeft.id,
    stroke: "#333",
    strokeWidth: 2,
    label: {
      text: "折线",
      fontSize: 12,
      color: "#d32f2f",
      offset: { x: 0, y: -12 },
    },
    arrow: {
      direction: ArrowDirection.TARGET,
      length: 10,
      width: 8,
      color: "#333",
    },
  });
}

// 2. A下 → C上（直线，带源箭头和标签）
const aBottom = getAnchor(nodeA.id, "Bottom");
const cTop = getAnchor(nodeC.id, "Top");
if (aBottom && cTop) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.STRAIGHT,
    sourceAnchorId: aBottom.id,
    targetAnchorId: cTop.id,
    stroke: "#2e7d32",
    strokeWidth: 2,
    label: {
      text: "直线",
      fontSize: 12,
      color: "#2e7d32",
      offset: { x: 20, y: 0 },
    },
    arrow: {
      direction: ArrowDirection.SOURCE,
      length: 10,
      width: 8,
      color: "#2e7d32",
    },
  });
}

// 3. B右 → D左（贝塞尔曲线，两端箭头，带标签）
const bRight = getAnchor(nodeB.id, "Right");
const dLeft = getAnchor(nodeD.id, "Left");
if (bRight && dLeft) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.BEZIER,
    sourceAnchorId: bRight.id,
    targetAnchorId: dLeft.id,
    stroke: "#6a1b9a",
    strokeWidth: 2,
    label: {
      text: "贝塞尔",
      fontSize: 12,
      color: "#6a1b9a",
      offset: { x: 0, y: -15 },
    },
    arrow: {
      direction: ArrowDirection.BOTH,
      length: 10,
      width: 8,
      color: "#6a1b9a",
    },
  });
}

// 4. D下 → C右（流程图折线，无标签，无箭头）
const dBottom = getAnchor(nodeD.id, "Bottom");
const cRight = getAnchor(nodeC.id, "Right");
if (dBottom && cRight) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: ConnectorType.FLOWCHART,
    sourceAnchorId: dBottom.id,
    targetAnchorId: cRight.id,
    stroke: "#f57c00",
    strokeWidth: 2,
  });
}

// ==================== 控制台提示 ====================
console.log("✅ 自研SVG流程图引擎初始化完成");
console.log("📌 操作说明：");
console.log("  空格 + 左键拖动：平移画布");
console.log("  滚轮：缩放");
console.log("  左键拖拽节点：移动");
console.log("  从锚点拖拽：创建连线（拖到其他锚点释放）");
console.log("  Delete/Backspace：删除选中元素");
console.log("  ESC：取消拖拽");
console.log("📦 全局对象 chart 已挂载，可调用 API：");
console.log("  chart.zoomIn() / zoomOut() / resetView() / fitToView()");
console.log("  chart.exportData() / importData(data)");
console.log("  chart.addNode(...) / addConnection(...)");
console.log("  chart.getAllNodes() / getAllConnections() / getAllAnchors()");
console.log("  chart.destroy()");

// ==================== UI 按钮事件绑定 ====================
// 新增节点（随机位置，形状随机）
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
    fill: `hsl(${Math.random() * 360}, 70%, 90%)`,
    stroke: `hsl(${Math.random() * 360}, 80%, 50%)`,
  });
});

// 缩放控制
document.getElementById("zoomInBtn")?.addEventListener("click", () => chart.zoomIn());
document.getElementById("zoomOutBtn")?.addEventListener("click", () => chart.zoomOut());
document.getElementById("resetViewBtn")?.addEventListener("click", () => chart.resetView());
document.getElementById("fitViewBtn")?.addEventListener("click", () => chart.fitToView(30));

// 导出数据（控制台打印）
document.getElementById("exportBtn")?.addEventListener("click", () => {
  const data = chart.exportData();
  console.log("📤 导出数据：", data);
  // 同时下载为JSON文件
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flowchart-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

// 导入数据（从文件选择）
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

// 清空所有（确认后）
document.getElementById("clearAllBtn")?.addEventListener("click", () => {
  if (confirm("确定清空所有节点和连线吗？")) {
    // 由于没有直接清空API，逐个删除节点（会级联删除连线和锚点）
    const nodes = store.getAllNodes();
    for (const node of nodes) {
      store.removeNode(node.id);
    }
  }
});

// ===== 连续锚点示例 =====
// 创建两个新节点
const nodeCont1 = store.addNodeWithAnchors({
  x: 700,
  y: 500,
  width: 130,
  height: 80,
  label: "连续源",
  shape: NodeShape.RECTANGLE,
  fill: "#f3e5f5",
  stroke: "#7b1fa2",
});

const nodeCont2 = store.addNodeWithAnchors({
  x: 900,
  y: 520,
  width: 130,
  height: 80,
  label: "连续目标",
  shape: NodeShape.RECTANGLE,
  fill: "#e8f5e9",
  stroke: "#388e3c",
});

// 使用节点直连模式（不指定锚点ID）
store.addConnection({
  id: crypto.randomUUID(),
  connectorType: ConnectorType.FLOWCHART,   // 或其他类型
  sourceNodeId: nodeCont1.id,
  targetNodeId: nodeCont2.id,
  stroke: "#d32f2f",
  strokeWidth: 2,
  label: {
    text: "连续锚点",
    fontSize: 12,
    color: "#d32f2f",
    offset: { x: 0, y: -12 },
  },
  arrow: {
    direction: ArrowDirection.TARGET,
    length: 10,
    width: 8,
    color: "#d32f2f",
  },
});

console.log("✅ 连续锚点示例已添加（不可见锚点，自动计算端点）");