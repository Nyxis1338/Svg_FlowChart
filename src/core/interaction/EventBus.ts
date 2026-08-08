// src/core/interaction/EventBus.ts

import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { DragManager } from './DragManager';
import type { Point } from '../../types/geometry';
import { AnchorType } from '../../types/SvgModel';
import type { Anchor, Node } from '../../types/SvgModel';

export class EventBus {
  private chart: SvgEngine;
  private store: Store;
  private selection: SelectionManager;
  private dragManager: DragManager;

  private isMenuVisible: boolean = false;
  private isDragging: boolean = false;

  // 用于判断点击还是拖拽
  private mouseDownPos: Point | null = null;

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.store = chart.store;
    this.selection = chart.selection;
    this.dragManager = chart.dragManager;

    this.bindEvents();
  }

  private bindEvents() {
    const svg = this.chart.getSvgRoot();

    // 鼠标事件
    svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    // 右键菜单
    svg.addEventListener('contextmenu', this.onContextMenu.bind(this));
    document.addEventListener('mousedown', this.hideMenu.bind(this));

    // 键盘事件（保留在 DragManager 中，因为它处理删除等业务逻辑）
    // 但不重新绑定，由 DragManager 自行管理
  }

  // ==================== 鼠标事件 ====================

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    if (this.chart.viewport.isSpaceActive()) return;

    const target = e.target as SVGElement;
    const canvasPos = this.chart.viewport.screenToCanvas({ x: e.clientX, y: e.clientY });

    // ---------- 1. 检测小圆点（连续锚点标识） ----------
    const indicator = target.closest('[data-continuous-indicator="true"]');
    if (indicator) {
      this.dragManager.startNodeDrag(e);
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // ---------- 2. 检测连线（点击选中） ----------
    let connId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !connId) {
      connId = el.getAttribute('data-connection-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }
    if (connId) {
      // 选中连线
      this.selection.select('connection', connId);
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // ---------- 3. 检测普通锚点（圆圈） ----------
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

    // ---------- 4. 检测节点 ----------
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

    const node = this.store.getNode(nodeId);
    if (!node) return;

    // ---------- 5. 判断节点是否有连续锚点 ----------
    const anchors = this.store.getNodeAnchors(nodeId);
    const continuousAnchor = anchors.find(
      a => a.type === AnchorType.CONTINUOUS && (a.direction === 'output' || a.direction === 'both')
    );

    if (continuousAnchor) {
      // 有连续锚点 -> 启动连线拖拽（因为小圆点已提前处理）
      this.dragManager.startLinkDrag(continuousAnchor, e);
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 6. 无连续锚点 -> 节点拖拽
    this.dragManager.startNodeDrag(e);
    e.stopPropagation();
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent) {
    // 由 DragManager 驱动，但 DragManager 已不绑定事件
    // 此方法保留为将来可能的前置处理，但实际逻辑由 DragManager 的 processMove 通过 RAF 驱动
    // 不在这里做任何处理，让 DragManager 自己管理
  }

  private onMouseUp(e: MouseEvent) {
    // 由 DragManager 驱动，但 DragManager 已不绑定事件
    // 此方法保留为将来可能的前置处理
  }

  // ==================== 辅助方法 ====================

  private hitTestNodeEdge(canvasPos: Point): Node | null {
    const threshold = 15;
    const nodes = this.store.getAllNodes();
    for (const node of nodes) {
      const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
      const dx = Math.max(rect.x - canvasPos.x, 0, canvasPos.x - (rect.x + rect.width));
      const dy = Math.max(rect.y - canvasPos.y, 0, canvasPos.y - (rect.y + rect.height));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= threshold) return node;
    }
    return null;
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
    svg.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('mousedown', this.hideMenu.bind(this));
  }
}
