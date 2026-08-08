// src/core/interaction/DragManager.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { HitTest } from './HitTest';
import { ConnectorType, AnchorPosition, AnchorType } from '../../types/SvgModel';
import { getContinuousAnchorPosition } from '../../calc/anchor/continuous';
import { getAnchorOrientation } from '../../utils/anchor-helpers';

enum DragState {
  IDLE = 'idle',
  NODE_DRAGGING = 'node_dragging',
  LINK_DRAGGING = 'link_dragging',
  HOVERING = 'hovering',
}

export class DragManager {
  private state: DragState = DragState.IDLE;
  private readonly chart: SvgEngine;

  private nodeDragData: { nodeId: string; offset: Point } | null = null;
  private linkDragData: {
    sourceAnchorId: string;
    sourceAnchorType?: AnchorType;
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
    connectorType?: ConnectorType;
    fixedAnchorId?: string;
    orientation?: { dx: number; dy: number };
  } | null = null;

  private highlightedAnchor: Anchor | null = null;
  private rafId: number | null = null;
  private lastMoveEvent: MouseEvent | null = null;
  // private pendingDrag: { anchor: Anchor; startPos: Point; evt: MouseEvent } | null = null;
  private pendingDrag: {
    anchor: Anchor;
    startPos: Point;
    evt: MouseEvent;
    isReconnect: boolean; // 新增
  } | null = null;
  private hitTest = new HitTest();

  // 是否正在拖拽中（外部可查询）
  public get isDragging(): boolean {
    return this.state !== DragState.IDLE;
  }

  constructor(chart: SvgEngine) {
    this.chart = chart;
    // ✅ 移除 bindEvents()，事件由 EventBus 统一管理
  }

  // ==================== 公共入口 ====================

  /** 启动节点拖拽（由 EventBus 调用） */
  public startNodeDrag(evt: MouseEvent): void {
    if (this.state !== DragState.IDLE) return;

    const target = evt.target as SVGElement;
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute('data-node-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }
    if (!nodeId) return;

    const node = this.store.getNode(nodeId);
    if (!node) return;

    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    this.nodeDragData = {
      nodeId,
      offset: { x: canvasPos.x - node.x, y: canvasPos.y - node.y },
    };
    this.selection.select('node', nodeId);
    this.state = DragState.NODE_DRAGGING;

    // 绑定全局事件（由 DragManager 自己处理移动和释放）
    this.bindDragEvents();
    evt.preventDefault();
  }

  /** 启动连线拖拽（由 EventBus 调用） */
  public startLinkDrag(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.state !== DragState.IDLE) return;
    if (anchor.connectionsDetachable === false) return;

    // 对于连续锚点，视为 output（始终允许拖拽）
    const isOutput =
      anchor.type === AnchorType.CONTINUOUS || anchor.direction === 'output' || anchor.direction === 'both';
    // 判断锚点是否已满
    const isFull = this.store.isAnchorFull(anchor.id);
    if (isFull) {
      console.warn(`锚点 ${anchor.id} 已满，不能拖拽`);
      return;
    }
    // 对于连续锚点，总是视为创建新连线（而不是重连）
    let isReconnect = false;
    if (anchor.type !== AnchorType.CONTINUOUS) {
      const existingConnection = this.store.findConnectionByAnchor(anchor.id);
      isReconnect = !isFull && existingConnection != null;
    }

    if (!isOutput && !isReconnect) {
      console.warn(`⏭️ 锚点 ${anchor.id} 不是输出端且无现有连线可重连，取消拖拽`);
      return;
    }

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;

    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    this.pendingDrag = {
      anchor,
      startPos: anchorPos,
      evt,
      isReconnect, // 存入标志
    };
    this.bindDragEvents();
    evt.preventDefault();
  }

  /** 取消当前拖拽（外部调用，如 ESC） */
  public cancelDrag(): void {
    this._cancelDrag();
  }

  // ==================== 内部拖拽控制 ====================

  private bindDragEvents(): void {
    // 仅绑定一次
    if (this._dragEventsBound) return;
    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('blur', this._cancelDrag.bind(this));
    this._dragEventsBound = true;
  }

  private _dragEventsBound = false;

  private unbindDragEvents(): void {
    if (!this._dragEventsBound) return;
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('blur', this._cancelDrag.bind(this));
    this._dragEventsBound = false;
  }

  // ==================== 私有辅助 ====================

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

