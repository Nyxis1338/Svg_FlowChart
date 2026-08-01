import type { Point } from "../../types/geometry";
import { createSvgElement } from "../../utils/dom";

export class ViewportManager {
  public readonly svg: SVGSVGElement;
  public readonly contentGroup: SVGGElement;
  private gridLayer: SVGGElement;

  // 视口变换参数
  private translate: Point = { x: 0, y: 0 };
  private scale = 1;
  private spacePressed = false;
  private dragStart: Point | null = null;

  // 订阅回调列表
  private viewChangeCallbacks: Array<() => void> = [];

  // 网格配置
  private readonly gridSize = 20;
  private readonly gridColor = "#e5e7eb";

  constructor(svgRoot: SVGSVGElement) {
    this.svg = svgRoot;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

    // 根变换组
    this.contentGroup = createSvgElement("g") as SVGGElement;
    this.gridLayer = createSvgElement("g") as SVGGElement;
    this.renderGrid();

    this.contentGroup.prepend(this.gridLayer);
    this.svg.appendChild(this.contentGroup);

    this.bindEvents();
    this.applyTransform();
  }

  // 订阅视口变化，返回取消函数
  subscribe(cb: () => void) {
    this.viewChangeCallbacks.push(cb);
    return () => {
      const idx = this.viewChangeCallbacks.indexOf(cb);
      if (idx > -1) this.viewChangeCallbacks.splice(idx, 1);
    };
  }

  // 触发所有视口更新回调
  private triggerChange() {
    this.viewChangeCallbacks.forEach(cb => cb());
  }

  // 【无限平铺网格修复】不再按屏幕尺寸生成，用pattern无限填充
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

  // 修复松开空格仍可拖拽BUG：实时校验spacePressed状态
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

  // 滚轮缩放
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
    this.translate.y += mouseCanvas.y;

    this.applyTransform();
    this.triggerChange();
  }

  private applyTransform() {
    this.contentGroup.setAttribute("transform", `translate(${this.translate.x} ${this.translate.y}) scale(${this.scale})`);
  }

  // 屏幕坐标 → 画布逻辑坐标
  screenToCanvas(point: Point): Point {
    return {
      x: (point.x - this.translate.x) / this.scale,
      y: (point.y - this.translate.y)
    };
  }

  // 画布坐标 → 屏幕坐标
  canvasToScreen(point: Point): Point {
    return {
      x: point.x * this.scale + this.translate.x,
      y: point.y * this.scale + this.translate.y
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