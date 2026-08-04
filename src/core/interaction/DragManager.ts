import type { SvgEngine } from "../SvgEngine";
import type { Store } from "../store/Store";
import type { ViewportManager } from "../viewport/ViewportManager";
import type { SvgRenderer } from "../renderer/SvgRenderer";
import type { SelectionManager } from "../selection/SelectionManager";
import type { Anchor, Node, Connection } from "../../types/SvgModel";
import type { Point } from "../../types/geometry";
import { ConnectorType } from "../../types/SvgModel";

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
  private linkDragData: {
    sourceAnchorId: string;
    startX: number;
    startY: number;
    type: 'create' | 'reconnect';
    connectionId?: string;
    oldTargetAnchorId?: string;
  } | null = null;

  private highlightedAnchor: Anchor | null = null;

  // Raf 节流
  private rafId: number | null = null;
  private lastMoveEvent: MouseEvent | null = null;

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.bindEvents();
  }

  private get store() { return this.chart.store; }
  private get viewport() { return this.chart.viewport; }
  private get selection() { return this.chart.selection; }
  private get renderer() { return this.chart.renderer; }

  private bindEvents() {
    const svg = this.chart.getSvgRoot();
    svg.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this), { passive: true });
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("blur", this.cancelDrag.bind(this));
  }

  private onMouseDown(evt: MouseEvent) {
    if (this.state !== DragState.IDLE) return;

    const target = evt.target as SVGElement;
    // 锚点由 startLinkDrag 处理
    if (target.tagName === "circle" && target.hasAttribute("data-anchor-id")) {
      return;
    }

    // 查找节点
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute("data-node-id") ?? undefined;
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
    this.state = DragState.NODE_DRAGGING;
  }

  startLinkDrag(anchor: Anchor, evt: MouseEvent, existingConnection?: Connection) {
    if (this.viewport.isSpaceActive() || this.state !== DragState.IDLE) return;

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;
    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    const isReconnect = !!existingConnection;

    if (isReconnect) {
      const conn = existingConnection!;
      const isTarget = conn.targetAnchorId === anchor.id;
      if (!isTarget) {
        console.warn("目前只支持从目标端重连");
        return;
      }
      this.linkDragData = {
        sourceAnchorId: anchor.id,
        startX: anchorPos.x,
        startY: anchorPos.y,
        type: 'reconnect',
        connectionId: conn.id,
        oldTargetAnchorId: conn.targetAnchorId,
      };
    } else {
      this.linkDragData = {
        sourceAnchorId: anchor.id,
        startX: anchorPos.x,
        startY: anchorPos.y,
        type: 'create',
      };
    }

    this.state = DragState.LINK_DRAGGING;
    evt.preventDefault();
    this.chart.getSvgRoot().style.cursor = "grabbing";
    this.clearHighlight();
  }

  private onMouseMove(evt: MouseEvent) {
    // 只保存最新事件，用 raf 处理
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
      // 更新临时虚线（半透明灰色，并绘制端点圆点）
      this.renderer.setTempLine({
        x1: this.linkDragData.startX,
        y1: this.linkDragData.startY,
        x2: canvasPos.x,
        y2: canvasPos.y,
      },
      ConnectorType.FLOWCHART // 或从连线配置中读取
      );

      // 磁吸检测
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

  private onMouseUp(evt: MouseEvent) {
    this.chart.getSvgRoot().style.cursor = "";
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // 处理节点拖拽结束
    if (this.state === DragState.NODE_DRAGGING && this.nodeDragData) {
      const nodeId = this.nodeDragData.nodeId;
      this.selection.select("node", nodeId);
      this.nodeDragData = null;
      this.state = DragState.IDLE;
      return;
    }

    // 处理连线拖拽结束
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
                if (conn.targetAnchorId !== hitAnchor.id) {
                  const exist = this.store.getAllConnections().some(c =>
                    c.id !== connId &&
                    c.sourceAnchorId === sourceAnchor.id &&
                    c.targetAnchorId === hitAnchor.id
                  );
                  if (!exist) {
                    this.store.updateConnection(connId, { targetAnchorId: hitAnchor.id });
                    success = true;
                  }
                }
              }
            }
          } else {
            const exist = this.store.getAllConnections().some(c =>
              c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id
            );
            if (!exist) {
              this.store.addConnection({
                id: crypto.randomUUID(),
                connectorType: ConnectorType.FLOWCHART,
                sourceAnchorId: sourceAnchor.id,
                targetAnchorId: hitAnchor.id,
                stroke: "#444444",
                strokeWidth: 2,
              });
              success = true;
            }
          }
        }
      }

      if (!success && isReconnect) {
        const connId = this.linkDragData.connectionId;
        const oldTargetId = this.linkDragData.oldTargetAnchorId;
        if (connId && oldTargetId) {
          this.store.updateConnection(connId, { targetAnchorId: oldTargetId });
        }
      }

      this.clearHighlight();
      this.renderer.clearTempLine();
      this.linkDragData = null;
      this.state = DragState.IDLE;
    }
  }

  private onKeyDown(evt: KeyboardEvent) {
    if (evt.key === "Escape") {
      this.cancelDrag();
      return;
    }

    if (evt.key === "Delete" || evt.key === "Backspace") {
      const sel = this.selection.getSelection();
      if (!sel.type || sel.type === "anchor" || !sel.id) return;
      const confirmMsg = sel.type === "node"
        ? "确定删除节点（关联锚点、连线会一并清除）？"
        : "确定删除当前连线？";
      if (!window.confirm(confirmMsg)) return;
      if (sel.type === "node") {
        this.store.removeNode(sel.id);
      } else if (sel.type === "connection") {
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
    this.clearHighlight();
    this.renderer.clearTempLine();
    this.chart.getSvgRoot().style.cursor = "";

    if (this.state === DragState.HOVERING && this.linkDragData?.type === 'reconnect') {
      const connId = this.linkDragData.connectionId;
      const oldTargetId = this.linkDragData.oldTargetAnchorId;
      if (connId && oldTargetId) {
        this.store.updateConnection(connId, { targetAnchorId: oldTargetId });
      }
    }

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

    for (const ap of allAnchors) {
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
    svg.removeEventListener("mousedown", this.onMouseDown.bind(this));
    window.removeEventListener("mousemove", this.onMouseMove.bind(this));
    window.removeEventListener("mouseup", this.onMouseUp.bind(this));
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("blur", this.cancelDrag.bind(this));
    this.cancelDrag();
  }
}