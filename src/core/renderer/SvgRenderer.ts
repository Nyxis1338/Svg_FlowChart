import type { SvgFlowChart } from "../SvgFlowChart";
import type { FlowStore } from "../store/FlowStore";
import type { ViewportManager } from "../viewport/ViewportManager";
import { DragManager } from "../interaction/DragManager";
import type { SelectionManager } from "../selection/SelectionManager";
import { createSvgElement, createContextMenu, createMenuItem } from "../../utils/dom";
import type { AnchorPoint, FlowConnection, FlowNode } from "../../types/flow-model";
import type { Point } from "../../types/geometry";
import { generatePath } from "../../calc";

export class SvgRenderer {
  private readonly chart: SvgFlowChart;
  private readonly svgRoot: SVGSVGElement;
  private readonly store: FlowStore;
  private readonly viewport: ViewportManager;
  private readonly dragManager: DragManager;
  private readonly selection: SelectionManager;

  // 渲染图层
  private connectionLayer: SVGGElement;
  private anchorLayer: SVGGElement;
  private nodeLayer: SVGGElement;

  // 临时连线DOM缓存
  private tempLineEl: SVGPathElement | null = null;

  // 右键菜单
  private contextMenu: HTMLDivElement;

  constructor(chart: SvgFlowChart) {
    this.chart = chart;
    this.svgRoot = chart.getSvgRoot();
    this.store = chart.store;
    this.viewport = chart.viewport;
    this.dragManager = chart.dragManager;
    this.selection = chart.selection;

    // 分层初始化
    this.connectionLayer = createSvgElement("g") as SVGGElement;
    this.anchorLayer = createSvgElement("g") as SVGGElement;
    this.nodeLayer = createSvgElement("g") as SVGGElement;

    const contentGroup = this.viewport.getContentGroup();
    contentGroup.appendChild(this.connectionLayer);
    contentGroup.appendChild(this.anchorLayer);
    contentGroup.appendChild(this.nodeLayer);

    // 右键菜单初始化
    this.contextMenu = createContextMenu();
    document.body.appendChild(this.contextMenu);

    // 右键监听
    this.svgRoot.addEventListener("contextmenu", this.onContextMenu.bind(this));
    document.addEventListener("mousedown", this.hideContextMenu.bind(this));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hideContextMenu();
    });

    // 点击空白画布清空选择
    this.svgRoot.addEventListener("mousedown", () => {    
      this.selection.clear();
    });
    // 数据订阅重绘
    this.store.subscribe(() => this.renderAll());
    this.selection.subscribe(() => this.renderAll());
  }

  renderAll() {
    this.renderConnections();
    this.renderAnchorPoints();
    this.renderNodes();
  }


  private renderNodes() {
    this.nodeLayer.innerHTML = "";
    const nodes = this.store.getAllNodes();
    const selected = this.selection.getSelection();

    for (const node of nodes) {
      const g = createSvgElement("g") as SVGGElement;
      // 改用 setAttribute 兼容SVG dataset
      g.setAttribute("data-node-id", node.id);

      // 【关键】删除 e.stopPropagation()，否则svg根收不到mousedown
      const rect = createSvgElement("rect") as SVGRectElement;
      rect.setAttribute("x", String(node.x));
      rect.setAttribute("y", String(node.y));
      rect.setAttribute("width", String(node.width));
      rect.setAttribute("height", String(node.height));
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", "#ffffff");

      if (this.selection.isSelected("node", node.id)) {
        rect.setAttribute("stroke", "#ff6622");
        rect.setAttribute("stroke-width", "3");
      } else {
        rect.setAttribute("stroke", "#5588dd");
        rect.setAttribute("stroke-width", "2");
      }

      rect.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.selection.select("node", node.id);
      });

      const text = createSvgElement("text") as SVGTextElement;
      text.setAttribute("x", String(node.x + node.width / 2));
      text.setAttribute("y", String(node.y + node.height / 2 + 6));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#222222");
      text.setAttribute("font-size", "14");
      text.textContent = node.label ?? "";

      g.appendChild(rect);
      g.appendChild(text);
      this.nodeLayer.appendChild(g);
    }
  }

private renderAnchorPoints() {
  this.anchorLayer.innerHTML = "";
  const anchors = this.store.getAllAnchorPoints();
  for (const ap of anchors) {
    const node = this.store.getNode(ap.nodeId);
    if (!node) continue;
    const pos: Point = this.store.calcAnchorPos(node, ap);
    const circle = createSvgElement("circle") as SVGCircleElement;
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.setAttribute("r", String(ap.radius));
    circle.setAttribute("fill", "#4285f4");
    circle.style.cursor = "crosshair";
    circle.dataset["anchorId"] = ap.id;
    // 仅调用拖拽，禁止stopPropagation，保证window.mousemove接收鼠标移动
    circle.addEventListener("mousedown", (e) => {
      this.dragManager.startLinkDrag(ap, e);
    });
    this.anchorLayer.appendChild(circle);
  }
}

