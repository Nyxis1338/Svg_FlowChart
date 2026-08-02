// src/core/SvgFlowChart.ts
import { SvgStore } from "./store/SvgStore";
import { ViewportManager } from "./viewport/ViewportManager";
import { SelectionManager } from "./selection/SelectionManager";
import { DragManager } from "./interaction/DragManager";
import { SvgRenderer } from "./renderer/SvgRenderer";
import type {
  FlowNode,
  FlowConnection,
  AnchorPoint,
  NodeShape,
} from "../types/SvgModel";
import type { Point } from "../types/geometry";
import { uuidv4 } from "../utils/uuid"; // 假设有这个工具

/**
 * SvgFlowChart 主类
 * 提供完整的流程图引擎功能
 */
export class SvgFlowChart {
  public readonly svgRoot: SVGSVGElement;
  public readonly store: SvgStore;
  public readonly viewport: ViewportManager;
  public readonly selection: SelectionManager;
  public readonly dragManager: DragManager;
  public readonly renderer: SvgRenderer;

  constructor(container: HTMLElement) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    container.appendChild(svg);
    this.svgRoot = svg;
    this.store = new SvgStore();
    this.viewport = new ViewportManager(this.svgRoot);
    this.selection = new SelectionManager();

    this.dragManager = new DragManager(this);
    this.renderer = new SvgRenderer(this);
  }

  getSvgRoot(): SVGSVGElement {
    return this.svgRoot;
  }

  // ==================== 节点操作 ====================
  addNode(data: Omit<FlowNode, "id">): FlowNode {
    return this.store.addNodeWithAnchors(data);
  }

  getNode(id: string): FlowNode | undefined {
    return this.store.getNode(id);
  }

  getAllNodes(): FlowNode[] {
    return this.store.getAllNodes();
  }

  updateNode(id: string, updates: Partial<FlowNode>): void {
    this.store.updateNode(id, updates);
  }

  removeNode(id: string): void {
    this.store.removeNode(id);
  }

  // ==================== 连线操作 ====================
  addConnection(data: Omit<FlowConnection, "id">): FlowConnection {
    const id = `connect-${uuidv4()}`;
    const conn: FlowConnection = { id, ...data };
    this.store.addConnection(conn);
    return conn;
  }

  getConnection(id: string): FlowConnection | undefined {
    return this.store.getConnection(id);
  }

  getAllConnections(): FlowConnection[] {
    return this.store.getAllConnections();
  }

  updateConnection(id: string, updates: Partial<FlowConnection>): void {
    this.store.updateConnection(id, updates);
  }

  removeConnection(id: string): void {
    this.store.removeConnection(id);
  }

  // ==================== 锚点操作 ====================
  addAnchor(data: Omit<AnchorPoint, "id">): AnchorPoint {
    const id = `anchor-${uuidv4()}`;
    const anchor: AnchorPoint = { id, ...data };
    this.store.addAnchorPoint(anchor);
    return anchor;
  }

  getAllAnchors(): AnchorPoint[] {
    return this.store.getAllAnchorPoints();
  }

  getNodeAnchors(nodeId: string): AnchorPoint[] {
    return this.store.getNodeAnchorPoints(nodeId);
  }

  removeAnchor(id: string): void {
    this.store.removeAnchorPoint(id);
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
  exportData(): { nodes: FlowNode[]; anchorPoints: AnchorPoint[]; connections: FlowConnection[] } {
    return this.store.exportData();
  }

  importData(data: { nodes: FlowNode[]; anchorPoints: AnchorPoint[]; connections: FlowConnection[] }): void {
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