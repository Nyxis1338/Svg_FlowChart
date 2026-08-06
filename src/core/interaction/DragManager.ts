// src/core/interaction/DragManager.ts
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import type { Point } from '../../types/geometry';
import { ConnectorType, AnchorPosition } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { HitTest } from './HitTest';

enum DragState {
  IDLE = 'idle',
  NODE_DRAGGING = 'node_dragging',
  LINK_DRAGGING = 'link_dragging',
  HOVERING = 'hovering',
  CONNECTED = 'connected',
}

export class DragManager {
  private state: DragState = DragState.IDLE;
  private readonly chart: SvgEngine;

  private nodeDragData: { nodeId: string; offset: Point } | null = null;
  private linkDragData: {
    sourceAnchorId: string;
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
  private pendingDrag: { anchor: Anchor; startPos: Point; evt: MouseEvent } | null = null;

  private hitTest = new HitTest();

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.bindEvents();
  }

  public startNodeDrag(evt: MouseEvent): void {
    this.onMouseDown(evt);
  }

  private get store() {
    return this.chart.store;
  }
  private get viewport() {
    return this.chart.viewport;
  }
  private get selection() {
    return this.chart.selection;
  }
  private get renderer() {
    return this.chart.renderer;
  }

  private bindEvents() {
    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('blur', this.cancelDrag.bind(this));
  }

  private onMouseDown(evt: MouseEvent) {
    if (this.state !== DragState.IDLE) return;
    const target = evt.target as SVGElement;
    if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) return;
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute('data-node-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }
    if (!nodeId) return;
    evt.stopPropagation();
    const node = this.store.getNode(nodeId);
    if (!node) return;
    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    this.nodeDragData = { nodeId, offset: { x: canvasPos.x - node.x, y: canvasPos.y - node.y } };
    this.selection.select('node', nodeId);
    this.state = DragState.NODE_DRAGGING;
  }

  private getAnchorOrientation(anchor: Anchor): { dx: number; dy: number } {
    switch (anchor.position) {
      case AnchorPosition.TOP:
      case AnchorPosition.TOP_LEFT:
      case AnchorPosition.TOP_RIGHT:
        return { dx: 0, dy: -1 };
      case AnchorPosition.BOTTOM:
      case AnchorPosition.BOTTOM_LEFT:
      case AnchorPosition.BOTTOM_RIGHT:
        return { dx: 0, dy: 1 };
      case AnchorPosition.LEFT:
        return { dx: -1, dy: 0 };
      case AnchorPosition.RIGHT:
        return { dx: 1, dy: 0 };
      default:
        return { dx: 0, dy: 0 };
    }
  }

