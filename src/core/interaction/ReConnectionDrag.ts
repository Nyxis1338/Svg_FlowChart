// src/core/interaction/ReConnectionDrag.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Connection } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { HitTest } from './HitTest';
import { ConnectorType } from '../../types/SvgModel';
import { getAnchorOrientation } from '../../calc/anchor/orientation';
import { isDirectionCompatible } from '../../utils/direction-helpers';
import type { DragManager } from './DragManager';

export class ReConnectionDrag {
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

    const existingConnection = this.store.findConnectionByAnchor(anchor.id);
    if (!existingConnection) {
      console.warn('未找到可重连的连线');
      return;
    }

    const conn = existingConnection;
    if (conn.fixed === true) {
      console.warn('连线已固定，不可重连');
      return;
    }

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;

    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    this.dragManager.pendingDrag = {
      anchor,
      startPos: anchorPos,
      evt,
      isReconnect: true,
    };
    this.dragManager.state = 'link_dragging';
  }

  startDragging(): void {
    const pending = this.dragManager.pendingDrag;
    if (!pending) return;

    const { anchor, startPos, evt } = pending;
    this.handleReconnect(anchor, startPos, evt);

    this.dragManager.pendingDrag = null;
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  private handleReconnect(anchor: Anchor, anchorPos: Point, _evt: MouseEvent): void {
    const conn = this.store.findConnectionByAnchor(anchor.id);
    if (!conn) {
      console.warn('重连时未找到连线');
      return;
    }

    let dragDirection: 'output' | 'input';
    let fixedAnchorId: string;

    if (conn.sourceAnchorId === anchor.id) {
      dragDirection = 'output';
      fixedAnchorId = conn.targetAnchorId!;
    } else if (conn.targetAnchorId === anchor.id) {
      dragDirection = 'input';
      fixedAnchorId = conn.sourceAnchorId!;
    } else {
      return;
    }

    const fixedAnchor = this.store.getAnchor(fixedAnchorId);
    if (!fixedAnchor) return;
    const fixedNode = this.store.getNode(fixedAnchor.nodeId);
    if (!fixedNode) return;

    const fixedPos = this.store.calcAnchorPosForNode(fixedNode, fixedAnchor);
    const orientation = getAnchorOrientation(fixedNode, fixedAnchor);
    const stroke = conn.stroke || Defaults.connection.stroke;
    const strokeWidth = conn.strokeWidth || Defaults.connection.strokeWidth;
    const connectorType = conn.connectorType;

    this.dragManager.linkDragData = {
      sourceAnchorId: anchor.id,
      startX: fixedPos.x,
      startY: fixedPos.y,
      endX: anchorPos.x,
      endY: anchorPos.y,
      type: 'reconnect',
      connectionId: conn.id,
      oldSourceAnchorId: conn.sourceAnchorId,
      oldTargetAnchorId: conn.targetAnchorId,
      dragDirection,
      stroke,
      strokeWidth,
      connectorType,
      fixedAnchorId,
      orientation,
    };

    this.renderer.setReconnecting(conn.id, true);
    this.renderer.highlightAnchor(anchor.id, true);
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
      true,
      stroke,
      strokeWidth,
      orientation
    );

    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, data.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(data.sourceAnchorId);
    const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

    const directionCompatible = isDirectionCompatible(sourceAnchor, hitAnchor || undefined, data.dragDirection, true);
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

    console.log(`[onMouseUp] 重连拖拽端方向: ${dragDir}, 目标锚点: ${hitAnchor?.id || '无'}, 目标方向: ${targetDir}`);

    if (hitAnchor && sourceAnchor) {
      if (hitAnchor.id === sourceAnchor.id) {
        console.warn(`⏭️ 目标锚点与源锚点相同，取消重连`);
      } else {
        const directionCompatible = isDirectionCompatible(sourceAnchor, hitAnchor, dragDir, true);
        if (directionCompatible) {
          success = this.handleReconnectDrop(hitAnchor);
        } else {
          console.warn(`❌ 方向不匹配: 拖拽端=${dragDir}, 目标端=${targetDir}`);
        }
      }
    } else {
      console.warn(`⏭️ 未命中有效目标锚点，取消重连。拖拽端方向=${dragDir}`);
    }

    if (data.connectionId) {
      this.renderer.setReconnecting(data.connectionId, false);
    }

    this.clearHighlight();
    this.renderer.clearTempLine();
    this.dragManager.linkDragData = null;
    this.dragManager.state = 'idle';
  }

  private handleReconnectDrop(hitAnchor: Anchor): boolean {
    const data = this.dragManager.linkDragData;
    if (!data) return false;

    const connId = data.connectionId!;
    const conn = this.store.getConnection(connId);
    if (!conn) return false;

    const dragDir = data.dragDirection;
    let newSourceId = conn.sourceAnchorId;
    let newTargetId = conn.targetAnchorId;

    if (dragDir === 'output') {
      newSourceId = hitAnchor.id;
    } else {
      newTargetId = hitAnchor.id;
    }

    if (newSourceId === conn.sourceAnchorId && newTargetId === conn.targetAnchorId) {
      console.log('⏭️ 目标未变化，取消重连');
      return false;
    }

    const exist = this.store
      .getAllConnections()
      .some(c => c.id !== connId && c.sourceAnchorId === newSourceId && c.targetAnchorId === newTargetId);

    if (!exist) {
      this.store.updateConnection(connId, { sourceAnchorId: newSourceId, targetAnchorId: newTargetId });
      console.log(`✅ 重连成功`);
      return true;
    } else {
      console.warn('连线已存在，重连取消');
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
