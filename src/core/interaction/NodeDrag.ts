// src/core/interaction/NodeDrag.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { DragManager } from './DragManager';

export class NodeDrag {
  private readonly dragManager: DragManager;
  private readonly SE: SvgEngine;

  constructor(dragManager: DragManager) {
    this.dragManager = dragManager;
    this.SE = dragManager['SE'];
  }

  private get store(): Store {
    return this.SE.store;
  }
  private get viewport(): ViewportManager {
    return this.SE.viewport;
  }
  private get selection(): SelectionManager {
    return this.SE.selection;
  }
  private get renderer(): SvgRenderer {
    return this.SE.renderer;
  }

  start(evt: MouseEvent): void {
    if (this.dragManager.state !== 'idle') return;

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
    this.dragManager.state = 'node_dragging';
  }

  processMove(canvasPos: Point): boolean {
    const data = this.dragManager.nodeDragData;
    if (!data) return false;

    const { nodeId, offset } = data;
    const newX = canvasPos.x - offset.x;
    const newY = canvasPos.y - offset.y;
    this.store.updateNode(nodeId, { x: newX, y: newY });
    return true;
  }

  end(_evt?: MouseEvent): void {
    const data = this.dragManager.nodeDragData;
    if (!data) return;

    this.selection.select('node', data.nodeId);
    this.dragManager.nodeDragData = null;
    this.dragManager.state = 'idle';
  }

  cancel(): void {
    this.dragManager.nodeDragData = null;
  }
}
