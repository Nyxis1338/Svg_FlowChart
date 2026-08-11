// src/main.ts

import { SvgEngine } from './core/SvgEngine';
import { NodeShape } from './types/SvgModel';
import { ConnectorColors } from './styles/defaults';

// 工具函数
function randomColor(): string {
  return ConnectorColors[Math.floor(Math.random() * ConnectorColors.length)];
}

function getAnchor(store: any, nodeId: string, position: string, direction: 'output' | 'input' | 'both') {
  const nodeAnchors = store.getNodeAnchors(nodeId);
  return nodeAnchors.find(
    (ap: any) => ap.position === position && (ap.direction === direction || ap.direction === 'both')
  );
}

function addDefaultAnchors(chart: SvgEngine, nodeId: string): void {
  const store = chart.store;
  const oldAnchors = store.getNodeAnchors(nodeId);
  for (const a of oldAnchors) {
    store.removeAnchor(a.id);
  }

  // 使用字符串字面量，不再需要 type 字段
  chart.addAnchor({
    nodeId,
    position: 'top',
    direction: 'output',
    radius: 5,
    fill: '#ffffff',
    stroke: '#5470c6',
  });
  chart.addAnchor({
    nodeId,
    position: 'right',
    direction: 'output',
    radius: 5,
    fill: '#ffffff',
    stroke: '#5470c6',
  });

  chart.addAnchor({
    nodeId,
    position: 'bottom',
    direction: 'input',
    radius: 5,
    fill: '#e8f5e9',
    stroke: '#43a047',
  });
  chart.addAnchor({
    nodeId,
    position: 'left',
    direction: 'input',
    radius: 5,
    fill: '#e8f5e9',
    stroke: '#43a047',
  });
}

function safeAddConnection(store: any, sourceAnchor: any, targetAnchor: any, props: any) {
  if (!sourceAnchor || !targetAnchor) {
    console.warn('跳过连线：缺少源锚点或目标锚点', { sourceAnchor, targetAnchor });
    return;
  }
  store.addConnection({
    id: crypto.randomUUID(),
    sourceAnchorId: sourceAnchor.id,
    targetAnchorId: targetAnchor.id,
    ...props,
  });
}

// ==================== 初始化画布 ====================
const appDom = document.getElementById('canvas-container')!;
const chart = new SvgEngine(appDom);
(window as any).chart = chart;
const store = chart.store;

// ==================== 创建节点 ====================
const nodeA = chart.addNode({
  x: 80,
  y: 80,
  width: 150,
  height: 90,
  label: '矩形A',
  shape: 'rectangle',
});
(window as any).nodeA = nodeA;
addDefaultAnchors(chart, nodeA.id);

const nodeB = chart.addNode({
  x: 450,
  y: 80,
  width: 120,
  height: 120,
  label: '圆形B',
  shape: 'circle',
});
(window as any).nodeB = nodeB;
addDefaultAnchors(chart, nodeB.id);

const nodeC = chart.addNode({
  x: 250,
  y: 300,
  width: 140,
  height: 100,
  label: '菱形C',
  shape: 'diamond',
});
(window as any).nodeC = nodeC;
addDefaultAnchors(chart, nodeC.id);

const nodeD = chart.addNode({
  x: 550,
  y: 300,
  width: 160,
  height: 100,
  label: '椭圆D',
  shape: 'ellipse',
});
(window as any).nodeD = nodeD;
addDefaultAnchors(chart, nodeD.id);

// ==================== 创建连线 ====================
const aRightOut = getAnchor(store, nodeA.id, 'right', 'output');
const bLeftIn = getAnchor(store, nodeB.id, 'left', 'input');
safeAddConnection(store, aRightOut, bLeftIn, {
  connectorType: 'flowchart',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '折线', fontSize: 12, color: '#333', offset: { x: 0, y: -12 } },
  arrow: { direction: 'target', length: 12 },
});

const aTopOut = getAnchor(store, nodeA.id, 'top', 'output');
const cLeftIn = getAnchor(store, nodeC.id, 'left', 'input');
safeAddConnection(store, aTopOut, cLeftIn, {
  connectorType: 'straight',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '直线', fontSize: 12, color: '#333', offset: { x: 20, y: 0 } },
  arrow: { direction: 'target', length: 12 },
});

