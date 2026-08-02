import type { SvgFlowChart } from "../SvgFlowChart";
import type { SvgStore } from "../store/SvgStore";
import type { ViewportManager } from "../viewport/ViewportManager";
import { DragManager } from "../interaction/DragManager";
import type { SelectionManager } from "../selection/SelectionManager";
import { createSvgElement, createContextMenu, createMenuItem } from "../../utils/dom";
import type { AnchorPoint, FlowConnection, FlowNode, LabelConfig, ArrowConfig } from "../../types/SvgModel";
import type { Point } from "../../types/geometry";
import { generatePath } from "../../calc";
import { NodeShape, ArrowDirection } from "../../types/SvgModel";

export class SvgRenderer {
  private readonly chart: SvgFlowChart;
  private readonly svgRoot: SVGSVGElement;
  private readonly store: SvgStore;
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

  // ===================== 节点渲染（支持多种形状） =====================
  private renderNodes() {
    this.nodeLayer.innerHTML = "";
    const nodes = this.store.getAllNodes();

    for (const node of nodes) {
      const g = createSvgElement("g") as SVGGElement;
      g.setAttribute("data-node-id", node.id);

      const isSelected = this.selection.isSelected("node", node.id);
      const strokeColor = isSelected ? "#ff6622" : (node.stroke || "#5588dd");
      const strokeWidth = isSelected ? 3 : (node.strokeWidth || 2);

      let shapeEl: SVGElement;
      switch (node.shape) {
        case "circle":
          shapeEl = this.createCircle(node, strokeColor, strokeWidth);
          break;
        case "diamond":
          shapeEl = this.createDiamond(node, strokeColor, strokeWidth);
          break;
        case "ellipse":
          shapeEl = this.createEllipse(node, strokeColor, strokeWidth);
          break;
        default: // rectangle
          shapeEl = this.createRect(node, strokeColor, strokeWidth);
          break;
      }

      g.appendChild(shapeEl);

      // 节点标签文本
      if (node.label) {
        const text = createSvgElement("text") as SVGTextElement;
        text.setAttribute("x", String(node.x + node.width / 2));
        text.setAttribute("y", String(node.y + node.height / 2 + 6));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#222222");
        text.setAttribute("font-size", "14");
        text.textContent = node.label;
        g.appendChild(text);
      }

      // 事件绑定：点击选中节点
      shapeEl.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.selection.select("node", node.id);
      });

