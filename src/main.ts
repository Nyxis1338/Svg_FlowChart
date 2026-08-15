// src/main.ts

import { SvgEngine } from './core/SvgEngine';
import { ConnectorColors } from './utils/colors';
import { NodeShape } from './types/SvgModel';
import { describe } from 'node:test';

function randomColor(): string {
  return ConnectorColors[Math.floor(Math.random() * ConnectorColors.length)];
}

function getAnchor(SE: SvgEngine, nodeId: string, position: string) {
  const anchors = SE.getNodeAnchors(nodeId);
  return anchors.find((a: any) => a.position === position);
}

function addDefaultAnchors(SE: SvgEngine, nodeId: string): void {
  // 先删除旧锚点（通常新节点没有）
  const oldAnchors = SE.getNodeAnchors(nodeId);
  for (const a of oldAnchors) {
    SE.removeAnchor(a.id);
  }

  SE.addAnchor({ nodeId, position: 'top', radius: 5 });
  SE.addAnchor({ nodeId, position: 'right', radius: 5 });
  SE.addAnchor({ nodeId, position: 'bottom', radius: 5 });
  SE.addAnchor({ nodeId, position: 'left', radius: 5 });
}

function safeAddConnection(SE: SvgEngine, sourceAnchor: any, targetAnchor: any, props: any) {
  if (!sourceAnchor || !targetAnchor) {
    console.warn('跳过连线：缺少源锚点或目标锚点', { sourceAnchor, targetAnchor });
    return null;
  }
  // 通过 SE.addConnection 添加，自动生成 ID
  const conn = SE.addConnection({
    sourceAnchorId: sourceAnchor.id,
    targetAnchorId: targetAnchor.id,
    ...props,
  });
  return conn;
}

// ==================== 初始化 ====================
const appDom = document.getElementById('canvas-container')!;
const SE = new SvgEngine(appDom);
(window as any).SE = SE;

// ==================== 创建节点 ====================
const nodeA = SE.addNode({
  x: 80,
  y: 80,
  width: 150,
  height: 90,
  label: '矩形A',
  shape: 'rectangle',
  description: '这是流程的起始节点，点击可测试',
});
(window as any).nodeA = nodeA;
addDefaultAnchors(SE, nodeA.id);

const nodeB = SE.addNode({
  x: 450,
  y: 80,
  width: 120,
  height: 120,
  label: '圆形B',
  shape: 'circle',
});
(window as any).nodeB = nodeB;
addDefaultAnchors(SE, nodeB.id);

const nodeC = SE.addNode({
  x: 250,
  y: 300,
  width: 140,
  height: 100,
  label: '菱形C',
  shape: 'diamond',
});
(window as any).nodeC = nodeC;
addDefaultAnchors(SE, nodeC.id);

const nodeD = SE.addNode({
  x: 550,
  y: 300,
  width: 160,
  height: 100,
  label: '椭圆D',
  shape: 'ellipse',
});
(window as any).nodeD = nodeD;
addDefaultAnchors(SE, nodeD.id);

// ==================== 创建连线 ====================
const aRightOut = getAnchor(SE, nodeA.id, 'right');
const bLeftIn = getAnchor(SE, nodeB.id, 'left');
(window as any).conn1 = safeAddConnection(SE, aRightOut, bLeftIn, {
  connectorType: 'flowchart',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '折线', fontSize: 12, color: '#333', offset: { x: 0, y: -12 } },
  arrow: { direction: 'target', length: 12 },
});

const aTopOut = getAnchor(SE, nodeA.id, 'top');
const cLeftIn = getAnchor(SE, nodeC.id, 'left');
(window as any).conn2 = safeAddConnection(SE, aTopOut, cLeftIn, {
  connectorType: 'straight',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '直线', fontSize: 12, color: '#333', offset: { x: 20, y: 0 } },
  arrow: { direction: 'target', length: 12 },
});

const bRightOut = getAnchor(SE, nodeB.id, 'right');
const dLeftIn = getAnchor(SE, nodeD.id, 'left');
(window as any).conn3 = safeAddConnection(SE, bRightOut, dLeftIn, {
  connectorType: 'bezier',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '贝塞尔', fontSize: 12, color: '#333', offset: { x: 0, y: -15 } },
  arrow: { direction: 'both', length: 12 },
});

const dTopOut = getAnchor(SE, nodeD.id, 'top');
const cBottomIn = getAnchor(SE, nodeC.id, 'bottom');
(window as any).conn4 = safeAddConnection(SE, dTopOut, cBottomIn, {
  connectorType: 'flowchart',
  stroke: randomColor(),
  strokeWidth: 2,
  label: { text: '折线', fontSize: 12, color: '#333' },
  description: '又一个折线',
});

// ==================== UI 按钮 ====================
document.getElementById('addNodeBtn')?.addEventListener('click', () => {
  const shapes: NodeShape[] = ['rectangle', 'circle', 'diamond', 'ellipse'];
  const randShape = shapes[Math.floor(Math.random() * shapes.length)];
  const randX = 50 + Math.random() * 600;
  const randY = 50 + Math.random() * 400;
  const node = SE.addNode({
    x: randX,
    y: randY,
    width: 120 + Math.random() * 60,
    height: 70 + Math.random() * 40,
    label: `节点${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    shape: randShape,
  });
  addDefaultAnchors(SE, node.id);
});

document.getElementById('zoomInBtn')?.addEventListener('click', () => SE.zoomIn());
document.getElementById('zoomOutBtn')?.addEventListener('click', () => SE.zoomOut());
document.getElementById('resetViewBtn')?.addEventListener('click', () => SE.resetView());
document.getElementById('fitViewBtn')?.addEventListener('click', () => SE.fitToView(30));

document.getElementById('exportBtn')?.addEventListener('click', () => {
  const data = SE.exportData();
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
        SE.importData(data);
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
  const nodes = SE.getAllNodes();
  for (const node of nodes) {
    SE.removeNode(node.id);
  }
});

console.log('✅ 初始化完成');
console.log('📦 全局对象 SE, nodeA, nodeB, nodeC, nodeD, conn1-conn4 已挂载');
