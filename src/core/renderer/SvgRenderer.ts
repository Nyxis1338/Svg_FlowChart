// src/core/renderer/SvgRenderer.ts

import type { SvgEngine } from '../SvgEngine';
import type { ViewportManager } from '../viewport/ViewportManager';
import { LayerManager } from './LayerManager';
import { NodeRenderer } from './NodeRenderer';
import { AnchorRenderer } from './AnchorRenderer';
import { ConnectionRenderer } from './ConnectionRenderer';
import { DragManager } from '../interaction/DragManager';
import type { SelectionManager } from '../selection/SelectionManager';
import { createSvgElement } from '../../utils/dom';
import { ConnectorType } from '../../types';
import { connectorBezier } from '../../calc/connector/bezier';
import { connectorFlowchart } from '../../calc/connector/flowchart';
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

  private tempLineGroup: SVGGElement | null = null;
  private tempLineEl: SVGPathElement | null = null;
  private tempDotEl: SVGCircleElement | null = null;

  private reconnectingIds = new Set<string>();

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.svgRoot = chart.getSvgRoot();
    this.viewport = chart.viewport;
    this.dragManager = chart.dragManager;
    this.selection = chart.selection;

    // 使用 contentGroup 作为图层的父容器
    this.layerManager = new LayerManager(this.viewport.getContentGroup());

    this.nodeRenderer = new NodeRenderer(this.chart.store, this.selection, this.layerManager.nodeLayer);
    this.anchorRenderer = new AnchorRenderer(this.chart.store, this.dragManager, this.layerManager.anchorLayer);
    this.connectionRenderer = new ConnectionRenderer(
      this.chart.store,
      this.selection,
      this.layerManager.connectionLayer
    );

    // 点击空白画布清空选择
    this.svgRoot.addEventListener('mousedown', () => {
      this.selection.clear();
    });

    this.chart.store.subscribe(() => this.renderAll());
    this.selection.subscribe(() => this.renderAll());
  }

  renderAll(): void {
    // 保存临时线节点（如果存在）
    const tempNode = this.tempLineGroup;

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

  setTempLine(
    pos: { x1: number; y1: number; x2: number; y2: number },
    connectorType?: ConnectorType,
    isReconnect: boolean = false,
    stroke?: string,
    strokeWidth?: number,
    orientation?: { dx: number; dy: number } // 新增
  ): void {
    console.log('📐 setTempLine 接收到的起点:', pos.x1, pos.y1);
    if (!this.tempLineGroup) {
      this.tempLineGroup = createSvgElement('g') as SVGGElement;
      this.tempLineGroup.setAttribute('pointer-events', 'none');

      this.tempLineEl = createSvgElement('path') as SVGPathElement;
      this.tempLineEl.setAttribute('fill', 'none');
      this.tempLineGroup.appendChild(this.tempLineEl);

      this.tempDotEl = createSvgElement('circle') as SVGCircleElement;
      this.tempDotEl.setAttribute('r', '6');
      this.tempDotEl.setAttribute('fill', 'rgba(150,150,150,0.5)');
      this.tempDotEl.setAttribute('stroke', 'none');
      this.tempLineGroup.appendChild(this.tempDotEl);

      this.layerManager.connectionLayer.appendChild(this.tempLineGroup);
    }

    if (isReconnect && stroke) {
      this.tempLineEl!.setAttribute('stroke', stroke);
      this.tempLineEl!.setAttribute('stroke-width', String(strokeWidth || 2));
      this.tempLineEl!.setAttribute('stroke-dasharray', 'none');
    } else {
      this.tempLineEl!.setAttribute('stroke', 'rgba(150,150,150,0.7)');
      this.tempLineEl!.setAttribute('stroke-width', '2.5');
      this.tempLineEl!.setAttribute('stroke-dasharray', '8 4');
    }

    let pathD: string;
    const start = { x: pos.x1, y: pos.y1 };
    const end = { x: pos.x2, y: pos.y2 };

    if (connectorType === ConnectorType.FLOWCHART) {
      pathD = connectorFlowchart(start, end, orientation, Defaults.connection.stub);
    } else if (connectorType === ConnectorType.BEZIER) {
      pathD = connectorBezier(start, end, 0.5, 40);
    } else {
      pathD = `M${pos.x1} ${pos.y1} L${pos.x2} ${pos.y2}`;
    }

    this.tempLineEl!.setAttribute('d', pathD);
    this.tempDotEl!.setAttribute('cx', String(pos.x2));
    this.tempDotEl!.setAttribute('cy', String(pos.y2));
    // console.log('pathD:', pathD);
  }

  clearTempLine(): void {
    if (this.tempLineGroup) {
      this.tempLineGroup.remove();
      this.tempLineGroup = null;
      this.tempLineEl = null;
      this.tempDotEl = null;
    }
  }

  getTempLineExists(): boolean {
    return !!this.tempLineGroup;
  }

  highlightAnchor(anchorId: string, highlight: boolean): void {
    this.anchorRenderer.highlightAnchor(anchorId, highlight);
  }

  destroy(): void {
    this.layerManager.destroy();
    this.tempLineGroup = null;
    this.tempLineEl = null;
    this.tempDotEl = null;
    this.reconnectingIds.clear();
  }
}
