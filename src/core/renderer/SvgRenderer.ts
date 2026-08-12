// src/core/renderer/SvgRenderer.ts

import type { SvgEngine } from '../SvgEngine';
import type { ViewportManager } from '../viewport/ViewportManager';
import { LayerManager } from './LayerManager';
import { NodeRenderer } from './NodeRenderer';
import { ConnectionRenderer } from './ConnectionRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import { TempLineManager } from './TempLineManager';

export class SvgRenderer {
  private readonly chart: SvgEngine;
  private readonly svgRoot: SVGSVGElement;
  private readonly viewport: ViewportManager;
  private readonly selection: SelectionManager;

  private layerManager: LayerManager;
  private nodeRenderer: NodeRenderer;
  private connectionRenderer: ConnectionRenderer;
  private tempLineManager: TempLineManager;

  private reconnectingIds = new Set<string>();

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.svgRoot = chart.getSvgRoot();
    this.viewport = chart.viewport;
    this.selection = chart.selection;

    this.layerManager = new LayerManager(this.viewport.getContentGroup());

    this.nodeRenderer = new NodeRenderer(this.chart.store, this.selection, this.layerManager.elementLayer);
    this.connectionRenderer = new ConnectionRenderer(this.chart.store, this.selection, this.layerManager.elementLayer);
    this.tempLineManager = new TempLineManager(this.layerManager.tempLayer);

    this.chart.store.subscribe(() => this.renderAll());
    this.selection.subscribe(() => this.renderAll());
  }

  renderAll(): void {
    const tempNode = this.tempLineManager.getGroup();
    this.layerManager.elementLayer.innerHTML = '';
    if (tempNode) {
      this.layerManager.elementLayer.appendChild(tempNode);
    }
    this.connectionRenderer.render(this.reconnectingIds);
    this.nodeRenderer.render(); // 同时渲染节点和锚点
    // 需要添加排序！
    this.sortElementsByZIndex();
  }

  setReconnecting(connId: string, isReconnecting: boolean): void {
    if (isReconnecting) this.reconnectingIds.add(connId);
    else this.reconnectingIds.delete(connId);
    this.renderAll();
  }

  setTempLine(
    pos: { x1: number; y1: number; x2: number; y2: number },
    connectorType?: string,
    isReconnect: boolean = false,
    stroke?: string,
    strokeWidth?: number,
    orientation?: { dx: number; dy: number }
  ): void {
    this.tempLineManager.setTempLine(pos, connectorType, isReconnect, stroke, strokeWidth, orientation);
  }

  clearTempLine(): void {
    this.tempLineManager.clear();
  }

  getTempLineExists(): boolean {
    return this.tempLineManager.exists();
  }

  highlightAnchor(anchorId: string, highlight: boolean): void {
    this.nodeRenderer.highlightAnchor(anchorId, highlight);
  }

  private sortElementsByZIndex(): void {
    const children = Array.from(this.layerManager.elementLayer.children) as SVGElement[];
    children.sort((a, b) => {
      const za = parseInt(a.dataset['zIndex'] ?? '100', 10);
      const zb = parseInt(b.dataset['zIndex'] ?? '100', 10);
      return za - zb;
    });
    for (const child of children) {
      this.layerManager.elementLayer.appendChild(child);
    }
  }

  destroy(): void {
    this.layerManager.destroy();
    this.tempLineManager.destroy();
    this.reconnectingIds.clear();
  }
}
