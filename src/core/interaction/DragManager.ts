// src/core/interaction/DragManager.ts

import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import type { Point } from '../../types/geometry';
import { ConnectorType, AnchorPosition } from '../../types/SvgModel'; // ✅ 导入 AnchorPosition
import { Defaults } from '../../styles/defaults';

/** 拖拽状态枚举 */
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

  // ✅ 在类型定义中增加 orientation 字段
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
    endpoint: 'source' | 'target';
    stroke?: string;
    strokeWidth?: number;
    connectorType?: ConnectorType;
    fixedAnchorId?: string;
    orientation?: { dx: number; dy: number }; // ✅ 新增
  } | null = null;

  private highlightedAnchor: Anchor | null = null;

  private rafId: number | null = null;
  private lastMoveEvent: MouseEvent | null = null;

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.bindEvents();
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
    const svg = this.chart.getSvgRoot();
    svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('blur', this.cancelDrag.bind(this));
  }

  // ==================== 鼠标事件 ====================

  private onMouseDown(evt: MouseEvent) {
    if (this.state !== DragState.IDLE) return;

    const target = evt.target as SVGElement;
    if (target.tagName === 'circle' && target.hasAttribute('data-anchor-id')) {
      return;
    }

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
    this.nodeDragData = {
      nodeId,
      offset: { x: canvasPos.x - node.x, y: canvasPos.y - node.y },
    };
    this.selection.select('node', nodeId);
    this.state = DragState.NODE_DRAGGING;
  }

  // ==================== 锚点法线方向辅助 ====================

  private getAnchorOrientation(anchor: Anchor): { dx: number; dy: number } {
    // 根据 position 返回法线方向
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

  // ==================== 启动连线拖拽 ====================

  startLinkDrag(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.state !== DragState.IDLE) return;

    if (anchor.connectionsDetachable === false) {
      return;
    }

    // 允许 output 和 both 作为源端，input 仅当重连时允许
    const isOutput = anchor.direction === 'output' || anchor.direction === 'both';
    const existingConnection = this.store.findConnectionByAnchor(anchor.id);
    const isReconnect = !!existingConnection;

    if (!isOutput && !isReconnect) {
      // input 锚点且没有已有连线，不允许拖拽
      return;
    }

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;
    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    const orientation = this.getAnchorOrientation(anchor);

    if (isReconnect) {
      const conn = existingConnection!;
      if (conn.detachable === false || conn.reattach === false) {
        return;
      }
      const isSource = conn.sourceAnchorId === anchor.id;
      const isTarget = conn.targetAnchorId === anchor.id;
      if (!isSource && !isTarget) return;

      const endpoint: 'source' | 'target' = isSource ? 'source' : 'target';
      let fixedAnchorId: string;
      if (endpoint === 'target') {
        fixedAnchorId = conn.sourceAnchorId!;
      } else {
        fixedAnchorId = conn.targetAnchorId!;
      }
      const fixedAnchor = this.store.getAnchor(fixedAnchorId);
      if (!fixedAnchor) return;
      const fixedNode = this.store.getNode(fixedAnchor.nodeId);
      if (!fixedNode) return;
      const fixedPos = this.store.calcAnchorPosForNode(fixedNode, fixedAnchor);

      // 使用固定端锚点的 orientation
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
        endpoint,
        stroke,
        strokeWidth,
        connectorType,
        fixedAnchorId,
        orientation, // ✅ 存储法线方向
      };

      this.renderer.setReconnecting(conn.id, true);
      this.renderer.highlightAnchor(anchor.id, true);
    } else {
      // 新建连线（只有 output/both 能进入）
      this.linkDragData = {
        sourceAnchorId: anchor.id,
        startX: anchorPos.x,
        startY: anchorPos.y,
        endX: anchorPos.x,
        endY: anchorPos.y,
        type: 'create',
        endpoint: 'source',
        orientation, // ✅ 存储法线方向
      };
    }

    this.state = DragState.LINK_DRAGGING;
    evt.preventDefault();
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  // ==================== 鼠标移动 ====================

  private onMouseMove(evt: MouseEvent) {
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
      const orientation = this.linkDragData.orientation; // ✅ 取出方向

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
        orientation // ✅ 传递方向
      );
      console.log('起点:', this.linkDragData.startX, this.linkDragData.startY);
      console.log('终点:', canvasPos.x, canvasPos.y);

      const hitAnchor = this.queryAnchorUnderMouse(evt);
      const sourceAnchor = this.store.getAnchor(this.linkDragData.sourceAnchorId);
      const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;
      const isValidTarget = hitAnchor && sourceNode && this.store.getNode(hitAnchor.nodeId)?.id !== sourceNode.id;

      if (isValidTarget && hitAnchor !== this.highlightedAnchor) {
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

  // ==================== 鼠标释放 ====================

  private onMouseUp(evt: MouseEvent) {
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
      const hitAnchor = this.queryAnchorUnderMouse(evt);
      const sourceAnchor = this.store.getAnchor(this.linkDragData.sourceAnchorId);
      const isReconnect = this.linkDragData.type === 'reconnect';
      let success = false;

      if (hitAnchor && sourceAnchor) {
        const sourceNode = this.store.getNode(sourceAnchor.nodeId);
        const targetNode = this.store.getNode(hitAnchor.nodeId);
        if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
          if (isReconnect) {
            const connId = this.linkDragData.connectionId;
            if (connId) {
              const conn = this.store.getConnection(connId);
              if (conn) {
                const endpoint = this.linkDragData.endpoint;
                let newSourceId = conn.sourceAnchorId;
                let newTargetId = conn.targetAnchorId;
                if (endpoint === 'source') {
                  newSourceId = hitAnchor.id;
                } else {
                  newTargetId = hitAnchor.id;
                }
                if (newSourceId !== conn.sourceAnchorId || newTargetId !== conn.targetAnchorId) {
                  const exist = this.store
                    .getAllConnections()
                    .some(c => c.id !== connId && c.sourceAnchorId === newSourceId && c.targetAnchorId === newTargetId);
                  if (!exist) {
                    this.store.updateConnection(connId, {
                      sourceAnchorId: newSourceId,
                      targetAnchorId: newTargetId,
                    });
                    success = true;
                  } else {
                    console.warn('连线已存在，重连取消');
                  }
                } else {
                  success = false;
                }
              }
            }
          } else {
            const exist = this.store
              .getAllConnections()
              .some(c => c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id);
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
            } else {
              console.warn('连线已存在，创建取消');
            }
          }
        }
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

  // ==================== 键盘事件 ====================

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

  // ==================== 辅助方法 ====================

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
    this.state = DragState.IDLE;
  }

  private clearHighlight() {
    if (this.highlightedAnchor) {
      this.renderer.highlightAnchor(this.highlightedAnchor.id, false);
      this.highlightedAnchor = null;
    }
  }

  private queryAnchorUnderMouse(evt: MouseEvent): Anchor | undefined {
    const canvasPoint = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    const allAnchors = this.store.getAllAnchors();
    const hitRadius = 22;
    let closest: Anchor | undefined;
    let minDist = hitRadius;

    const isReconnect = this.linkDragData?.type === 'reconnect';
    const sourceAnchorId = this.linkDragData?.sourceAnchorId;

    for (const ap of allAnchors) {
      // ✅ 仅排除自身锚点（不能连到自己）
      if (ap.id === sourceAnchorId) continue;

      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;
      const pos = this.store.calcAnchorPosForNode(node, ap);
      const dist = Math.hypot(canvasPoint.x - pos.x, canvasPoint.y - pos.y);
      if (dist < minDist) {
        minDist = dist;
        closest = ap;
      }
    }
    return closest;
  }

  destroy() {
    const svg = this.chart.getSvgRoot();
    svg.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('blur', this.cancelDrag.bind(this));
    this.cancelDrag();
  }
}
