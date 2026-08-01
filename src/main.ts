import { FlowChart } from "./core/FlowChart";
import { uuidv4 } from "./utils/uuid";
import type { AnchorPoint, FlowConnection } from "./types/flow-model";

const appDom = document.getElementById("app")!;
const chart = new FlowChart(appDom);
const { store } = chart;

// ============ 测试数据初始化 ============
const node1Id = uuidv4();
const node2Id = uuidv4();
const node3Id = uuidv4();

store.addNode({
  id: node1Id,
  x: 80,
  y: 80,
  width: 150,
  height: 90,
  label: "节点A"
});
store.addNode({
  id: node2Id,
  x: 450,
  y: 80,
  width: 150,
  height: 90,
  label: "节点B"
});
store.addNode({
  id: node3Id,
  x: 150,
  y: 80,
  width: 160,
  height: 100,
  label: "节点C"
});

// 创建锚点
const apOut: AnchorPoint = {
  id: uuidv4(),
  nodeId: node1Id,
  anchorMode: "static",
  staticType: "Right",
  direction: "output",
  radius: 6
};
const apIn: AnchorPoint = {
  id: uuidv4(),
  nodeId: node2Id,
  anchorMode: "static",
  staticType: "Left",
  direction: "input",
  radius: 6
};
store.addAnchorPoint(apOut);
store.addAnchorPoint(apIn);

// 创建连线
const connAnchor: FlowConnection = {
  id: uuidv4(),
  connectorType: "flowchart",
  sourceAnchorId: apOut.id,
  targetAnchorId: apIn.id,
  stroke: "#333",
  strokeWidth: 2
};
store.addConnection(connAnchor);

console.log("✅ 自研SVG流程图引擎初始化完成");
console.log("操作说明：");
console.log("  空格 + 左键拖动：平移画布");
console.log("  滚轮：缩放");
console.log("  左键拖拽节点：移动");
console.log("  Delete：删除选中元素");

// 新增节点按钮逻辑
const addBtn = document.getElementById("addNodeBtn");
addBtn?.addEventListener("click", () => {
  const newId = uuidv4();
  const randX = 60 + Math.random() * 200;
  const randY = 60 + Math.random() * 220;
  chart.store.addNode({
    id: newId,
    x: randX,
    y: randY,
    width: 140,
    height: 80,
    label: `新节点`
  });
});