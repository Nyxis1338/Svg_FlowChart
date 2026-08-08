// src/core/SvgEngine.ts

import { Store } from './store/Store';
import { ViewportManager } from './viewport/ViewportManager';
import { SelectionManager } from './selection/SelectionManager';
import { DragManager } from './interaction/DragManager';
import { SvgRenderer } from './renderer/SvgRenderer';
import type { Node, Connection, Anchor } from '../types/SvgModel';
import type { Point } from '../types/geometry';
import { AnchorType } from '../types/SvgModel';
import { EventBus } from './interaction/EventBus';
import { ContextMenu } from './interaction/ContextMenu'; // ✅ 新增导入

import { Defaults } from '../styles/defaults';

export class SvgEngine {
  public readonly svgRoot: SVGSVGElement;
  public readonly store: Store;
  public readonly viewport: ViewportManager;
  public readonly selection: SelectionManager;
  public readonly dragManager: DragManager;
  public readonly renderer: SvgRenderer;
  public readonly eventBus: EventBus; // 新增
  public readonly contextMenu: ContextMenu; // ✅ 新增

  constructor(container: HTMLElement) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    container.appendChild(svg);
    this.svgRoot = svg;
    this.addDefs(svg);

    this.store = new Store();
    this.viewport = new ViewportManager(this.svgRoot);
    this.selection = new SelectionManager();

    this.dragManager = new DragManager(this);
    this.renderer = new SvgRenderer(this);
    this.contextMenu = new ContextMenu(this, this.store, this.selection, this.viewport); // ✅ 实例化
    this.eventBus = new EventBus(this); // ✅ EventBus 需要访问 contextMenu，因此放在后面
  }

  private addDefs(svg: SVGSVGElement): void {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    // 节点默认阴影
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    shadow.setAttribute('id', 'node-shadow');
    shadow.setAttribute('x', '-10%');
    shadow.setAttribute('y', '-10%');
    shadow.setAttribute('width', '130%');
    shadow.setAttribute('height', '130%');
    shadow.innerHTML = `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.10)"/>`;
    defs.appendChild(shadow);

    // 节点选中发光（红色）
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glow.setAttribute('id', 'node-selected-glow');
    glow.setAttribute('x', '-20%');
    glow.setAttribute('y', '-20%');
    glow.setAttribute('width', '140%');
    glow.setAttribute('height', '140%');
    glow.innerHTML = `<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#ff6b6b" flood-opacity="0.6"/>`;
    defs.appendChild(glow);

    svg.prepend(defs);
  }

  getSvgRoot(): SVGSVGElement {
    return this.svgRoot;
  }

  // ==================== 节点操作 ====================
  /** 添加纯节点（不自动生成锚点） */
  addNode(data: Omit<Node, 'id'>): Node {
    const id = `node-${crypto.randomUUID()}`;

    const node: Node = { id, ...data };
    return this.store.addNode(node);
  }

  getNode(id: string): Node | undefined {
    return this.store.getNode(id);
  }

  getAllNodes(): Node[] {
    return this.store.getAllNodes();
  }

  updateNode(id: string, updates: Partial<Node>): void {
    this.store.updateNode(id, updates);
  }

  removeNode(id: string): void {
    this.store.removeNode(id);
  }

  // ==================== 连线操作 ====================
  addConnection(data: Omit<Connection, 'id'>): Connection {
    const id = `connect-${crypto.randomUUID()}`;

    const conn: Connection = { id, ...data };
    return this.store.addConnection(conn);
  }

  getConnection(id: string): Connection | undefined {
    return this.store.getConnection(id);
  }

  getAllConnections(): Connection[] {
    return this.store.getAllConnections();
  }

  updateConnection(id: string, updates: Partial<Connection>): void {
    this.store.updateConnection(id, updates);
  }

  removeConnection(id: string): void {
    this.store.removeConnection(id);
  }

  // ==================== 锚点操作 ====================
  addAnchor(data: Omit<Anchor, 'id'>): Anchor {
    const anchorData = { ...data };
    if (anchorData.type === AnchorType.CONTINUOUS) {
      anchorData.direction = 'both';
    }
    const id = `anchor-${crypto.randomUUID()}`;

    const anchor: Anchor = { id, ...anchorData };
    return this.store.addAnchor(anchor);
  }

  getAllAnchors(): Anchor[] {
    return this.store.getAllAnchors();
  }

  getNodeAnchors(nodeId: string): Anchor[] {
    return this.store.getNodeAnchors(nodeId);
  }

  removeAnchor(id: string): void {
    this.store.removeAnchor(id);
  }

  updateAnchor(id: string, updates: Partial<Anchor>): void {
    this.store.updateAnchor(id, updates);
  }

  // ==================== 批量更新 ====================

  /**
   * 更新所有节点的样式或属性
   * @param updates 节点属性的部分更新对象（忽略不存在的属性）
   */
  updateAllNodes(updates: Partial<Node>): void {
    this.store.updateAllNodes(updates);
  }

  /**
   * 更新所有连线的样式或属性
   * @param updates 连线属性的部分更新对象（忽略不存在的属性）
   */
  updateAllConnections(updates: Partial<Connection>): void {
    this.store.updateAllConnections(updates);
  }

  /**
   * 更新所有锚点的样式或属性
   * @param updates 锚点属性的部分更新对象（忽略不存在的属性）
   */
  updateAllAnchors(updates: Partial<Anchor>): void {
    this.store.updateAllAnchors(updates);
  }

  // ==================== 视图操作 ====================

  /**
   * 放大（默认增加 0.1）
   */
  zoomIn(factor: number = 0.1): void {
    const currentScale = this.viewport.getScale();
    const newScale = Math.min(currentScale + factor, 3);
    this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, newScale);
  }

  /**
   * 缩小（默认减少 0.1）
   */
  zoomOut(factor: number = 0.1): void {
    const currentScale = this.viewport.getScale();
    const newScale = Math.max(currentScale - factor, 0.3);
    this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, newScale);
  }

  /**
   * 缩放到指定比例
   */
  zoomTo(scale: number): void {
    const clamped = Math.max(0.3, Math.min(3, scale));
    this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, clamped);
  }

  /**
   * 重置视图（平移到原点，缩放为 1）
   */
  resetView(): void {
    this.viewport.setTransform(0, 0, 1);
  }

  /**
   * 将所有节点适配到可视区域（居中显示，并适当缩放）
   * @param padding 边距（默认 50）
   */
  fitToView(padding: number = 50): void {
    const nodes = this.store.getAllNodes();
    if (nodes.length === 0) {
      this.resetView();
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    if (contentWidth === 0 || contentHeight === 0) {
      this.resetView();
      return;
    }

    const svgRect = this.svgRoot.getBoundingClientRect();
    const viewWidth = svgRect.width;
    const viewHeight = svgRect.height;

    const scaleX = (viewWidth - padding * 2) / contentWidth;
    const scaleY = (viewHeight - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const translateX = viewWidth / 2 - contentCenterX * scale;
    const translateY = viewHeight / 2 - contentCenterY * scale;

    this.viewport.setTransform(translateX, translateY, scale);
  }

  // ==================== 数据导入/导出 ====================
  exportData() {
    return this.store.exportData();
  }

  importData(data: any) {
    this.store.importData(data);
  }

  // ==================== 销毁 ====================
  destroy(): void {
    this.dragManager.destroy();
    this.renderer.destroy();
    this.viewport.destroy();
    this.contextMenu.destroy(); // ✅ 新增
    this.svgRoot.remove();
  }
}