  startLinkDrag(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.state !== DragState.IDLE) return;
    if (anchor.connectionsDetachable === false) return;
    const isOutput = anchor.direction === 'output' || anchor.direction === 'both';
    const existingConnection = this.store.findConnectionByAnchor(anchor.id);
    const isReconnect = !!existingConnection;
    if (!isOutput && !isReconnect) return;
    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;
    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    this.pendingDrag = { anchor, startPos: anchorPos, evt };
  }

  private startDragging(pending: { anchor: Anchor; startPos: Point; evt: MouseEvent }) {
    const { anchor, startPos, evt } = pending;
    const existingConnection = this.store.findConnectionByAnchor(anchor.id);
    const isReconnect = !!existingConnection;
    if (isReconnect) {
      const conn = existingConnection!;
      if (conn.detachable === false || conn.reattach === false) return;
      this.handleReconnect(anchor, conn, startPos, evt);
    } else {
      this.handleCreate(anchor, startPos, evt);
    }
    this.state = DragState.LINK_DRAGGING;
    this.pendingDrag = null;
    evt.preventDefault();
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  private handleCreate(anchor: Anchor, anchorPos: Point, evt: MouseEvent): void {
    const orientation = this.getAnchorOrientation(anchor);
    this.linkDragData = {
      sourceAnchorId: anchor.id,
      startX: anchorPos.x,
      startY: anchorPos.y,
      endX: anchorPos.x,
      endY: anchorPos.y,
      type: 'create',
      dragDirection: anchor.direction === 'both' ? 'output' : anchor.direction,
      orientation,
      connectorType: ConnectorType.FLOWCHART,
      stroke: Defaults.connection.stroke,
      strokeWidth: Defaults.connection.strokeWidth,
    };
  }

  private handleReconnect(anchor: Anchor, conn: Connection, anchorPos: Point, evt: MouseEvent): void {
    let dragDirection: 'output' | 'input';
    let fixedAnchorId: string;
    if (conn.sourceAnchorId === anchor.id) { // 拖拽的是源端
      dragDirection = 'output';
      fixedAnchorId = conn.targetAnchorId!; // 目标端锚点ID
    } else if (conn.targetAnchorId === anchor.id) { // 拖拽的是目标端
      dragDirection = 'input';
      fixedAnchorId = conn.sourceAnchorId!; // 源端锚点ID
    } else {
      return;
    }

    const fixedAnchor = this.store.getAnchor(fixedAnchorId);
    if (!fixedAnchor) return;
    const fixedNode = this.store.getNode(fixedAnchor.nodeId);
    if (!fixedNode) return;
    const fixedPos = this.store.calcAnchorPosForNode(fixedNode, fixedAnchor);
    const orientation = this.getAnchorOrientation(fixedAnchor);
    const stroke = conn.stroke || Defaults.connection.stroke;
    const strokeWidth = conn.strokeWidth || Defaults.connection.strokeWidth;
    const connectorType = conn.connectorType;
    this.linkDragData = {
      sourceAnchorId: anchor.id,
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

  private onMouseMove(evt: MouseEvent) {
    if (this.pendingDrag) {
      const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
      const dx = canvasPos.x - this.pendingDrag.startPos.x;
      const dy = canvasPos.y - this.pendingDrag.startPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.startDragging(this.pendingDrag);
        this.lastMoveEvent = evt;
        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => this.processMove());
        }
        return;
      }
      return;
    }
    this.lastMoveEvent = evt;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.processMove());
    }
  }

  private processMove() {
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
      this.linkDragData.endX = canvasPos.x;
      this.linkDragData.endY = canvasPos.y;
      const isReconnect = this.linkDragData.type === 'reconnect';
      const stroke = this.linkDragData.stroke;
      const strokeWidth = this.linkDragData.strokeWidth;
      const connectorType = this.linkDragData.connectorType || ConnectorType.FLOWCHART;
      const orientation = this.linkDragData.orientation;
      this.renderer.setTempLine(
        {
          x1: this.linkDragData.startX,
          y1: this.linkDragData.startY,
          x2: canvasPos.x,
          y2: canvasPos.y,
        },
        connectorType,
        isReconnect,
        stroke,
        strokeWidth,
        orientation
      );

      const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, this.linkDragData.sourceAnchorId);
      const sourceAnchor = this.store.getAnchor(this.linkDragData.sourceAnchorId);
      const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

      // 方向兼容性检查（区分新建/重连）
      let directionCompatible = false;
      if (hitAnchor) {
        if (isReconnect) {
          directionCompatible = (this.linkDragData.dragDirection === hitAnchor.direction) || hitAnchor.direction === 'both';
        } else {
          directionCompatible = (this.linkDragData.dragDirection === 'output' && (hitAnchor.direction === 'input' || hitAnchor.direction === 'both'));
        }
      }

      // ✅ 修改：允许同一节点不同锚点，但禁止自身锚点
      const isValidTarget = hitAnchor &&
        sourceNode &&
        hitAnchor.id !== this.linkDragData.sourceAnchorId && // 不能连回自身
        directionCompatible;

      if (isValidTarget && hitAnchor !== this.highlightedAnchor) {
        console.log(`[高亮] 拖拽端方向: ${this.linkDragData.dragDirection}, 目标锚点: ${hitAnchor.id}, 目标方向: ${hitAnchor.direction}`);
        this.clearHighlight();
        this.highlightedAnchor = hitAnchor;
        this.renderer.highlightAnchor(hitAnchor.id, true);
        this.state = DragState.HOVERING;
      } else if (!isValidTarget && this.highlightedAnchor) {
        this.clearHighlight();
        this.state = DragState.LINK_DRAGGING;
      }
    }
  }

  private onMouseUp(evt: MouseEvent) {
    if (this.pendingDrag) {
      const { anchor } = this.pendingDrag;
      console.log('🔍 [点击锚点] (未拖拽) 锚点:', anchor.id);
      this.pendingDrag = null;
      this.chart.getSvgRoot().style.cursor = '';
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
      return;
    }

    if ((this.state === DragState.LINK_DRAGGING || this.state === DragState.HOVERING) && this.linkDragData) {
      const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
      const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, this.linkDragData.sourceAnchorId);
      const sourceAnchor = this.store.getAnchor(this.linkDragData.sourceAnchorId);
      const isReconnect = this.linkDragData.type === 'reconnect';
      let success = false;

      const dragDir = this.linkDragData.dragDirection;
      const targetDir = hitAnchor?.direction || '无';

      console.log(`[onMouseUp] 拖拽端方向: ${dragDir}, 目标锚点: ${hitAnchor?.id || '无'}, 目标方向: ${targetDir}`);

      if (hitAnchor && sourceAnchor) {
        // ✅ 修改：允许同一节点不同锚点，但禁止自身锚点
        if (hitAnchor.id === sourceAnchor.id) {
          console.warn(`⏭️ 目标锚点与源锚点相同，取消重连`);
        } else {
          // 方向兼容性检查（区分新建/重连）
          let directionCompatible = false;
          if (isReconnect) {
            directionCompatible = (dragDir === hitAnchor.direction) || hitAnchor.direction === 'both';
          } else {
            directionCompatible = (dragDir === 'output' && (hitAnchor.direction === 'input' || hitAnchor.direction === 'both'));
          }

          if (directionCompatible) {
            if (isReconnect) {
              const connId = this.linkDragData.connectionId;
              if (connId) {
                const conn = this.store.getConnection(connId);
                if (conn) {
                  let newSourceId = conn.sourceAnchorId;
                  let newTargetId = conn.targetAnchorId;
                  if (dragDir === 'output') {
                    newSourceId = hitAnchor.id;
                  } else {
                    newTargetId = hitAnchor.id;
                  }
                  if (newSourceId !== conn.sourceAnchorId || newTargetId !== conn.targetAnchorId) {
                    const exist = this.store.getAllConnections().some(
                      c => c.id !== connId && c.sourceAnchorId === newSourceId && c.targetAnchorId === newTargetId
                    );
                    if (!exist) {
                      this.store.updateConnection(connId, {
                        sourceAnchorId: newSourceId,
                        targetAnchorId: newTargetId,
                      });
                      success = true;
                      const srcAnchor = newSourceId ? this.store.getAnchor(newSourceId) : null;
                      const tgtAnchor = newTargetId ? this.store.getAnchor(newTargetId) : null;
                      console.log(`✅ 重连成功: 源端方向=${srcAnchor?.direction || '未知'}, 目标端方向=${tgtAnchor?.direction || '未知'}`);
                    } else {
                      console.warn('连线已存在，重连取消');
                    }
                  } else {
                    console.log('⏭️ 目标未变化，取消重连');
                    success = false;
                  }
                }
              }
            } else {
              const exist = this.store.getAllConnections().some(
                c => c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id
              );
              if (!exist) {
                this.store.addConnection({
                  id: crypto.randomUUID(),
                  connectorType: ConnectorType.FLOWCHART,
                  sourceAnchorId: sourceAnchor.id,
                  targetAnchorId: hitAnchor.id,
                  stroke: Defaults.connection.stroke,
                  strokeWidth: Defaults.connection.strokeWidth,
                });
                success = true;
                const srcAnchor = this.store.getAnchor(sourceAnchor.id);
                const tgtAnchor = this.store.getAnchor(hitAnchor.id);
                console.log(`✅ 新建连线成功: 源端方向=${srcAnchor?.direction || '未知'}, 目标端方向=${tgtAnchor?.direction || '未知'}`);
              } else {
                console.warn('连线已存在，创建取消');
              }
            }
          } else {
            console.warn(`❌ 方向不匹配: 拖拽端=${dragDir}, 目标端=${targetDir}`);
          }
        }
      } else {
        console.warn(`⏭️ 未命中有效目标锚点，取消连接。拖拽端方向=${dragDir}`);
      }

      if (isReconnect && this.linkDragData.connectionId) {
        this.renderer.setReconnecting(this.linkDragData.connectionId, false);
      }

      this.clearHighlight();
      this.renderer.clearTempLine();
      this.linkDragData = null;
      this.state = DragState.IDLE;
    }
  }

  private onKeyDown(evt: KeyboardEvent) {
    if (evt.key === 'Escape') {
      this.cancelDrag();
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

  private cancelDrag() {
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
  }

  private clearHighlight() {
    if (this.highlightedAnchor) {
      this.renderer.highlightAnchor(this.highlightedAnchor.id, false);
      this.highlightedAnchor = null;
    }
  }

  // ✅ 已移除 isDirectionAllowed 方法，方向逻辑在 processMove 和 onMouseUp 中内联处理

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('blur', this.cancelDrag.bind(this));
    this.cancelDrag();
  }
}