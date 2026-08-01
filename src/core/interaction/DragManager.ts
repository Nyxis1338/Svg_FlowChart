import { FlowStore } from "../store/FlowStore";
import { SvgRenderer } from "../renderer/SvgRenderer";
import { SelectionManager } from "../selection/SelectionManager";
import { ViewportManager } from "../viewport/ViewportManager";
import type { Point } from "../../types/geometry";
import { generatePath } from "../../calc/connector";
import type { AnchorPoint, FlowConnection } from "../../types/flow-model";
import { uuidv4 } from "../../utils/uuid";

type DragTargetType = "node" | "anchor-new-link" | "connection-edit-start" | "connection-edit-end" | null;

interface DragState {
  active: boolean;
  targetType: DragTargetType;
  targetId: string | null;
  startMouse: Point;
  originItemPos: Point;
  dragFromAnchor?: AnchorPoint;
  editingConnection?: FlowConnection;
  tempPathEl?: SVGPathElement;
  isDragging: boolean;
}

export class DragManager {
  private readonly store: FlowStore;
  private readonly renderer: SvgRenderer;
  private readonly selection: SelectionManager;
  private readonly viewport: ViewportManager;
  private svg: SVGSVGElement;
  private readonly connectionGrabThreshold = 35;

  private dragState: DragState = {
    active: false,
    targetType: null,
    targetId: null,
    startMouse: { x: 0, y: 0 },
    originItemPos: { x: 0, y: 0 },
    isDragging: false
  };

  constructor(
    store: FlowStore,
    renderer: SvgRenderer,
    selection: SelectionManager,
    viewport: ViewportManager
  ) {
    this.store = store;
    this.renderer = renderer;
    this.selection = selection;
    this.viewport = viewport;
    this.svg = renderer.getSvgElement();
    this.bindEvents();
  }