  private startDragging(pending: { anchor: Anchor; startPos: Point; evt: MouseEvent; isReconnect: boolean }) {
    const { anchor, startPos, evt, isReconnect } = pending;

    if (isReconnect) {
      // 重连逻辑
      const existingConnection = this.store.findConnectionByAnchor(anchor.id);
      if (!existingConnection) {
        console.warn('重连时未找到现有连线，取消');
        return;
      }
      const conn = existingConnection;
      if (conn.detachable === false || conn.reattach === false) return;
      this.handleReconnect(anchor, conn, startPos, evt);
    } else {
      // 创建新连线
      this.handleCreate(anchor, startPos, evt);
    }

    this.state = DragState.LINK_DRAGGING;
    this.pendingDrag = null;
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  private handleCreate(anchor: Anchor, anchorPos: Point, _evt: MouseEvent): void {
    const orientation = getAnchorOrientation(anchor);
    let startX = anchorPos.x;
    let startY = anchorPos.y;

    if (anchor.type === AnchorType.CONTINUOUS) {
      const node = this.store.getNode(anchor.nodeId);
      if (node) {
        const defaultTarget = { x: node.x + node.width / 2, y: node.y + node.height + 100 };
        const dynamicPos = getContinuousAnchorPosition(node, defaultTarget);
        startX = dynamicPos.x;
        startY = dynamicPos.y;
      }
    }

    // 对于连续锚点，强制 dragDirection = 'output'
    const dragDirection =
      anchor.type === AnchorType.CONTINUOUS ? 'output' : anchor.direction === 'both' ? 'output' : anchor.direction;

    this.linkDragData = {
      sourceAnchorId: anchor.id,
      sourceAnchorType: anchor.type,
      startX,
      startY,
      endX: startX,
      endY: startY,
      type: 'create',
      dragDirection, // 使用修正后的值
      orientation,
      connectorType: ConnectorType.STRAIGHT,
      stroke: Defaults.connection.stroke,
      strokeWidth: Defaults.connection.strokeWidth,
    };
  }

  private handleReconnect(anchor: Anchor, conn: Connection, anchorPos: Point, _evt: MouseEvent): void {
    let dragDirection: 'output' | 'input';
    let fixedAnchorId: string;

    if (conn.sourceAnchorId === anchor.id) {
      dragDirection = 'output';
      fixedAnchorId = conn.targetAnchorId!;
    } else if (conn.targetAnchorId === anchor.id) {
      dragDirection = 'input';
      fixedAnchorId = conn.sourceAnchorId!;
    } else {
      return;
    }

    const fixedAnchor = this.store.getAnchor(fixedAnchorId);
    if (!fixedAnchor) return;
    const fixedNode = this.store.getNode(fixedAnchor.nodeId);
    if (!fixedNode) return;

    const fixedPos = this.store.calcAnchorPosForNode(fixedNode, fixedAnchor);
    const orientation = getAnchorOrientation(fixedAnchor);
    const stroke = conn.stroke || Defaults.connection.stroke;
    const strokeWidth = conn.strokeWidth || Defaults.connection.strokeWidth;
    const connectorType = conn.connectorType;

    this.linkDragData = {
      sourceAnchorId: anchor.id,
      sourceAnchorType: anchor.type,
      startX: fixedPos.x,
      startY: fixedPos.y,
      endX: anchorPos.x,
      endY: anchorPos.y,
      type: 'reconnect',
      connectionId: conn.id,
      oldSourceAnchorId: conn.sourceAnchorId,
      oldTargetAnchorId: conn.targetAnchorId,
      dragDirection,
      stroke,
      strokeWidth,
      connectorType,
      fixedAnchorId,
      orientation,
    };

    this.renderer.setReconnecting(conn.id, true);
    this.renderer.highlightAnchor(anchor.id, true);
  }

  // ==================== 鼠标事件处理（由 DragManager 自行管理） ====================

  private onMouseMove(evt: MouseEvent): void {
    if (this.pendingDrag) {
      const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
      const dx = canvasPos.x - this.pendingDrag.startPos.x;
      const dy = canvasPos.y - this.pendingDrag.startPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        // 阈值 5px
        this.startDragging(this.pendingDrag);
        this.lastMoveEvent = evt;
        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => this.processMove());
        }
      }
      return;
    }

    // 正常拖拽过程中
    this.lastMoveEvent = evt;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.processMove());
    }
  }

  private onMouseUp(evt: MouseEvent): void {
    if (this.pendingDrag) {
      // 点击但未拖拽 -> 选中节点
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
      const nodeId = this.nodeDragData.nodeId;
      this.selection.select('node', nodeId);
      this.nodeDragData = null;
      this.state = DragState.IDLE;
      this.unbindDragEvents();
      return;
    }

    if ((this.state === DragState.LINK_DRAGGING || this.state === DragState.HOVERING) && this.linkDragData) {
      this._finishLinkDrag(evt);
    }

    this.unbindDragEvents();
  }

  private _finishLinkDrag(evt: MouseEvent): void {
    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, this.linkDragData!.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(this.linkDragData!.sourceAnchorId);
    const isReconnect = this.linkDragData!.type === 'reconnect';
    let success = false;

    const dragDir = this.linkDragData!.dragDirection;
    const targetDir = hitAnchor?.direction || '无';

    console.log(`[onMouseUp] 拖拽端方向: ${dragDir}, 目标锚点: ${hitAnchor?.id || '无'}, 目标方向: ${targetDir}`);

    if (hitAnchor && sourceAnchor) {
      if (hitAnchor.id === sourceAnchor.id) {
        console.warn(`⏭️ 目标锚点与源锚点相同，取消重连`);
      } else {
        let directionCompatible = false;
        // 如果源锚点是连续锚点，直接兼容（因为连续锚点是 both）
        if (sourceAnchor && sourceAnchor.type === AnchorType.CONTINUOUS) {
          directionCompatible = true;
        } else {
          if (isReconnect) {
            directionCompatible = dragDir === hitAnchor.direction || hitAnchor.direction === 'both';
          } else {
            directionCompatible =
              dragDir === 'output' && (hitAnchor.direction === 'input' || hitAnchor.direction === 'both');
          }
        }

        if (directionCompatible) {
          if (isReconnect) {
            success = this._handleReconnectDrop(hitAnchor);
          } else {
            success = this._handleCreateDrop(sourceAnchor, hitAnchor);
          }
        } else {
          console.warn(`❌ 方向不匹配: 拖拽端=${dragDir}, 目标端=${targetDir}`);
        }
      }
    } else {
      console.warn(`⏭️ 未命中有效目标锚点，取消连接。拖拽端方向=${dragDir}`);
    }

    if (isReconnect && this.linkDragData!.connectionId) {
      this.renderer.setReconnecting(this.linkDragData!.connectionId, false);
    }

    this.clearHighlight();
    this.renderer.clearTempLine();
    this.linkDragData = null;
    this.state = DragState.IDLE;
  }

  private _handleCreateDrop(sourceAnchor: Anchor, hitAnchor: Anchor): boolean {
    // 连续锚点允许创建多条到同一目标
    if (sourceAnchor.type === AnchorType.CONTINUOUS) {
      this.store.addConnection({
        id: crypto.randomUUID(),
        connectorType: ConnectorType.STRAIGHT,
        sourceAnchorId: sourceAnchor.id,
        targetAnchorId: hitAnchor.id,
        stroke: Defaults.connection.stroke,
        strokeWidth: Defaults.connection.strokeWidth,
      });
      console.log(`✅ 新建连线成功（连续锚点）: 源端方向=${sourceAnchor.direction}, 目标端方向=${hitAnchor.direction}`);
      return true;
    }

    // 静态锚点：检查重复
    const exist = this.store
      .getAllConnections()
      .some(c => c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id);

    if (!exist) {
      this.store.addConnection({
        id: crypto.randomUUID(),
        connectorType: ConnectorType.STRAIGHT,
        sourceAnchorId: sourceAnchor.id,
        targetAnchorId: hitAnchor.id,
        stroke: Defaults.connection.stroke,
        strokeWidth: Defaults.connection.strokeWidth,
      });
      console.log(`✅ 新建连线成功: 源端方向=${sourceAnchor.direction}, 目标端方向=${hitAnchor.direction}`);
      return true;
    } else {
      console.warn('连线已存在，创建取消');
      return false;
    }
  }

  private _handleReconnectDrop(hitAnchor: Anchor): boolean {
    const connId = this.linkDragData!.connectionId!;
    const conn = this.store.getConnection(connId);
    if (!conn) return false;

    const dragDir = this.linkDragData!.dragDirection;
    let newSourceId = conn.sourceAnchorId;
    let newTargetId = conn.targetAnchorId;

    if (dragDir === 'output') {
      newSourceId = hitAnchor.id;
    } else {
      newTargetId = hitAnchor.id;
    }

    if (newSourceId === conn.sourceAnchorId && newTargetId === conn.targetAnchorId) {
      console.log('⏭️ 目标未变化，取消重连');
      return false;
    }

    const exist = this.store
      .getAllConnections()
      .some(c => c.id !== connId && c.sourceAnchorId === newSourceId && c.targetAnchorId === newTargetId);

    if (!exist) {
      this.store.updateConnection(connId, { sourceAnchorId: newSourceId, targetAnchorId: newTargetId });
      console.log(`✅ 重连成功`);
      return true;
    } else {
      console.warn('连线已存在，重连取消');
      return false;
    }
  }

  // ==================== 核心更新循环 ====================

  private processMove(): void {
    console.log('🔄 processMove 执行');
    this.rafId = null;
    if (!this.lastMoveEvent) return;

    const evt = this.lastMoveEvent;
    this.lastMoveEvent = null;
    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });

    if (this.state === DragState.NODE_DRAGGING && this.nodeDragData) {
      const { nodeId, offset } = this.nodeDragData;
      const newX = canvasPos.x - offset.x;
      const newY = canvasPos.y - offset.y;
      this.store.updateNode(nodeId, { x: newX, y: newY });
      return;
    }

    if (this.state === DragState.LINK_DRAGGING && this.linkDragData) {
      this._updateLinkDrag(canvasPos);
    }
  }

  private _updateLinkDrag(canvasPos: Point): void {
    this.linkDragData!.endX = canvasPos.x;
    this.linkDragData!.endY = canvasPos.y;

    let startX = this.linkDragData!.startX;
    let startY = this.linkDragData!.startY;

    const srcAnchor = this.store.getAnchor(this.linkDragData!.sourceAnchorId);

    if (srcAnchor && srcAnchor.type === AnchorType.CONTINUOUS) {
      const sourceNode = this.store.getNode(srcAnchor.nodeId);
      if (sourceNode) {
        const dynamicPos = getContinuousAnchorPosition(sourceNode, canvasPos);
        startX = dynamicPos.x;
        startY = dynamicPos.y;
        this.linkDragData!.startX = startX;
        this.linkDragData!.startY = startY;
        console.log('✅ 动态起点更新:', startX, startY);
      }
    }

    const isReconnect = this.linkDragData!.type === 'reconnect';
    const stroke = this.linkDragData!.stroke;
    const strokeWidth = this.linkDragData!.strokeWidth;
    const connectorType = this.linkDragData!.connectorType || ConnectorType.FLOWCHART;
    const orientation = this.linkDragData!.orientation;

    this.renderer.setTempLine(
      { x1: startX, y1: startY, x2: canvasPos.x, y2: canvasPos.y },
      connectorType,
      isReconnect,
      stroke,
      strokeWidth,
      orientation
    );

    // 命中检测
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, this.linkDragData!.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(this.linkDragData!.sourceAnchorId);
    const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

    let directionCompatible = false;
    if (hitAnchor) {
      // 如果源锚点是连续锚点，直接兼容
      if (srcAnchor && srcAnchor.type === AnchorType.CONTINUOUS) {
        directionCompatible = true;
      } else {
        if (isReconnect) {
          directionCompatible =
            this.linkDragData!.dragDirection === hitAnchor.direction || hitAnchor.direction === 'both';
        } else {
          directionCompatible =
            this.linkDragData!.dragDirection === 'output' &&
            (hitAnchor.direction === 'input' || hitAnchor.direction === 'both');
        }
      }
    }

    const isValidTarget =
      hitAnchor && sourceNode && hitAnchor.id !== this.linkDragData!.sourceAnchorId && directionCompatible;

    if (isValidTarget && hitAnchor !== this.highlightedAnchor) {
      console.log(
        `[高亮] 拖拽端方向: ${this.linkDragData!.dragDirection}, 目标锚点: ${hitAnchor.id}, 目标方向: ${hitAnchor.direction}`
      );
      this.clearHighlight();
      this.highlightedAnchor = hitAnchor;
      this.renderer.highlightAnchor(hitAnchor.id, true);
      this.state = DragState.HOVERING;
    } else if (!isValidTarget && this.highlightedAnchor) {
      this.clearHighlight();
      this.state = DragState.LINK_DRAGGING;
    }
  }

  // ==================== 辅助 ====================

  private clearHighlight(): void {
    if (this.highlightedAnchor) {
      this.renderer.highlightAnchor(this.highlightedAnchor.id, false);
      this.highlightedAnchor = null;
    }
  }

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
    this.clearHighlight();
    this.renderer.clearTempLine();
    this.chart.getSvgRoot().style.cursor = '';
    this.nodeDragData = null;
    this.linkDragData = null;
    this.pendingDrag = null;
    this.state = DragState.IDLE;
    this.unbindDragEvents();
  }

  destroy(): void {
    this._cancelDrag();
    this.unbindDragEvents();
  }
}