      this.nodeLayer.appendChild(g);
    }
  }

  // ---- 创建各种形状的辅助方法 ----
  private createRect(node: FlowNode, stroke: string, strokeWidth: number): SVGRectElement {
    const rect = createSvgElement("rect") as SVGRectElement;
    rect.setAttribute("x", String(node.x));
    rect.setAttribute("y", String(node.y));
    rect.setAttribute("width", String(node.width));
    rect.setAttribute("height", String(node.height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", node.fill || "#ffffff");
    rect.setAttribute("stroke", stroke);
    rect.setAttribute("stroke-width", String(strokeWidth));
    return rect;
  }

  private createCircle(node: FlowNode, stroke: string, strokeWidth: number): SVGCircleElement {
    const circle = createSvgElement("circle") as SVGCircleElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const r = Math.min(node.width, node.height) / 2;
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", node.fill || "#ffffff");
    circle.setAttribute("stroke", stroke);
    circle.setAttribute("stroke-width", String(strokeWidth));
    return circle;
  }

  private createDiamond(node: FlowNode, stroke: string, strokeWidth: number): SVGPolygonElement {
    const poly = createSvgElement("polygon") as SVGPolygonElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const hw = node.width / 2;
    const hh = node.height / 2;
    const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
    poly.setAttribute("points", points);
    poly.setAttribute("fill", node.fill || "#ffffff");
    poly.setAttribute("stroke", stroke);
    poly.setAttribute("stroke-width", String(strokeWidth));
    return poly;
  }

  private createEllipse(node: FlowNode, stroke: string, strokeWidth: number): SVGEllipseElement {
    const ellipse = createSvgElement("ellipse") as SVGEllipseElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const rx = node.width / 2;
    const ry = node.height / 2;
    ellipse.setAttribute("cx", String(cx));
    ellipse.setAttribute("cy", String(cy));
    ellipse.setAttribute("rx", String(rx));
    ellipse.setAttribute("ry", String(ry));
    ellipse.setAttribute("fill", node.fill || "#ffffff");
    ellipse.setAttribute("stroke", stroke);
    ellipse.setAttribute("stroke-width", String(strokeWidth));
    return ellipse;
  }

  // ===================== 锚点渲染 =====================
  private renderAnchorPoints() {
    this.anchorLayer.innerHTML = "";
    const anchors = this.store.getAllAnchorPoints();

    for (const ap of anchors) {
      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;

      const pos = this.store.calcAnchorPos(node, ap);

      // 创建锚点元素（圆点）
      const circle = createSvgElement("circle") as SVGCircleElement;
      circle.setAttribute("cx", String(pos.x));
      circle.setAttribute("cy", String(pos.y));
      circle.setAttribute("r", String(ap.radius || 6));
      circle.style.cursor = "crosshair";
      circle.dataset["anchorId"] = ap.id;

      // 判断锚点模式：static 显示可见，perimeter 显示透明交互区
      if (ap.anchorMode === "perimeter") {
        // 连续锚点：透明交互区（不可见但可点击）
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", "transparent");
        circle.setAttribute("fill-opacity", "0");
        // 适当放大交互半径，提高易用性
        circle.setAttribute("r", String((ap.radius || 6) * 2));
      } else {
        // 固定锚点（static）：可见样式
        circle.setAttribute("fill", ap.fill || "#4285f4");
        circle.setAttribute("stroke", ap.stroke || "#ffffff");
        circle.setAttribute("stroke-width", "2");
        // 保持原有半径
        circle.setAttribute("r", String(ap.radius || 6));
      }

      // 事件绑定：启动锚点拖拽连线
      circle.addEventListener("mousedown", (e) => {
        e.stopPropagation(); // 防止触发其他拖拽
        this.dragManager.startLinkDrag(ap, e);
      });

      this.anchorLayer.appendChild(circle);
    }
  }

  // ===================== 连线渲染（路径 + 标签 + 箭头） =====================
  private renderConnections() {
    this.connectionLayer.innerHTML = "";
    const connections = this.store.getAllConnections();

    for (const conn of connections) {
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;

      const g = createSvgElement("g") as SVGGElement;
      g.dataset["connectionId"] = conn.id;
      g.style.cursor = "pointer";

      // ---- 1. 绘制路径 ----
      const path = createSvgElement("path") as SVGPathElement;
      path.setAttribute("d", pathInfo.pathD);
      path.setAttribute("fill", "none");
      const isSelected = this.selection.isSelected("connection", conn.id);
      path.setAttribute("stroke", isSelected ? "#ff6622" : (conn.stroke || "#666666"));
      path.setAttribute("stroke-width", String(isSelected ? 4 : (conn.strokeWidth || 2)));
      // 添加鼠标 hover 高亮效果（可选，通过 CSS）
      g.appendChild(path);

      // ---- 2. 绘制标签（如果配置了） ----
      if (conn.label) {
        const labelEl = this.renderLabel(conn.label, pathInfo);
        if (labelEl) g.appendChild(labelEl);
      }

      // ---- 3. 绘制箭头（如果配置了） ----
      if (conn.arrow && conn.arrow.direction !== ArrowDirection.NONE) {
        const arrowEl = this.renderArrow(conn.arrow, pathInfo, conn.stroke);
        if (arrowEl) g.appendChild(arrowEl);
      }

      // ---- 事件绑定：点击连线选中 ----
      g.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.selection.select("connection", conn.id);
      });

      this.connectionLayer.appendChild(g);
    }
  }

  /**
   * 渲染连线标签
   * 在连线中点附近绘制文本，支持偏移
   */
  private renderLabel(label: LabelConfig, pathInfo: { start: Point; end: Point; pathD: string }): SVGTextElement | null {
    const mid = this.getPathMidPoint(pathInfo.start, pathInfo.end);
    const text = createSvgElement("text") as SVGTextElement;
    const offset = label.offset || { x: 0, y: -10 };
    text.setAttribute("x", String(mid.x + offset.x));
    text.setAttribute("y", String(mid.y + offset.y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", label.color || "#333333");
    text.setAttribute("font-size", String(label.fontSize || 12));
    text.setAttribute("font-family", "sans-serif");
    text.textContent = label.text;
    // 设置背景（可选），但为了简洁，这里只渲染文本
    return text;
  }

  /**
   * 渲染连线箭头
   * 根据箭头配置在终点或起点绘制三角形箭头
   */
  private renderArrow(arrow: ArrowConfig, pathInfo: { start: Point; end: Point; pathD: string }, defaultColor?: string): SVGPathElement | null {
    const direction = arrow.direction || ArrowDirection.TARGET;
    const length = arrow.length || 10;
    const width = arrow.width || 8;
    const color = arrow.color || defaultColor || "#666666";

    // 计算箭头位置：终点（target）或起点（source）
    const positions: Array<{ point: Point; angle: number }> = [];
    if (direction === ArrowDirection.TARGET || direction === ArrowDirection.BOTH) {
      const angle = this.getLineAngle(pathInfo.start, pathInfo.end);
      positions.push({ point: pathInfo.end, angle });
    }
    if (direction === ArrowDirection.SOURCE || direction === ArrowDirection.BOTH) {
      const angle = this.getLineAngle(pathInfo.end, pathInfo.start); // 反向
      positions.push({ point: pathInfo.start, angle });
    }

    if (positions.length === 0) return null;

    // 生成箭头路径（三角形）
    const arrowPath = createSvgElement("path") as SVGPathElement;
    let d = "";
    for (const pos of positions) {
      const { point, angle } = pos;
      const halfWidth = width / 2;
      // 箭头指向角度（弧度）
      const theta = angle;
      // 箭头三个顶点（相对于点）
      const tip = { x: point.x + Math.cos(theta) * length, y: point.y + Math.sin(theta) * length };
      const left = { x: point.x + Math.cos(theta + Math.PI / 2) * halfWidth, y: point.y + Math.sin(theta + Math.PI / 2) * halfWidth };
      const right = { x: point.x + Math.cos(theta - Math.PI / 2) * halfWidth, y: point.y + Math.sin(theta - Math.PI / 2) * halfWidth };
      // 绘制三角形
      d += `M ${tip.x} ${tip.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z `;
    }
    arrowPath.setAttribute("d", d.trim());
    arrowPath.setAttribute("fill", color);
    arrowPath.setAttribute("stroke", "none");
    arrowPath.setAttribute("pointer-events", "none"); // 箭头不拦截事件
    return arrowPath;
  }

  // ===================== 几何辅助方法 =====================
  /**
   * 计算线段的中点
   */
  private getPathMidPoint(start: Point, end: Point): Point {
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };
  }

  /**
   * 计算从起点到终点的方向角度（弧度）
   */
  private getLineAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
  }

  // ===================== 临时连线（拖拽辅助） =====================
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
    const dStr = `M${pos.x1} ${pos.y1} L${pos.x2} ${pos.y2}`;
    this.tempLineEl.setAttribute("d", dStr);
  }

  clearTempLine() {
    if (this.tempLineEl) {
      this.tempLineEl.remove();
      this.tempLineEl = null;
    }
  }

  getTempLineExists(): boolean {
    return !!this.tempLineEl;
  }

  // ===================== 右键菜单 =====================
  private onContextMenu(evt: MouseEvent) {
    evt.preventDefault();
    const target = evt.target as SVGElement;
    const mouseX = evt.clientX;
    const mouseY = evt.clientY;
    const canvasPos = this.viewport.screenToCanvas({ x: mouseX, y: mouseY });

    this.contextMenu.innerHTML = "";

    // 查找节点ID（兼容多种DOM结构）
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute("data-node-id") ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }

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
            label: node.label + " (副本)",
            shape: node.shape,
            fill: node.fill,
            stroke: node.stroke,
            strokeWidth: node.strokeWidth,
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
          label: "新节点",
          shape: NodeShape.RECTANGLE,
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

  // 在 SvgRenderer 类中增加

  /**
   * 高亮或取消高亮指定锚点（修改描边样式）
   */
  highlightAnchor(anchorId: string, highlight: boolean) {
    // 在 anchorLayer 中查找对应圆点
    const circles = this.anchorLayer.querySelectorAll('circle');
    for (const circle of circles) {
      if (circle.dataset['anchorId'] === anchorId) {
        if (highlight) {
          circle.setAttribute('stroke', '#ff6622');
          circle.setAttribute('stroke-width', '4');
          circle.setAttribute('r', String(Number(circle.getAttribute('r')) + 2));
        } else {
          // 恢复默认样式（需要读取锚点数据）
          const ap = this.store.getAnchorPoint(anchorId);
          if (ap) {
            circle.setAttribute('stroke', ap.stroke || '#ffffff');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', String(ap.radius || 6));
          } else {
            // fallback
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', '6');
          }
        }
        break;
      }
    }
  }
}