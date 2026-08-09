// src/core/interaction/NodeDrag.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { DragManager } from './DragManager';
import { DragState } from './DragManager';

/**
 * 节点拖拽执行器
 * 处理节点拖拽的完整生命周期
 */
export class NodeDrag {
  private readonly dragManager: DragManager;
  private readonly chart: SvgEngine;

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

  /**
   * 启动节点拖拽
   */
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
    this.dragManager.state = DragState.NODE_DRAGGING;
  }

  /**
   * 处理节点拖拽的移动更新
   */
  processMove(canvasPos: Point): boolean {
    const data = this.dragManager.nodeDragData;
    if (!data) return false;

    const { nodeId, offset } = data;
    const newX = canvasPos.x - offset.x;
    const newY = canvasPos.y - offset.y;
    this.store.updateNode(nodeId, { x: newX, y: newY });
    return true;
  }

  /**
   * 结束节点拖拽
   */
  end(_evt?: MouseEvent): void {
    const data = this.dragManager.nodeDragData;
    if (!data) return;

    this.selection.select('node', data.nodeId);
    this.dragManager.nodeDragData = null;
    this.dragManager.state = DragState.IDLE;
  }

  /**
   * 取消节点拖拽
   */
  cancel(): void {
    this.dragManager.nodeDragData = null;
  }
}
