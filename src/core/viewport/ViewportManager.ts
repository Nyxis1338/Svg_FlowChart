// src/core/viewport/ViewportManager.ts

import type { Point } from '../../types/geometry';
import { createSvgElement } from '../../utils/dom';

export class ViewportManager {
  public readonly svg: SVGSVGElement;
  public readonly contentGroup: SVGGElement;
  private gridLayer: SVGGElement;

  public translate: Point = { x: 0, y: 0 };
  public scale = 1;

  private spacePressed = false;
  private dragStart: Point | null = null;
  private viewChangeCallbacks: Array<() => void> = [];
  private readonly gridSize = 20;
  private readonly gridColor = '#e5e7eb';

  constructor(svgRoot: SVGSVGElement) {
    this.svg = svgRoot;
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    this.contentGroup = createSvgElement('g') as SVGGElement;
    this.gridLayer = createSvgElement('g') as SVGGElement;
    this.renderGrid();
    this.contentGroup.prepend(this.gridLayer);
    this.svg.appendChild(this.contentGroup);

    this.bindEvents();
    this.applyTransform();

    // 🔍 初始坐标转换测试（打开控制台查看）
    console.log('ViewportManager 初始化: translate=', this.translate, 'scale=', this.scale);
  }

  subscribe(cb: () => void) {
    this.viewChangeCallbacks.push(cb);
    return () => {
      const idx = this.viewChangeCallbacks.indexOf(cb);
      if (idx > -1) this.viewChangeCallbacks.splice(idx, 1);
    };
  }

  public triggerChange() {
    this.viewChangeCallbacks.forEach(cb => cb());
  }

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
    this.gridLayer.innerHTML = '';
    const defs = createSvgElement('defs') as SVGElement;
    const pattern = createSvgElement('pattern') as SVGElement;
    pattern.setAttribute('id', 'gridPattern');
    pattern.setAttribute('width', String(this.gridSize));
    pattern.setAttribute('height', String(this.gridSize));
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    const path = createSvgElement('path') as SVGPathElement;
    path.setAttribute('d', `M ${this.gridSize} 0 L 0 0 L 0 ${this.gridSize}`);
    path.setAttribute('stroke', this.gridColor);
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('fill', 'none');
    pattern.appendChild(path);
    defs.appendChild(pattern);
    this.gridLayer.appendChild(defs);
    const bgRect = createSvgElement('rect') as SVGRectElement;
    bgRect.setAttribute('x', '-100000');
    bgRect.setAttribute('y', '-100000');
    bgRect.setAttribute('width', '200000');
    bgRect.setAttribute('height', '200000');
    bgRect.setAttribute('fill', 'url(#gridPattern)');
    bgRect.setAttribute('pointer-events', 'none');
    this.gridLayer.appendChild(bgRect);
  }

  private bindEvents() {
    // 使用捕获阶段监听键盘事件，确保优先处理
    window.addEventListener('keydown', this.onKeyDown.bind(this), true);
    window.addEventListener('keyup', this.onKeyUp.bind(this), true);
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('resize', this.renderGrid.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      this.spacePressed = true;
      this.svg.style.cursor = 'grab';
      console.log('🔑 空格按下，spacePressed =', this.spacePressed);
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      this.spacePressed = false;
      this.dragStart = null;
      this.svg.style.cursor = '';
      console.log('🔑 空格释放，spacePressed =', this.spacePressed);
    }
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.spacePressed) return;
    e.preventDefault();
    e.stopPropagation(); // 阻止其他事件处理
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.svg.style.cursor = 'grabbing';
    console.log('🖱️ 空格拖拽开始，dragStart =', this.dragStart);
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.spacePressed || !this.dragStart) {
      // 如果空格未按下但光标仍为 grab，重置
      if (this.svg.style.cursor === 'grabbing' || this.svg.style.cursor === 'grab') {
        this.svg.style.cursor = '';
      }
      return;
    }
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    this.translate.x += dx;
    this.translate.y += dy;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.applyTransform();
    this.triggerChange();
    console.log('🔄 平移:', this.translate); // 添加日志
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
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
    console.log('🔄 缩放:', this.scale, 'translate:', this.translate);
  }

  private applyTransform() {
    this.contentGroup.setAttribute(
      'transform',
      `translate(${this.translate.x} ${this.translate.y}) scale(${this.scale})`
    );
  }

  // ========== 坐标转换 ==========
  screenToCanvas(point: Point): Point {
    // 从屏幕坐标转换到画布逻辑坐标
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
    window.removeEventListener('keydown', this.onKeyDown.bind(this), true);
    window.removeEventListener('keyup', this.onKeyUp.bind(this), true);
    this.svg.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.renderGrid.bind(this));
    this.viewChangeCallbacks = [];
  }
}