private renderConnections() {
  this.connectionLayer.innerHTML = "";
  const connections = this.store.getAllConnections();
  for (const conn of connections) {
    const pathInfo = this.store.computeConnectionPath(conn);
    if (!pathInfo) continue;
    const path = createSvgElement("path") as SVGPathElement;
    path.setAttribute("d", pathInfo.pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", conn.stroke ?? "#666");
    path.setAttribute("stroke-width", String(conn.strokeWidth ?? 2));
    path.dataset["connectionId"] = conn.id;
    // 点击连线选中，阻止冒泡到画布清空选择
    path.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.selection.select("connection", conn.id);
    });
    this.connectionLayer.appendChild(path);
  }
}

  // 更新临时虚线
setTempLine(pos: { x1: number; y1: number; x2: number; y2: number }) {
  if (!this.tempLineEl) {
    this.tempLineEl = createSvgElement("path") as SVGPathElement;
    this.tempLineEl.setAttribute("stroke", "#000000");
    this.tempLineEl.setAttribute("stroke-width", "2.5");
    this.tempLineEl.setAttribute("fill", "none");
    this.tempLineEl.setAttribute("stroke-dasharray", "8 4");
    this.tempLineEl.setAttribute("pointer-events", "none");
    this.connectionLayer.appendChild(this.tempLineEl);
  }
  // 临时拖拽虚线：固定直线，不要流程图折线，对齐jsPlumb拖拽视觉
  const dStr = `M${pos.x1} ${pos.y1} L${pos.x2} ${pos.y2}`;
  this.tempLineEl.setAttribute("d", dStr);
}

clearTempLine() {
  if (this.tempLineEl) {
    this.tempLineEl.remove();
    this.tempLineEl = null;
  }
}

  // 右键菜单事件
  private onContextMenu(evt: MouseEvent) {
    evt.preventDefault();
    const target = evt.target as SVGElement;
    const mouseX = evt.clientX;
    const mouseY = evt.clientY;
    const canvasPos = this.viewport.screenToCanvas({ x: mouseX, y: mouseY });

    this.contextMenu.innerHTML = "";

    const nodeId = (target.parentElement?.dataset["nodeId"]) || target.dataset["nodeId"];
    const connId = target.dataset["connectionId"];

    if (nodeId) {
      const node = this.store.getNode(nodeId);
      if (node) {
        const copyItem = createMenuItem("复制节点", () => {
          this.store.addNodeWithAnchors({
            x: node.x + 30,
            y: node.y + 30,
            width: node.width,
            height: node.height,
            label: node.label + " (副本)"
          });
          this.hideContextMenu();
        });
        const delItem = createMenuItem("删除节点", () => {
          this.store.deleteSelected("node", nodeId);
          this.selection.clear();
          this.hideContextMenu();
        });
        this.contextMenu.appendChild(copyItem);
        this.contextMenu.appendChild(delItem);
      }
    } else if (connId) {
      const delItem = createMenuItem("删除连线", () => {
        this.store.deleteSelected("connection", connId);
        this.selection.clear();
        this.hideContextMenu();
      });
      this.contextMenu.appendChild(delItem);
    } else {
      const addItem = createMenuItem("新增节点", () => {
        this.store.addNodeWithAnchors({
          x: canvasPos.x,
          y: canvasPos.y,
          width: 140,
          height: 80,
          label: "新节点"
        });
        this.hideContextMenu();
      });
      this.contextMenu.appendChild(addItem);
    }

    // 边界避让
    const menuW = 130;
    const menuH = 120;
    let left = mouseX;
    let top = mouseY;
    if (mouseX + menuW > window.innerWidth) left = mouseX - menuW;
    if (mouseY + menuH > window.innerHeight) top = mouseY - menuH;

    this.contextMenu.style.left = left + "px";
    this.contextMenu.style.top = top + "px";
    this.contextMenu.style.display = "block";
  }

  private hideContextMenu() {
    this.contextMenu.style.display = "none";
  }

  destroy() {
    this.connectionLayer.innerHTML = "";
    this.nodeLayer.innerHTML = "";
    this.anchorLayer.innerHTML = "";
    this.tempLineEl = null;
    this.contextMenu.remove();
  }

  // 调试用：返回临时线是否存在
  getTempLineExists(): boolean {
    return !!this.tempLineEl;
  }
}