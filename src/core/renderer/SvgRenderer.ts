import { FlowStore } from "../store/FlowStore";
import { SelectionManager } from "../selection/SelectionManager";
import { ViewportManager } from "../viewport/ViewportManager";
import type { Point, Rect } from "../../types/geometry";
import type { AnchorPoint, FlowConnection, FlowNode } from "../../types/flow-model";

type RenderLayerName = "connections" | "anchorPoints" | "nodes";

export class SvgRenderer {
  private readonly container: HTMLElement;
  private svgEl: SVGSVGElement;
  private viewport: ViewportManager; // 去除?，确定不为空
  // 四层图层：连线层 -> 拖拽提示圈层 -> 锚点层 -> 节点层
  private layerConnections: SVGGElement;
  private layerGrabHint: SVGGElement;
  private layerAnchorPoints: SVGGElement;
  private layerNodes: SVGGElement;
  private store: FlowStore;
  private selection: SelectionManager;
  private unsubscribeStore?: () => void;
  private unsubscribeSelection?: () => void;
  private unsubscribeViewport?: () => void;

  constructor(
    container: HTMLElement,
    svgRoot: SVGSVGElement,
    store: FlowStore,
    selection: SelectionManager,
    viewport: ViewportManager // 改为必填，不再可选
  ) {
    this.container = container;
    this.svgEl = svgRoot;
    this.store = store;
    this.selection = selection;
    this.viewport = viewport;

    // 初始化图层
    this.layerConnections = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.layerGrabHint = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.layerAnchorPoints = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.layerNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // 直接调用，无undefined风险
    const canvasGroup = this.viewport.getContentGroup();
    canvasGroup.appendChild(this.layerConnections);
    canvasGroup.appendChild(this.layerGrabHint);
    canvasGroup.appendChild(this.layerAnchorPoints);
    canvasGroup.appendChild(this.layerNodes);

    // 订阅数据变更自动重绘
    this.unsubscribeStore = this.store.subscribe(() => this.renderAll());
    this.unsubscribeSelection = this.selection.subscribe(() => this.renderAll());
    this.unsubscribeViewport = this.viewport.subscribe(() => this.renderAll());

    // 首次渲染
    this.renderAll();
  }

  /** 全量重绘所有画布元素 */
  renderAll() {
    this.clearAllLayers();
    this.renderConnections();
    this.renderGrabHints();
    this.renderAnchorPoints();
    this.renderNodes();
  }

  private clearAllLayers() {
    this.layerConnections.innerHTML = "";
    this.layerGrabHint.innerHTML = "";
    this.layerAnchorPoints.innerHTML = "";
    this.layerNodes.innerHTML = "";
  }

  // 渲染节点
  private renderNodes() {
    const nodes = this.store.getAllNodes();
    const selectInfo = this.selection.getSelection();
    for (const node of nodes) {
      const g = this.createNodeGroup(node, selectInfo);
      this.layerNodes.appendChild(g);
    }
  }

  private createNodeGroup(node: FlowNode, selectInfo: ReturnType<SelectionManager["getSelection"]>): SVGGElement {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.dataset.nodeId = node.id;

    const isActive = selectInfo.type === "node" && selectInfo.id === node.id;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(node.x));
    rect.setAttribute("y", String(node.y));
    rect.setAttribute("width", String(node.width));
    rect.setAttribute("height", String(node.height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", "#ffffff");
    rect.setAttribute("stroke", isActive ? "#2563eb" : "#666");
    rect.setAttribute("stroke-width", isActive ? "2.2" : "1.5");
    g.appendChild(rect);

    if (node.label) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const centerX = node.x + node.width / 2;
      const centerY = node.y + node.height / 2;
      text.setAttribute("x", String(centerX));
      text.setAttribute("y", String(centerY));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("font-size", "13");
      text.setAttribute("fill", "#222");
      text.textContent = node.label;
      g.appendChild(text);
    }
    return g;
  }

  // 渲染锚点
  private renderAnchorPoints() {
    const allAp = this.store.getAllAnchorPoints();
    const selectInfo = this.selection.getSelection();
    for (const ap of allAp) {
      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;
      const pos = this.store.calcAnchorPos(node, ap);
      const isActive = selectInfo.type === "anchorPoint" && selectInfo.id === ap.id;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.dataset.anchorId = ap.id;

      if (isActive) {
        const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outer.setAttribute("cx", String(pos.x));
        outer.setAttribute("cy", String(pos.y));
        outer.setAttribute("r", String((ap.radius ?? 6) + 3));
        outer.setAttribute("fill", "none");
        outer.setAttribute("stroke", "#2563eb");
        outer.setAttribute("stroke-width", "1.5");
        g.appendChild(outer);
      }

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(pos.x));
      circle.setAttribute("cy", String(pos.y));
      circle.setAttribute("r", String(ap.radius ?? 6));
      circle.setAttribute("fill", ap.fill ?? "#3b82f6");
      circle.setAttribute("stroke", ap.stroke ?? "#fff");
      circle.setAttribute("stroke-width", "1.2");
      g.appendChild(circle);
      this.layerAnchorPoints.appendChild(g);
    }
  }

  // 渲染连线
  private renderConnections() {
    const connections = this.store.getAllConnections();
    const selectInfo = this.selection.getSelection();
    for (const conn of connections) {
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;
      const isActive = selectInfo.type === "connection" && selectInfo.id === conn.id;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.dataset.connectionId = conn.id;
      path.setAttribute("d", pathInfo.pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", isActive ? "#2563eb" : (conn.stroke ?? "#444"));
      path.setAttribute("stroke-width", String(isActive ? (conn.strokeWidth ?? 2) + 0.6 : (conn.strokeWidth ?? 2)));
      path.setAttribute("stroke-linecap", "round");
      this.layerConnections.appendChild(path);
    }
  }

  // 渲染连线两端拖拽提示小圆（仅锚点连线生效，连续节点连线不渲染）
  private renderGrabHints() {
    const connections = this.store.getAllConnections();
    for (const conn of connections) {
      if (conn.sourceNodeId || conn.targetNodeId) continue;
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;

      const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c1.setAttribute("cx", String(pathInfo.start.x));
      c1.setAttribute("cy", String(pathInfo.start.y));
      c1.setAttribute("r", "4");
      c1.setAttribute("fill", "#2563eb");
      c1.setAttribute("opacity", "0.6");
      this.layerGrabHint.appendChild(c1);

      const c2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c2.setAttribute("cx", String(pathInfo.end.x));
      c2.setAttribute("cy", String(pathInfo.end.y));
      c2.setAttribute("r", "4");
      c2.setAttribute("fill", "#2563eb");
      c2.setAttribute("opacity", "0.6");
      this.layerGrabHint.appendChild(c2);
    }
  }

  getSvgElement(): SVGSVGElement {
    return this.svgEl;
  }

  destroy() {
    if (this.unsubscribeStore) this.unsubscribeStore();
    if (this.unsubscribeSelection) this.unsubscribeSelection();
    if (this.unsubscribeViewport) this.unsubscribeViewport();
    this.svgEl.remove();
  }

  refresh() {
    this.renderAll();
  }
}