  private bindEvents() {
    this.svg.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("mouseleave", this.onMouseUp.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  // 屏幕坐标 → 画布逻辑坐标（适配缩放+平移）
  private getCanvasPoint(evt: MouseEvent): Point {
    const screenPt: Point = { x: evt.clientX, y: evt.clientY };
    return this.viewport.screenToCanvas(screenPt);
  }

  private hitTest(event: MouseEvent): { type: DragTargetType; id: string | null } {
    const target = event.target as SVGElement;
    const anchorId = (target as any).dataset?.anchorId;
    const nodeGroup = target.closest<SVGGElement>('[data-node-id]');
    const pathEl = target as SVGPathElement;
    const connId = pathEl.dataset?.connectionId;

    if (anchorId) return { type: "anchor-new-link", id: anchorId };
    if (connId) {
      const conn = this.store.getConnection(connId);
      if (!conn || conn.sourceNodeId || conn.targetNodeId) return { type: null, id: null };
      const pathData = this.store.computeConnectionPath(conn);
      if (!pathData) return { type: null, id: null };
      const mousePos = this.getCanvasPoint(event);
      const distStart = Math.hypot(mousePos.x - pathData.start.x, mousePos.y - pathData.start.y);
      const distEnd = Math.hypot(mousePos.x - pathData.end.x, mousePos.y - pathData.end.y);
      if (distStart < this.connectionGrabThreshold) return { type: "connection-edit-start", id: connId };
      if (distEnd < this.connectionGrabThreshold) return { type: "connection-edit-end", id: connId };
    }
    if (nodeGroup) return { type: "node", id: nodeGroup.dataset.nodeId! };
    return { type: null, id: null };
  }

  private onKeyDown(evt: KeyboardEvent) {
    if (evt.key !== "Delete" && evt.key !== "Backspace") return;
    const sel = this.selection.getSelection();
    if (!sel.type || !sel.id) return;
    // 增加确认弹窗
    const confirmDel = window.confirm("确定要删除选中元素吗？");
    if (!confirmDel) return;
    this.store.deleteSelected(sel.type, sel.id);
    this.selection.clear();
  }

  private onMouseDown(evt: MouseEvent) {
    // 空格按下，交给视口平移，阻断拖拽逻辑
    if (this.viewport.isSpaceActive()) return;
    const hit = this.hitTest(evt);
    if (!hit.type || !hit.id) {
      this.selection.clear();
      return;
    }
    evt.preventDefault();
    const mousePos = this.getCanvasPoint(evt);
    this.dragState.active = true;
    this.dragState.isDragging = false;
    this.dragState.targetType = hit.type;
    this.dragState.targetId = hit.id;
    this.dragState.startMouse = mousePos;

    if (hit.type === "node") {
      const node = this.store.getNode(hit.id);
      if (!node) return;
      this.dragState.originItemPos = { x: node.x, y: node.y };
    } else if (hit.type === "anchor-new-link") {
      const ap = this.store.getAnchorPoint(hit.id);
      if (!ap || ap.direction !== "output") {
        this.dragState.active = false;
        return;
      }
      this.dragState.dragFromAnchor = ap;
      this.createTempLine();
    } else if (hit.type === "connection-edit-start" || hit.type === "connection-edit-end") {
      const conn = this.store.getConnection(hit.id);
      if (!conn) {
        this.dragState.active = false;
        return;
      }
      this.dragState.editingConnection = conn;
      this.createTempLine();
    }
  }

  private onMouseMove(evt: MouseEvent) {
    if (!this.dragState.active) return;
    const mouse = this.getCanvasPoint(evt);
    const dx = mouse.x - this.dragState.startMouse.x;
    const dy = mouse.y - this.dragState.startMouse.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragState.isDragging = true;

    if (this.dragState.targetType === "node" && this.dragState.targetId) {
      const newX = this.dragState.originItemPos.x + dx;
      const newY = this.dragState.originItemPos.y + dy;
      this.store.updateNode(this.dragState.targetId, { x: newX, y: newY });
    } else if (this.dragState.targetType === "anchor-new-link" && this.dragState.dragFromAnchor && this.dragState.tempPathEl) {
      const ap = this.dragState.dragFromAnchor;
      const sourceNode = this.store.getNode(ap.nodeId);
      if (!sourceNode) return;
      const startPos = this.store.calcAnchorPos(sourceNode, ap);
      this.dragState.tempPathEl.setAttribute("d", generatePath("flowchart", startPos, mouse));
    } else if ((this.dragState.targetType === "connection-edit-start" || this.dragState.targetType === "connection-edit-end")
      && this.dragState.editingConnection && this.dragState.tempPathEl) {
      const conn = this.dragState.editingConnection;
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) return;
      let start = pathInfo.start;
      let end = pathInfo.end;
      if (this.dragState.targetType === "connection-edit-start") start = mouse;
      else end = mouse;
      this.dragState.tempPathEl.setAttribute("d", generatePath("flowchart", start, end));
    }
  }

  private onMouseUp(evt: MouseEvent) {
    if (!this.dragState.active) {
      this.clearDragState();
      return;
    }
    const hit = this.hitTest(evt);
    const isClick = !this.dragState.isDragging;

    // 单击选中逻辑
    if (isClick && hit.type && hit.id) {
      if (hit.type === "node") this.selection.select("node", hit.id);
      else if (hit.type === "anchor-new-link") this.selection.select("anchorPoint", hit.id);
      else if (hit.type === "connection-edit-start" || hit.type === "connection-edit-end") this.selection.select("connection", hit.id);
    }

    // 新建连线（移除异步import uuid，直接使用本地uuidv4）
    if (this.dragState.targetType === "anchor-new-link" && this.dragState.dragFromAnchor) {
      const sourceAp = this.dragState.dragFromAnchor;
      if (hit.type === "anchor-new-link" && hit.id) {
        const targetAp = this.store.getAnchorPoint(hit.id);
        if (targetAp && targetAp.direction === "input" && sourceAp.id !== targetAp.id) {
          this.store.addConnection({
            id: uuidv4(),
            connectorType: "flowchart",
            sourceAnchorId: sourceAp.id,
            targetAnchorId: targetAp.id,
            stroke: "#333",
            strokeWidth: 2
          });
        }
      }
    }

    // 修改连线起点
    if (this.dragState.targetType === "connection-edit-start" && this.dragState.editingConnection) {
      const conn = this.dragState.editingConnection;
      if (hit.type === "anchor-new-link" && hit.id) {
        const newSourceAp = this.store.getAnchorPoint(hit.id);
        if (newSourceAp && newSourceAp.direction === "output") {
          this.store.updateConnection(conn.id, { sourceAnchorId: newSourceAp.id });
        }
      }
    }

    // 修改连线终点
    if (this.dragState.targetType === "connection-edit-end" && this.dragState.editingConnection) {
      const conn = this.dragState.editingConnection;
      if (hit.type === "anchor-new-link" && hit.id) {
        const newTargetAp = this.store.getAnchorPoint(hit.id);
        if (newTargetAp && newTargetAp.direction === "input") {
          this.store.updateConnection(conn.id, { targetAnchorId: newTargetAp.id });
        }
      }
    }

    this.removeTempLine();
    this.clearDragState();
  }

  private createTempLine() {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#888");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-dasharray", "6 4");
    this.viewport.getContentGroup().appendChild(path);
    this.dragState.tempPathEl = path;
  }

  private removeTempLine() {
    if (this.dragState.tempPathEl) {
      this.dragState.tempPathEl.remove();
      this.dragState.tempPathEl = undefined;
    }
  }

  private clearDragState() {
    this.dragState = {
      active: false,
      targetType: null,
      targetId: null,
      startMouse: { x: 0, y: 0 },
      originItemPos: { x: 0, y: 0 },
      isDragging: false
    };
  }

  destroy() {
    this.removeTempLine();
    window.removeEventListener("mousemove", this.onMouseMove.bind(this));
    window.removeEventListener("mouseup", this.onMouseUp.bind(this));
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
  }
}