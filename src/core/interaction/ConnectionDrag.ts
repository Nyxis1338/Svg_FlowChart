// src/core/interaction/ConnectionDrag.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { HitTest } from './HitTest';
import { ConnectorType } from '../../types/SvgModel';
import { getAnchorOrientation } from '../../calc/anchor/orientation';
import { isDirectionCompatible } from '../../utils/direction-helpers';
import type { DragManager } from './DragManager';

export class ConnectionDrag {
  private readonly dragManager: DragManager;
  private readonly chart: SvgEngine;
  private hitTest = new HitTest();

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

  start(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.dragManager.state !== 'idle') return;

    const isFull = this.store.isAnchorFull(anchor.id);
    if (isFull) {
      console.warn(`锚点 ${anchor.id} 已满，不能拖拽`);
      return;
    }

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;

    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    this.dragManager.pendingDrag = {
      anchor,
      startPos: anchorPos,
      evt,
      isReconnect: false,
    };
    this.dragManager.state = 'link_dragging';
  }

  startDragging(): void {
    const pending = this.dragManager.pendingDrag;
    if (!pending) return;

    const { anchor, startPos, evt } = pending;
    this.handleCreate(anchor, startPos, evt);

    this.dragManager.pendingDrag = null;
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  private handleCreate(anchor: Anchor, anchorPos: Point, _evt: MouseEvent): void {
    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;

    const orientation = getAnchorOrientation(node, anchor);
    let startX = anchorPos.x;
    let startY = anchorPos.y;

    // 直接使用锚点位置，不进行动态计算
    const dragDirection = anchor.direction === 'both' ? 'output' : anchor.direction;

    this.dragManager.linkDragData = {
      sourceAnchorId: anchor.id,
      startX,
      startY,
      endX: startX,
      endY: startY,
      type: 'create',
      dragDirection,
      orientation,
      connectorType: 'straight',
      stroke: Defaults.connection.stroke,
      strokeWidth: Defaults.connection.strokeWidth,
    };
  }

  processMove(canvasPos: Point): boolean {
    const data = this.dragManager.linkDragData;
    if (!data) return false;

    data.endX = canvasPos.x;
    data.endY = canvasPos.y;

    const srcAnchor = this.store.getAnchor(data.sourceAnchorId);
    // 没有连续锚点逻辑，startX/startY 保持不变

    const stroke = data.stroke;
    const strokeWidth = data.strokeWidth;
    const connectorType = data.connectorType || 'flowchart';
    const orientation = data.orientation;

    this.renderer.setTempLine(
      { x1: data.startX, y1: data.startY, x2: canvasPos.x, y2: canvasPos.y },
      connectorType,
      false,
      stroke,
      strokeWidth,
      orientation
    );

    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, data.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(data.sourceAnchorId);
    const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

    const directionCompatible = isDirectionCompatible(sourceAnchor, hitAnchor || undefined, data.dragDirection, false);
    const isValidTarget = hitAnchor && sourceNode && hitAnchor.id !== data.sourceAnchorId && directionCompatible;

    if (isValidTarget && hitAnchor !== this.dragManager.highlightedAnchor) {
      this.clearHighlight();
      this.dragManager.highlightedAnchor = hitAnchor;
      this.renderer.highlightAnchor(hitAnchor.id, true);
      this.dragManager.state = 'hovering';
    } else if (!isValidTarget && this.dragManager.highlightedAnchor) {
      this.clearHighlight();
      this.dragManager.state = 'link_dragging';
    }

    return true;
  }

  end(evt: MouseEvent): void {
    const data = this.dragManager.linkDragData;
    if (!data) return;

    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, data.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(data.sourceAnchorId);
    let success = false;

    const dragDir = data.dragDirection;
    const targetDir = hitAnchor?.direction || '无';

    console.log(`[onMouseUp] 拖拽端方向: ${dragDir}, 目标锚点: ${hitAnchor?.id || '无'}, 目标方向: ${targetDir}`);

    if (hitAnchor && sourceAnchor) {
      if (hitAnchor.id === sourceAnchor.id) {
        console.warn(`⏭️ 目标锚点与源锚点相同，取消连接`);
      } else {
        const directionCompatible = isDirectionCompatible(sourceAnchor, hitAnchor, dragDir, false);
        if (directionCompatible) {
          success = this.handleCreateDrop(sourceAnchor, hitAnchor);
        } else {
          console.warn(`❌ 方向不匹配: 拖拽端=${dragDir}, 目标端=${targetDir}`);
        }
      }
    } else {
      console.warn(`⏭️ 未命中有效目标锚点，取消连接。拖拽端方向=${dragDir}`);
    }

    this.clearHighlight();
    this.renderer.clearTempLine();
    this.dragManager.linkDragData = null;
    this.dragManager.state = 'idle';
  }

  private handleCreateDrop(sourceAnchor: Anchor, hitAnchor: Anchor): boolean {
    const exist = this.store
      .getAllConnections()
      .some(c => c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id);

    if (!exist) {
      this.store.addConnection({
        id: crypto.randomUUID(),
        connectorType: 'straight',
        sourceAnchorId: sourceAnchor.id,
        targetAnchorId: hitAnchor.id,
        stroke: Defaults.connection.stroke,
        strokeWidth: Defaults.connection.strokeWidth,
        stub: Defaults.connection.stub,
        gap: 0,
      });
      console.log(`✅ 新建连线成功: 源端方向=${sourceAnchor.direction}, 目标端方向=${hitAnchor.direction}`);
      return true;
    } else {
      console.warn('连线已存在，创建取消');
      return false;
    }
  }

  cancel(): void {
    this.dragManager.linkDragData = null;
    this.dragManager.pendingDrag = null;
    this.clearHighlight();
    this.renderer.clearTempLine();
  }

  private clearHighlight(): void {
    if (this.dragManager.highlightedAnchor) {
      this.renderer.highlightAnchor(this.dragManager.highlightedAnchor.id, false);
      this.dragManager.highlightedAnchor = null;
    }
  }
}
