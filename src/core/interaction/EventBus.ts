// src/core/interaction/EventBus.ts

import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { DragManager } from './DragManager';
import type { Point } from '../../types/geometry';
import type { Anchor, Node } from '../../types/SvgModel';

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
    if (e.button !== 0) return;
    if (this.chart.viewport.isSpaceActive()) return;

    const target = e.target as SVGElement;
    // 1. 检测连线（点击选中）
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
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 2. 检测普通锚点（圆圈）
    if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) {
      const anchorId = target.getAttribute('data-anchor-id')!;
      const anchor = this.store.getAnchor(anchorId);
      if (anchor) {
        this.dragManager.startLinkDrag(anchor, e);
        e.stopPropagation();
        e.preventDefault();
        return;
      }
    }

    // 3. 检测节点
    let nodeId: string | undefined;
    el = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute('data-node-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }

    if (!nodeId) {
      // 点击空白 -> 清空选中
      this.selection.clear();
      return;
    }

    // 4. 无连续锚点，直接启动节点拖拽
    this.dragManager.startNodeDrag(e);
    e.stopPropagation();
    e.preventDefault();
  }

  private onClick(e: MouseEvent) {
    /* 保留，目前无操作 */
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault();
    this.isMenuVisible = true;
    this.chart.contextMenu.show(e);
  }

  private hideMenu(e: MouseEvent) {
    if (!this.isMenuVisible) return;
    const target = e.target as HTMLElement;
    if (target.closest && target.closest('.context-menu')) return;
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
