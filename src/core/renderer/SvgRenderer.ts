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

    // 渲染器仍然使用独立的图层，但都指向 elementLayer（锚点作为节点子元素，在 NodeRenderer 中处理）
    this.nodeRenderer = new NodeRenderer(this.chart.store, this.selection, this.layerManager.elementLayer);
    this.anchorRenderer = new AnchorRenderer(
      this.chart.store,
      this.layerManager.elementLayer // 锚点直接添加到 elementLayer（但会作为节点子元素？需要调整）
    );
    this.connectionRenderer = new ConnectionRenderer(this.chart.store, this.selection, this.layerManager.elementLayer);

    // 初始化临时线管理器，使用 tempLayer
    this.tempLineManager = new TempLineManager(this.layerManager.tempLayer);

    // 点击空白画布清空选择（仍有效）
    this.svgRoot.addEventListener('mousedown', () => {
      this.selection.clear();
    });

    this.chart.store.subscribe(() => this.renderAll());
    this.selection.subscribe(() => this.renderAll());
  }

  renderAll(): void {
    // 清空正式元素图层
    this.layerManager.elementLayer.innerHTML = '';

    // 重新渲染节点、锚点、连线（它们都会添加到 elementLayer）
    // 注意顺序：先渲染连线（底层），再渲染节点（上层），但两者都是独立添加到 elementLayer，
    // 我们直接让 NodeRenderer 和 ConnectionRenderer 添加，然后整体排序？
    // 更好的方式：在 render 中统一收集所有元素并按 zIndex 排序后一次性添加。
    // 但为了最小改动，我们让 NodeRenderer 和 ConnectionRenderer 各自添加，然后我们统一排序它们的子元素。

    // 方案：先调用各渲染器，它们会向 elementLayer 添加子元素，
    // 然后我们对 elementLayer 中的子元素按 zIndex 排序重新插入。
    this.connectionRenderer.render(this.reconnectingIds);
    this.nodeRenderer.render();

    // 由于 AnchorRenderer 是独立添加锚点到 elementLayer，我们需要让锚点成为节点的子元素，
    // 所以应该修改 NodeRenderer 来同时绘制锚点，AnchorRenderer 可以废弃或保留为独立添加（但会导致锚点独立于节点）。
    // 为了 z-index 统一，建议锚点作为节点的子元素，这样锚点跟随节点叠放。
    // 因此，我们将在 NodeRenderer 中绘制锚点，而 AnchorRenderer 只用于高亮等辅助功能（不再添加新元素）。
    // 所以我们在此注释掉 anchorRenderer.render()，改为在 NodeRenderer 中处理。
    // this.anchorRenderer.render(); // 暂时注释

    // 排序 elementLayer 中的所有子元素（按 zIndex）
    this.sortElementsByZIndex();

    // 临时线由 TempLineManager 自行管理，无需额外操作
  }

  /**
   * 对 elementLayer 中的子元素按 zIndex 升序排序
   */
  private sortElementsByZIndex(): void {
    const children = Array.from(this.layerManager.elementLayer.children) as SVGElement[];
    // 按 zIndex 排序（从 data-z-index 属性读取）
    children.sort((a, b) => {
      const za = parseInt(a.dataset['zIndex'] ?? '100', 10);
      const zb = parseInt(b.dataset['zIndex'] ?? '100', 10);
      return za - zb;
    });
    // 重新插入
    for (const child of children) {
      this.layerManager.elementLayer.appendChild(child);
    }
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
