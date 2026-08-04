// src/core/SvgEngine.ts

import { Store } from "./store/Store";
import { ViewportManager } from "./viewport/ViewportManager";
import { SelectionManager } from "./selection/SelectionManager";
import { DragManager } from "./interaction/DragManager";
import { SvgRenderer } from "./renderer/SvgRenderer";
import type {
  Node,
  Connection,
  Anchor,
  NodeShape,
} from "../types/SvgModel";
import type { Point } from "../types/geometry";
import { uuidv4 } from "../utils/uuid";

/**
 * SvgEngine 主类：聚合所有子模块，对外提供统一 API
 */
export class SvgEngine {
  public readonly svgRoot: SVGSVGElement;
  public readonly store: Store;
  public readonly viewport: ViewportManager;
  public readonly selection: SelectionManager;
  public readonly dragManager: DragManager;
  public readonly renderer: SvgRenderer;

  constructor(container: HTMLElement) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    container.appendChild(svg);
    this.svgRoot = svg;
    
    // ★ 添加 defs（阴影、发光）
    this.addDefs(svg);

    this.store = new Store();
    this.viewport = new ViewportManager(this.svgRoot);
    this.selection = new SelectionManager();

    this.dragManager = new DragManager(this);
    this.renderer = new SvgRenderer(this);
  }

  private addDefs(svg: SVGSVGElement): void {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    // 节点默认阴影
    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    shadow.setAttribute("id", "node-shadow");
    shadow.setAttribute("x", "-10%");
    shadow.setAttribute("y", "-10%");
    shadow.setAttribute("width", "130%");
    shadow.setAttribute("height", "130%");
    shadow.innerHTML = `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.10)"/>`;
    defs.appendChild(shadow);

    // 节点选中发光（红色）
    const glow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    glow.setAttribute("id", "node-selected-glow");
    glow.setAttribute("x", "-20%");
    glow.setAttribute("y", "-20%");
    glow.setAttribute("width", "140%");
    glow.setAttribute("height", "140%");
    glow.innerHTML = `<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#ff6b6b" flood-opacity="0.6"/>`;
    defs.appendChild(glow);

    svg.prepend(defs);
  }

  getSvgRoot(): SVGSVGElement {
    return this.svgRoot;
  }

  // ==================== 节点操作 ====================
  /** 添加纯节点（不自动生成锚点） */
  addNode(data: Omit<Node, "id">): Node {
    const id = `node-${uuidv4()}`;
    const node: Node = { id, ...data };
    return this.store.addNode(node);
  }

  /** 添加节点并自动生成8个静态锚点 */
  addNodeWithAnchors(data: Omit<Node, "id">): Node {
    return this.store.addNodeWithAnchors(data);
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
  addConnection(data: Omit<Connection, "id">): Connection {
    const id = `connect-${uuidv4()}`;
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
  addAnchor(data: Omit<Anchor, "id">): Anchor {
    const id = `anchor-${uuidv4()}`;
    const anchor: Anchor = { id, ...data };
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

  // ==================== 视图操作 ====================
  zoomIn(factor: number = 0.1): void {
    const currentScale = this.viewport.getScale();
    const newScale = Math.min(currentScale + factor, 3);
    this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, newScale);
  }

  zoomOut(factor: number = 0.1): void {
    const currentScale = this.viewport.getScale();
    const newScale = Math.max(currentScale - factor, 0.3);
    this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, newScale);
  }

  zoomTo(scale: number): void {
    const clamped = Math.max(0.3, Math.min(3, scale));
    this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, clamped);
  }

  resetView(): void {
    this.viewport.setTransform(0, 0, 1);
  }

  fitToView(padding: number = 50): void {
    const nodes = this.store.getAllNodes();
    if (nodes.length === 0) {
      this.resetView();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
  exportData(): { nodes: Node[]; anchors: Anchor[]; connections: Connection[] } {
    return this.store.exportData();
  }

  importData(data: { nodes: Node[]; anchors: Anchor[]; connections: Connection[] }): void {
    this.store.importData(data);
  }

  // ==================== 销毁 ====================
  destroy(): void {
    this.dragManager.destroy();
    this.renderer.destroy();
    this.viewport.destroy();
    this.svgRoot.remove();
  }
}