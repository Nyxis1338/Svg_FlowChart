import type { Point } from "../../types/geometry";
import { createSvgElement } from "../../utils/dom";
export class ViewportManager {
  public readonly svg: SVGSVGElement;
  // Surface基准容器：所有业务坐标基准，transform仅作用于此
  public readonly contentGroup: SVGGElement;
  private gridLayer: SVGGElement;

  // PanZoom变换参数（仅视觉，不修改业务数据）
  private translate: Point = { x: 0, y: 0 };
  private scale = 1;
  private spacePressed = false;
  private dragStart: Point | null = null;

  private viewChangeCallbacks: Array<() => void> = [];
  private readonly gridSize = 20;
  private readonly gridColor = "#e5e7eb";

  constructor(svgRoot: SVGSVGElement) {
    this.svg = svgRoot;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

    // Surface基准层
    this.contentGroup = createSvgElement("g") as SVGGElement;
    this.gridLayer = createSvgElement("g") as SVGGElement;
    this.renderGrid();
    this.contentGroup.prepend(this.gridLayer);
    this.svg.appendChild(this.contentGroup);

    this.bindEvents();
    this.applyTransform();
  }

  subscribe(cb: () => void) {
    this.viewChangeCallbacks.push(cb);
    return () => {
      const idx = this.viewChangeCallbacks.indexOf(cb);
      if (idx > -1) this.viewChangeCallbacks.splice(idx, 1);
    };
  }
  private triggerChange() {
    this.viewChangeCallbacks.forEach(cb => cb());
  }

  private renderGrid() {
    this.gridLayer.innerHTML = "";
    const defs = createSvgElement("defs") as SVGElement;
    const pattern = createSvgElement("pattern") as SVGElement;
    pattern.setAttribute("id", "gridPattern");
    pattern.setAttribute("width", String(this.gridSize));
    pattern.setAttribute("height", String(this.gridSize));
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    const path = createSvgElement("path") as SVGPathElement;
    path.setAttribute("d", `M ${this.gridSize} 0 L 0 0 L 0 ${this.gridSize}`);
    path.setAttribute("stroke", this.gridColor);
    path.setAttribute("stroke-width", "0.5");
    path.setAttribute("fill", "none");
    pattern.appendChild(path);
    defs.appendChild(pattern);
    this.gridLayer.appendChild(defs);
    const bgRect = createSvgElement("rect") as SVGRectElement;
    bgRect.setAttribute("x", "-100000");
    bgRect.setAttribute("y", "-100000");
    bgRect.setAttribute("width", "200000");
    bgRect.setAttribute("height", "200000");
    bgRect.setAttribute("fill", "url(#gridPattern)");
    bgRect.setAttribute("pointer-events", "none");
    this.gridLayer.appendChild(bgRect);
  }

  private bindEvents() {
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));
    this.svg.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.svg.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
    window.addEventListener("resize", this.renderGrid.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.code === "Space") {
      e.preventDefault();
      this.spacePressed = true;
      this.svg.style.cursor = "grab";
    }
  }
  private onKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") {
      this.spacePressed = false;
      this.dragStart = null;
      this.svg.style.cursor = "";
    }
  }
  private onMouseDown(e: MouseEvent) {
    if (!this.spacePressed) return;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.svg.style.cursor = "grabbing";
  }
  private onMouseMove(e: MouseEvent) {
    if (!this.spacePressed || !this.dragStart) {
      this.svg.style.cursor = "";
      this.dragStart = null;
      return;
    }
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    this.translate.x += dx;
    this.translate.y += dy;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.applyTransform();
    this.triggerChange();
  }
  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomSpeed = 0.08;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.max(0.3, Math.min(3, this.scale + delta));
    const mouseScreen = { x: e.clientX, y: e.clientY };
    const mouseCanvas = this.screenToCanvas(mouseScreen);
    this.scale = newScale;
    const newMouseCanvas = this.screenToCanvas(mouseScreen);
    this.translate.x += mouseCanvas.x - newMouseCanvas.x;
    this.translate.y += mouseCanvas.y - newMouseCanvas.y;
    this.applyTransform();
    this.triggerChange();
  }

  // 应用PanZoom变换，仅作用Surface容器（复刻jsPlumb）
  private applyTransform() {
    this.contentGroup.setAttribute("transform", `translate(${this.translate.x} ${this.translate.y}) scale(${this.scale})`);
  }

  // ========== 标准化坐标转换（核心，全局唯一转换方法）==========
  /**
   * 屏幕像素坐标 → 画布业务逻辑坐标（基准：contentGroup左上角(0,0)，完全对齐jsPlumb）
   * @param point clientX/clientY 屏幕坐标
   * @returns 纯业务坐标，与节点x/y、锚点计算同一坐标系
   */
  screenToCanvas(point: Point): Point {
    // 1. 获取Surface容器DOM边界
    const surfaceRect = this.contentGroup.getBoundingClientRect();
    // 2. 转换为Surface容器内部相对坐标
    const surfaceX = point.x - surfaceRect.left;
    const surfaceY = point.y - surfaceRect.top;
    // 3. 抵消平移、缩放，还原原始业务逻辑坐标
    const logicX = (surfaceX - this.translate.x) / this.scale;
    const logicY = (surfaceY - this.translate.y) / this.scale;
    return { x: logicX, y: logicY };
  }

  /**
   * 画布业务逻辑坐标 → 屏幕像素坐标（渲染反向换算）
   */
  canvasToScreen(point: Point): Point {
    const surfaceRect = this.contentGroup.getBoundingClientRect();
    const surfaceX = point.x * this.scale + this.translate.x;
    const surfaceY = point.y * this.scale + this.translate.y;
    return {
      x: surfaceX + surfaceRect.left,
      y: surfaceY + surfaceRect.top
    };
  }

  isSpaceActive(): boolean {
    return this.spacePressed;
  }
  getContentGroup(): SVGGElement {
    return this.contentGroup;
  }
  destroy() {
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("keyup", this.onKeyUp.bind(this));
    this.svg.removeEventListener("mousedown", this.onMouseDown.bind(this));
    window.removeEventListener("mousemove", this.onMouseMove.bind(this));
    this.svg.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.renderGrid.bind(this));
    this.viewChangeCallbacks = [];
  }
}