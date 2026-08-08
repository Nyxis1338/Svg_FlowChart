// src/core/interaction/NodeDragManager.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { DragManager } from './DragManager';
import { DragState } from './DragManager';

export class NodeDragManager {
  private readonly chart: SvgEngine;
  private readonly dragManager: DragManager;

  constructor(dragManager: DragManager) {
    this.dragManager = dragManager;
    this.chart = dragManager['chart'];
  }

  private get store(): Store {
    return this.chart.store;
  }
  private get viewport(): ViewportManager {
    return this.chart.viewport;
  }
  private get selection(): SelectionManager {
    return this.chart.selection;
  }
  private get renderer(): SvgRenderer {
    return this.chart.renderer;
  }

  startNodeDrag(evt: MouseEvent): void {
    if (this.dragManager.state !== DragState.IDLE) return;

    const target = evt.target as SVGElement;
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute('data-node-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }
    if (!nodeId) return;

    const node = this.store.getNode(nodeId);
    if (!node) return;

    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    this.dragManager.nodeDragData = {
      nodeId,
      offset: { x: canvasPos.x - node.x, y: canvasPos.y - node.y },
    };
    this.selection.select('node', nodeId);
    this.dragManager.state = DragState.NODE_DRAGGING;
  }

  processMove(canvasPos: Point): boolean {
    const nodeDragData = this.dragManager.nodeDragData;
    if (!nodeDragData) return false;

    const { nodeId, offset } = nodeDragData;
    const newX = canvasPos.x - offset.x;
    const newY = canvasPos.y - offset.y;
    this.store.updateNode(nodeId, { x: newX, y: newY });
    return true;
  }

  endNodeDrag(): void {
    const nodeDragData = this.dragManager.nodeDragData;
    if (!nodeDragData) return;

    const nodeId = nodeDragData.nodeId;
    this.selection.select('node', nodeId);
    this.dragManager.nodeDragData = null;
    this.dragManager.state = DragState.IDLE;
  }

  cancelNodeDrag(): void {
    this.dragManager.nodeDragData = null;
  }
}
