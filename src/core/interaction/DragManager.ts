// src/core/interaction/DragManager.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import { NodeDragManager } from './NodeDragManager';
import { ConnectionDragManager } from './ConnectionDragManager';

export enum DragState {
  IDLE = 'idle',
  NODE_DRAGGING = 'node_dragging',
  LINK_DRAGGING = 'link_dragging',
  HOVERING = 'hovering',
}

export class DragManager {
  // 共享状态（由子管理器直接读写）
  public state: DragState = DragState.IDLE;
  public nodeDragData: { nodeId: string; offset: Point } | null = null;
  public linkDragData: {
    sourceAnchorId: string;
    sourceAnchorType?: any;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    type: 'create' | 'reconnect';
    connectionId?: string;
    oldTargetAnchorId?: string;
    oldSourceAnchorId?: string;
    dragDirection: 'output' | 'input';
    stroke?: string;
    strokeWidth?: number;
    connectorType?: any;
    fixedAnchorId?: string;
    orientation?: { dx: number; dy: number };
  } | null = null;
  public highlightedAnchor: Anchor | null = null;
  public pendingDrag: {
    anchor: Anchor;
    startPos: Point;
    evt: MouseEvent;
    isReconnect: boolean;
  } | null = null;

  private readonly chart: SvgEngine;
  private rafId: number | null = null;
  private lastMoveEvent: MouseEvent | null = null;
  private dragEventsBound = false;

  // 子管理器
  private nodeDragManager: NodeDragManager;
  private connectionDragManager: ConnectionDragManager;

  public get isDragging(): boolean {
    return this.state !== DragState.IDLE;
  }

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.nodeDragManager = new NodeDragManager(this);
    this.connectionDragManager = new ConnectionDragManager(this);
  }

  // ==================== 公共入口 ====================

  public startNodeDrag(evt: MouseEvent): void {
    this.nodeDragManager.startNodeDrag(evt);
    this.bindDragEvents();
    evt.preventDefault();
  }

  public startLinkDrag(anchor: Anchor, evt: MouseEvent): void {
    this.connectionDragManager.startLinkDrag(anchor, evt);
    this.bindDragEvents();
    evt.preventDefault();
  }

  public cancelDrag(): void {
    this._cancelDrag();
  }

  // ==================== 内部拖拽控制 ====================

  private bindDragEvents(): void {
    if (this.dragEventsBound) return;
    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('blur', this._cancelDrag.bind(this));
    this.dragEventsBound = true;
  }

  private unbindDragEvents(): void {
    if (!this.dragEventsBound) return;
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('blur', this._cancelDrag.bind(this));
    this.dragEventsBound = false;
  }

  // ==================== 鼠标事件处理 ====================

  private onMouseMove(evt: MouseEvent): void {
    if (this.pendingDrag) {
      const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
      const dx = canvasPos.x - this.pendingDrag.startPos.x;
      const dy = canvasPos.y - this.pendingDrag.startPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.connectionDragManager.startDragging();
        this.lastMoveEvent = evt;
        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => this.processMove());
        }
      }
      return;
    }

    this.lastMoveEvent = evt;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.processMove());
    }
  }

  private onMouseUp(evt: MouseEvent): void {
    if (this.pendingDrag) {
      const { anchor } = this.pendingDrag;
      console.log('🔍 [点击锚点] (未拖拽) 锚点:', anchor.id);
      this.pendingDrag = null;
      this.chart.getSvgRoot().style.cursor = '';
      this.unbindDragEvents();
      return;
    }

    this.chart.getSvgRoot().style.cursor = '';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.state === DragState.NODE_DRAGGING && this.nodeDragData) {
      this.nodeDragManager.endNodeDrag();
      this.unbindDragEvents();
      return;
    }

    if ((this.state === DragState.LINK_DRAGGING || this.state === DragState.HOVERING) && this.linkDragData) {
      this.connectionDragManager.finishLinkDrag(evt);
      this.unbindDragEvents();
      return;
    }

    this.unbindDragEvents();
  }

  private processMove(): void {
    this.rafId = null;
    if (!this.lastMoveEvent) return;

    const evt = this.lastMoveEvent;
    this.lastMoveEvent = null;
    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });

    if (this.state === DragState.NODE_DRAGGING && this.nodeDragData) {
      this.nodeDragManager.processMove(canvasPos);
    } else if (this.state === DragState.LINK_DRAGGING && this.linkDragData) {
      this.connectionDragManager.processMove(canvasPos);
    }
  }

  // ==================== 辅助 ====================

  private onKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Escape') {
      this._cancelDrag();
      return;
    }
    if (evt.key === 'Delete' || evt.key === 'Backspace') {
      const sel = this.selection.getSelection();
      if (!sel.type || sel.type === 'anchor' || !sel.id) return;
      const confirmMsg = sel.type === 'node' ? '确定删除节点（关联锚点、连线会一并清除）？' : '确定删除当前连线？';
      if (!window.confirm(confirmMsg)) return;
      if (sel.type === 'node') {
        this.store.removeNode(sel.id);
      } else if (sel.type === 'connection') {
        this.store.removeConnection(sel.id);
      }
      this.selection.clear();
    }
  }

  private _cancelDrag(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.linkDragData?.connectionId) {
      this.renderer.setReconnecting(this.linkDragData.connectionId, false);
    }
    this.connectionDragManager.cancelLinkDrag();
    this.renderer.clearTempLine();
    this.chart.getSvgRoot().style.cursor = '';
    this.nodeDragData = null;
    this.linkDragData = null;
    this.pendingDrag = null;
    this.state = DragState.IDLE;
    this.unbindDragEvents();
  }

  // ==================== Getter ====================

  private get store(): Store {
    return this.chart.store;
  }
  private get viewport(): ViewportManager {
    return this.chart.viewport;
  }
  private get selection(): SelectionManager {
    return this.chart.selection;
  }
  private get renderer(): SvgRenderer {
    return this.chart.renderer;
  }

  destroy(): void {
    this._cancelDrag();
    this.unbindDragEvents();
  }
}
