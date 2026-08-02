import { SvgFlowChart } from "./core/SvgFlowChart";
const appDom = document.getElementById("canvas-container")!;
const chart = new SvgFlowChart(appDom);
// 挂载到全局window，控制台可直接访问
(window as any).chart = chart;
const { store } = chart;

// ============ 测试数据初始化（统一使用addNodeWithAnchors自动生成四向锚端点） ============
const node1 = store.addNodeWithAnchors({
  x: 80,
  y: 80,
  width: 150,
  height: 90,
  label: "节点A"
});
const node2 = store.addNodeWithAnchors({
  x: 450,
  y: 80,
  width: 150,
  height: 90,
  label: "节点B"
});
const node3 = store.addNodeWithAnchors({
  x: 150,
  y: 80,
  width: 160,
  height: 100,
  label: "节点C"
});

// 自动取节点A右锚、节点B左锚创建连线
const allAps = store.getAllAnchorPoints();
const aRight = allAps.find(ap => ap.nodeId === node1.id && ap.staticType === "Right");
const bLeft = allAps.find(ap => ap.nodeId === node2.id && ap.staticType === "Left");
if (aRight && bLeft) {
  store.addConnection({
    id: crypto.randomUUID(),
    connectorType: "flowchart",
    sourceAnchorId: aRight.id,
    targetAnchorId: bLeft.id,
    stroke: "#333",
    strokeWidth: 2
  });
}


console.log("✅ 自研SVG流程图引擎初始化完成");
console.log("操作说明：");
console.log("  空格 + 左键拖动：平移画布");
console.log("  滚轮：缩放");
console.log("  左键拖拽节点：移动");
console.log("  Delete：删除选中元素");

// 新增节点按钮同步替换为自动生成锚端点
const addBtn = document.getElementById("addNodeBtn");
addBtn?.addEventListener("click", () => {
  const randX = 60 + Math.random() * 200;
  const randY = 60 + Math.random() * 220;
  chart.store.addNodeWithAnchors({
    x: randX,
    y: randY,
    width: 140,
    height: 80,
    label: `新节点`
  });
});