const bRightOut = getAnchor(store, nodeB.id, 'right', 'output');
const dLeftIn = getAnchor(store, nodeD.id, 'left', 'input');
safeAddConnection(store, bRightOut, dLeftIn, {
  connectorType: 'bezier',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '贝塞尔', fontSize: 12, color: '#333', offset: { x: 0, y: -15 } },
  arrow: { direction: 'both', length: 12 },
});

const dTopOut = getAnchor(store, nodeD.id, 'top', 'output');
const cBottomIn = getAnchor(store, nodeC.id, 'bottom', 'input');
safeAddConnection(store, dTopOut, cBottomIn, {
  connectorType: 'flowchart',
  stroke: randomColor(),
  strokeWidth: 2,
});

// 其余代码（锚点点击监听、调试日志、UI按钮等）保持不变，只需确保没有枚举引用。

// ==================== 锚点点击监听（调试用） ====================
chart.svgRoot.addEventListener('click', e => {
  const target = e.target as SVGElement;
  if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) {
    const anchorId = target.getAttribute('data-anchor-id')!;
    const anchor = store.getAnchor(anchorId);
    if (anchor) {
      const node = store.getNode(anchor.nodeId);
      console.log('🔍 点击锚点:', {
        id: anchor.id,
        nodeId: anchor.nodeId,
        nodeLabel: node?.label || '未知',
        position: anchor.position,
        direction: anchor.direction,
        radius: anchor.radius,
        fill: anchor.fill,
        stroke: anchor.stroke,
        connections: store
          .getAllConnections()
          .filter(c => c.sourceAnchorId === anchor.id || c.targetAnchorId === anchor.id)
          .map(c => c.id),
      });
    } else {
      console.warn('⚠️ 未找到锚点:', anchorId);
    }
  }
});

// ==================== 调试日志 ====================

console.log('✅ 初始化完成，验证锚点方向：');
const allAnchors = store.getAllAnchors();
allAnchors.forEach((a: any) => {
  console.log(`  ${a.nodeId} ${a.position} -> ${a.direction}`);
});
console.log('验证连线方向：');
const conns = store.getAllConnections();
conns.forEach((c: any) => {
  const src = store.getAnchor(c.sourceAnchorId);
  const tgt = store.getAnchor(c.targetAnchorId);
  console.log(
    `  连线 ${c.id}: ${src?.nodeId} ${src?.position}(${src?.direction}) → ${tgt?.nodeId} ${tgt?.position}(${tgt?.direction})`
  );
});

console.log('📌 操作说明：');
console.log('  空格 + 左键拖动：平移画布');
console.log('  滚轮：缩放');
console.log('  左键拖拽节点：移动');
console.log('  从锚点拖拽：创建连线 / 重连已有连线');
console.log('  Delete/Backspace：删除选中元素');
console.log('  ESC：取消拖拽');
console.log('📦 全局对象 chart, nodeA, nodeB, nodeC, nodeD 已挂载，可调试');
console.log('💡 点击任意锚点，控制台将输出其详细信息');

// ==================== UI 按钮 ====================

document.getElementById('addNodeBtn')?.addEventListener('click', () => {
  const shapes: NodeShape[] = ['rectangle', 'circle', 'diamond', 'ellipse'];
  const randShape = shapes[Math.floor(Math.random() * shapes.length)];
  const randX = 50 + Math.random() * 600;
  const randY = 50 + Math.random() * 400;
  const node = chart.addNode({
    x: randX,
    y: randY,
    width: 120 + Math.random() * 60,
    height: 70 + Math.random() * 40,
    label: `节点${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    shape: randShape,
  });
  addDefaultAnchors(chart, node.id);
});

document.getElementById('zoomInBtn')?.addEventListener('click', () => chart.zoomIn());
document.getElementById('zoomOutBtn')?.addEventListener('click', () => chart.zoomOut());
document.getElementById('resetViewBtn')?.addEventListener('click', () => chart.resetView());
document.getElementById('fitViewBtn')?.addEventListener('click', () => chart.fitToView(30));

document.getElementById('exportBtn')?.addEventListener('click', () => {
  const data = chart.exportData();
  console.log('📤 导出数据：', data);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flowchart-data.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn')?.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        chart.importData(data);
        console.log('📥 数据导入成功');
      } catch (err) {
        console.error('导入失败：', err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

document.getElementById('clearAllBtn')?.addEventListener('click', () => {
  if (!confirm('确定清空所有节点和连线吗？')) return;
  const nodes = store.getAllNodes();
  for (const node of nodes) {
    store.removeNode(node.id);
  }
});
