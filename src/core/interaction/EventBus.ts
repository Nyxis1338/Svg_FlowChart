// src/core/interaction/EventBus.ts

import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { DragManager } from './DragManager';

export class EventBus {
  private chart: SvgEngine;
  private store: Store;
  private selection: SelectionManager;
  private dragManager: DragManager;

  private isMenuVisible: boolean = false;

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.store = chart.store;
    this.selection = chart.selection;
    this.dragManager = chart.dragManager;

    this.bindEvents();
  }

  private bindEvents() {
    const svg = this.chart.getSvgRoot();
    svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    svg.addEventListener('click', this.onClick.bind(this));
    svg.addEventListener('contextmenu', this.onContextMenu.bind(this));
    document.addEventListener('mousedown', this.hideMenu.bind(this));
  }

  private onMouseDown(e: MouseEvent) {
    const screenX = e.clientX;
    const screenY = e.clientY;
    const canvasPos = this.chart.viewport.screenToCanvas({ x: screenX, y: screenY });
    console.log(
      `🖱️ mousedown: screen(${screenX}, ${screenY}) -> canvas(${canvasPos.x.toFixed(1)}, ${canvasPos.y.toFixed(1)})`
    );

    const target = e.target as SVGElement;

    if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) {
      const anchorId = target.getAttribute('data-anchor-id')!;
      const anchor = this.store.getAnchor(anchorId);
      if (anchor) {
        const node = this.store.getNode(anchor.nodeId);
        console.log(`⚓ 点击锚点 (mousedown): ${anchorId}`);
        if (node) {
          console.log(
            `  节点: ${node.label || '未命名'} 坐标: (${node.x}, ${node.y}) 尺寸: ${node.width}x${node.height}`
          );
          console.log(`  方向: ${anchor.direction}`); // 新增
          const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
          console.log(`  锚点逻辑位置 (calcAnchorPosForNode): (${anchorPos.x.toFixed(1)}, ${anchorPos.y.toFixed(1)})`);
          // 手动计算锚点位置
          if (anchor.type === 'static' && anchor.position) {
            const manualPos = this.calcManualAnchorPos(node, anchor.position);
            // console.log(`  手动计算锚点位置: (${manualPos.x.toFixed(1)}, ${manualPos.y.toFixed(1)})`);
          }
          // console.log(`  鼠标画布位置: (${canvasPos.x.toFixed(1)}, ${canvasPos.y.toFixed(1)})`);
          // console.log(
          //   `  偏差: dx=${(canvasPos.x - anchorPos.x).toFixed(1)}, dy=${(canvasPos.y - anchorPos.y).toFixed(1)}`
          // );

          // 获取实际 DOM 元素的 cx/cy
          const circle = target as SVGCircleElement;
          const actualCx = circle.getAttribute('cx');
          const actualCy = circle.getAttribute('cy');
          console.log(`  🔍 实际 DOM cx/cy: (${actualCx}, ${actualCy})`);
        }
        this.dragManager.startLinkDrag(anchor, e);
        return;
      }
    }

    // 检测连线
    let connId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !connId) {
      connId = el.getAttribute('data-connection-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }
    if (connId) {
      console.log(`🔗 选中连线: ${connId}`);
      this.selection.select('connection', connId);
      return;
    }

    // 检测节点
    let nodeId: string | undefined;
    let nodeEl: SVGElement | null = target;
    while (nodeEl && !nodeId) {
      nodeId = nodeEl.getAttribute('data-node-id') ?? undefined;
      const parent = nodeEl.parentElement;
      if (!parent) break;
      nodeEl = parent as unknown as SVGElement;
    }
    if (nodeId) {
      console.log(`📦 点击节点: ${nodeId}`);
      this.dragManager.startNodeDrag(e);
      return;
    }

    // 点击空白区域
    if (target === this.chart.getSvgRoot() || target.tagName === 'svg') {
      console.log('⬜ 点击空白区域，清空选中');
      this.selection.clear();
    }
  }

  // 手动计算锚点位置（用于对比）
  private calcManualAnchorPos(node: any, position: string): { x: number; y: number } {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    switch (position) {
      case 'top':
        return { x: cx, y: node.y };
      case 'right':
        return { x: node.x + node.width, y: cy };
      case 'bottom':
        return { x: cx, y: node.y + node.height };
      case 'left':
        return { x: node.x, y: cy };
      default:
        return { x: cx, y: cy };
    }
  }

  private onClick(e: MouseEvent) {
    // 保留原逻辑，但不做操作
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault();
    this.isMenuVisible = true;
    this.chart.contextMenu.show(e);
  }

  private hideMenu(e: MouseEvent) {
    if (!this.isMenuVisible) return;
    const target = e.target as HTMLElement;
    if (target.closest && target.closest('.context-menu')) {
      return;
    }
    this.isMenuVisible = false;
    this.chart.contextMenu.hide();
  }

  destroy() {
    const svg = this.chart.getSvgRoot();
    svg.removeEventListener('mousedown', this.onMouseDown.bind(this));
    svg.removeEventListener('click', this.onClick.bind(this));
    svg.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    document.removeEventListener('mousedown', this.hideMenu.bind(this));
  }
}
