import type { Point } from "../../types/geometry";
import { createSvgElement } from "../../utils/dom";

export class ViewportManager {
  public readonly svg: SVGSVGElement;
  public readonly contentGroup: SVGGElement;
  private gridLayer: SVGGElement;

  // 改为 public 以便外部读取，但通过方法修改以触发变更
  public translate: Point = { x: 0, y: 0 };
  public scale = 1;

  private spacePressed = false;
  private dragStart: Point | null = null;
  private viewChangeCallbacks: Array<() => void> = [];
  private readonly gridSize = 20;
  private readonly gridColor = "#e5e7eb";

  constructor(svgRoot: SVGSVGElement) {
    this.svg = svgRoot;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

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

  // 公开触发变更，供外部调用
  public triggerChange() {
    this.viewChangeCallbacks.forEach(cb => cb());
  }

  // 公共设置方法：设置平移和缩放
  public setTransform(tx: number, ty: number, scale: number): void {
    this.translate.x = tx;
    this.translate.y = ty;
    this.scale = Math.max(0.3, Math.min(3, scale));
    this.applyTransform();
    this.triggerChange();
  }

  public getTranslate(): Point {
    return { ...this.translate };
  }

  public getScale(): number {
    return this.scale;
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

  private applyTransform() {
    this.contentGroup.setAttribute("transform", `translate(${this.translate.x} ${this.translate.y}) scale(${this.scale})`);
  }

  // ========== 坐标转换 ==========
  screenToCanvas(point: Point): Point {
    // 使用双精度计算，避免浮点误差
    return {
      x: (point.x - this.translate.x) / this.scale,
      y: (point.y - this.translate.y) / this.scale,
    };
  }

  canvasToScreen(point: Point): Point {
    return {
      x: point.x * this.scale + this.translate.x,
      y: point.y * this.scale + this.translate.y,
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