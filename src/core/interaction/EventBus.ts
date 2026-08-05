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
    const target = e.target as SVGElement;

    // 检测锚点
    if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) {
      const anchorId = target.getAttribute('data-anchor-id')!;
      const anchor = this.store.getAnchor(anchorId);
      if (anchor) {
        // 启动拖拽，但不阻止事件冒泡（允许 click 事件触发）
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
      this.dragManager.startNodeDrag(e);
      return;
    }

    // 点击空白区域清空选中
    if (target === this.chart.getSvgRoot() || target.tagName === 'svg') {
      this.selection.clear();
    }
  }

  private onClick(e: MouseEvent) {
    const target = e.target as SVGElement;
    console.log('click event fired');
    if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) {
      const anchorId = target.getAttribute('data-anchor-id')!;
      const anchor = this.store.getAnchor(anchorId);
      if (anchor) {
        const node = this.store.getNode(anchor.nodeId);
        console.log('🔍 点击锚点:', {
          id: anchor.id,
          nodeId: anchor.nodeId,
          nodeLabel: node?.label || '未知',
          position: anchor.position,
          direction: anchor.direction,
          type: anchor.type,
          radius: anchor.radius,
          fill: anchor.fill,
          stroke: anchor.stroke,
          connections: this.store
            .getAllConnections()
            .filter(c => c.sourceAnchorId === anchor.id || c.targetAnchorId === anchor.id)
            .map(c => c.id),
        });
      }
    }
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
