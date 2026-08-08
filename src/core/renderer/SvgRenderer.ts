// src/core/renderer/SvgRenderer.ts

import type { SvgEngine } from '../SvgEngine';
import type { ViewportManager } from '../viewport/ViewportManager';
import { LayerManager } from './LayerManager';
import { NodeRenderer } from './NodeRenderer';
import { AnchorRenderer } from './AnchorRenderer';
import { ConnectionRenderer } from './ConnectionRenderer';
import { DragManager } from '../interaction/DragManager';
import type { SelectionManager } from '../selection/SelectionManager';
import { ConnectorType } from '../../types';
import { TempLineManager } from './TempLineManager';
import { Defaults } from '../../styles/defaults';

export class SvgRenderer {
  private readonly chart: SvgEngine;
  private readonly svgRoot: SVGSVGElement;
  private readonly viewport: ViewportManager;
  private readonly dragManager: DragManager;
  private readonly selection: SelectionManager;

  private layerManager: LayerManager;
  private nodeRenderer: NodeRenderer;
  private anchorRenderer: AnchorRenderer;
  private connectionRenderer: ConnectionRenderer;
  private tempLineManager: TempLineManager;

  private reconnectingIds = new Set<string>();

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.svgRoot = chart.getSvgRoot();
    this.viewport = chart.viewport;
    this.dragManager = chart.dragManager;
    this.selection = chart.selection;

    this.layerManager = new LayerManager(this.viewport.getContentGroup());

    this.nodeRenderer = new NodeRenderer(this.chart.store, this.selection, this.layerManager.nodeLayer);
    this.anchorRenderer = new AnchorRenderer(this.chart.store, this.dragManager, this.layerManager.anchorLayer);
    this.connectionRenderer = new ConnectionRenderer(
      this.chart.store,
      this.selection,
      this.layerManager.connectionLayer
    );

    // 初始化临时线管理器
    this.tempLineManager = new TempLineManager(this.layerManager.connectionLayer);

    // 点击空白画布清空选择
    this.svgRoot.addEventListener('mousedown', () => {
      this.selection.clear();
    });

    this.chart.store.subscribe(() => this.renderAll());
    this.selection.subscribe(() => this.renderAll());
  }

  renderAll(): void {
    // 保存临时线节点（如果存在）
    const tempNode = this.tempLineManager.getGroup();

    // 清空连线层
    this.layerManager.connectionLayer.innerHTML = '';

    // 重新添加临时线（避免被清除）
    if (tempNode) {
      this.layerManager.connectionLayer.appendChild(tempNode);
    }

    // 渲染静态连线、锚点、节点
    this.connectionRenderer.render(this.reconnectingIds);
    this.anchorRenderer.render();
    this.nodeRenderer.render();
  }

  setReconnecting(connId: string, isReconnecting: boolean): void {
    if (isReconnecting) {
      this.reconnectingIds.add(connId);
    } else {
      this.reconnectingIds.delete(connId);
    }
    this.renderAll();
  }

  // ==================== 临时线代理 ====================

  setTempLine(
    pos: { x1: number; y1: number; x2: number; y2: number },
    connectorType?: ConnectorType,
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

  // ==================== 高亮代理 ====================

  highlightAnchor(anchorId: string, highlight: boolean): void {
    this.anchorRenderer.highlightAnchor(anchorId, highlight);
  }

  destroy(): void {
    this.layerManager.destroy();
    this.tempLineManager.destroy();
    this.reconnectingIds.clear();
  }
}
