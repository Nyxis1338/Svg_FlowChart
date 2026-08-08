// src/core/interaction/ConnectionDragManager.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { HitTest } from './HitTest';
import { ConnectorType, AnchorType } from '../../types/SvgModel';
import { getContinuousAnchorPosition } from '../../calc/anchor/continuous';
import { getAnchorOrientation } from '../../utils/anchor-helpers';
import { isDirectionCompatible } from '../../utils/direction-helpers';
import type { DragManager } from './DragManager';
import { DragState } from './DragManager';

export class ConnectionDragManager {
  private readonly chart: SvgEngine;
  private readonly dragManager: DragManager;
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

  startLinkDrag(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.dragManager.state !== DragState.IDLE) return;
    if (anchor.connectionsDetachable === false) return;

    const isOutput =
      anchor.type === AnchorType.CONTINUOUS || anchor.direction === 'output' || anchor.direction === 'both';
    const isFull = this.store.isAnchorFull(anchor.id);
    if (isFull) {
      console.warn(`锚点 ${anchor.id} 已满，不能拖拽`);
      return;
    }

    let isReconnect = false;
    if (anchor.type !== AnchorType.CONTINUOUS) {
      const existingConnection = this.store.findConnectionByAnchor(anchor.id);
      isReconnect = !isFull && existingConnection != null;
    }

    if (!isOutput && !isReconnect) {
      console.warn(`⏭️ 锚点 ${anchor.id} 不是输出端且无现有连线可重连，取消拖拽`);
      return;
    }

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;

    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    this.dragManager.pendingDrag = {
      anchor,
      startPos: anchorPos,
      evt,
      isReconnect,
    };
  }

  startDragging(): void {
    const pending = this.dragManager.pendingDrag;
    if (!pending) return;

    const { anchor, startPos, evt, isReconnect } = pending;

    if (isReconnect) {
      const existingConnection = this.store.findConnectionByAnchor(anchor.id);
      if (!existingConnection) {
        console.warn('重连时未找到现有连线，取消');
        return;
      }
      const conn = existingConnection;
      if (conn.detachable === false || conn.reattach === false) return;
      this.handleReconnect(anchor, conn, startPos, evt);
    } else {
      this.handleCreate(anchor, startPos, evt);
    }

    this.dragManager.state = DragState.LINK_DRAGGING;
    this.dragManager.pendingDrag = null;
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  private handleCreate(anchor: Anchor, anchorPos: Point, _evt: MouseEvent): void {
    const orientation = getAnchorOrientation(anchor);
    let startX = anchorPos.x;
    let startY = anchorPos.y;

    if (anchor.type === AnchorType.CONTINUOUS) {
      const node = this.store.getNode(anchor.nodeId);
      if (node) {
        const defaultTarget = { x: node.x + node.width / 2, y: node.y + node.height + 100 };
        const dynamicPos = getContinuousAnchorPosition(node, defaultTarget);
        startX = dynamicPos.x;
        startY = dynamicPos.y;
      }
    }

    const dragDirection =
      anchor.type === AnchorType.CONTINUOUS ? 'output' : anchor.direction === 'both' ? 'output' : anchor.direction;

    this.dragManager.linkDragData = {
      sourceAnchorId: anchor.id,
      sourceAnchorType: anchor.type,
      startX,
      startY,
      endX: startX,
      endY: startY,
      type: 'create',
      dragDirection,
      orientation,
      connectorType: ConnectorType.STRAIGHT,
      stroke: Defaults.connection.stroke,
      strokeWidth: Defaults.connection.strokeWidth,
    };
  }

  private handleReconnect(anchor: Anchor, conn: Connection, anchorPos: Point, _evt: MouseEvent): void {
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
    const orientation = getAnchorOrientation(fixedAnchor);
    const stroke = conn.stroke || Defaults.connection.stroke;
    const strokeWidth = conn.strokeWidth || Defaults.connection.strokeWidth;
    const connectorType = conn.connectorType;

    this.dragManager.linkDragData = {
      sourceAnchorId: anchor.id,
      sourceAnchorType: anchor.type,
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
    const linkDragData = this.dragManager.linkDragData;
    if (!linkDragData) return false;

    linkDragData.endX = canvasPos.x;
    linkDragData.endY = canvasPos.y;

    let startX = linkDragData.startX;
    let startY = linkDragData.startY;

    const srcAnchor = this.store.getAnchor(linkDragData.sourceAnchorId);

    if (srcAnchor && srcAnchor.type === AnchorType.CONTINUOUS) {
      const sourceNode = this.store.getNode(srcAnchor.nodeId);
      if (sourceNode) {
        const dynamicPos = getContinuousAnchorPosition(sourceNode, canvasPos);
        startX = dynamicPos.x;
        startY = dynamicPos.y;
        linkDragData.startX = startX;
        linkDragData.startY = startY;
        console.log('✅ 动态起点更新:', startX, startY);
      }
    }

    const isReconnect = linkDragData.type === 'reconnect';
    const stroke = linkDragData.stroke;
    const strokeWidth = linkDragData.strokeWidth;
    const connectorType = linkDragData.connectorType || ConnectorType.FLOWCHART;
    const orientation = linkDragData.orientation;

    this.renderer.setTempLine(
      { x1: startX, y1: startY, x2: canvasPos.x, y2: canvasPos.y },
      connectorType,
      isReconnect,
      stroke,
      strokeWidth,
      orientation
    );

    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, linkDragData.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(linkDragData.sourceAnchorId);
    const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

    const directionCompatible = isDirectionCompatible(srcAnchor, hitAnchor, linkDragData.dragDirection, isReconnect);

    const isValidTarget =
      hitAnchor && sourceNode && hitAnchor.id !== linkDragData.sourceAnchorId && directionCompatible;

    if (isValidTarget && hitAnchor !== this.dragManager.highlightedAnchor) {
      console.log(
        `[高亮] 拖拽端方向: ${linkDragData.dragDirection}, 目标锚点: ${hitAnchor.id}, 目标方向: ${hitAnchor.direction}`
      );
      this.clearHighlight();
      this.dragManager.highlightedAnchor = hitAnchor;
      this.renderer.highlightAnchor(hitAnchor.id, true);
      this.dragManager.state = DragState.HOVERING;
    } else if (!isValidTarget && this.dragManager.highlightedAnchor) {
      this.clearHighlight();
      this.dragManager.state = DragState.LINK_DRAGGING;
    }

    return true;
  }

  finishLinkDrag(evt: MouseEvent): void {
    const linkDragData = this.dragManager.linkDragData;
    if (!linkDragData) return;

    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, linkDragData.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(linkDragData.sourceAnchorId);
    const isReconnect = linkDragData.type === 'reconnect';
    let success = false;

    const dragDir = linkDragData.dragDirection;
    const targetDir = hitAnchor?.direction || '无';

    console.log(`[onMouseUp] 拖拽端方向: ${dragDir}, 目标锚点: ${hitAnchor?.id || '无'}, 目标方向: ${targetDir}`);

    if (hitAnchor && sourceAnchor) {
      if (hitAnchor.id === sourceAnchor.id) {
        console.warn(`⏭️ 目标锚点与源锚点相同，取消重连`);
      } else {
        const directionCompatible = isDirectionCompatible(sourceAnchor, hitAnchor, dragDir, isReconnect);

        if (directionCompatible) {
          if (isReconnect) {
            success = this.handleReconnectDrop(hitAnchor);
          } else {
            success = this.handleCreateDrop(sourceAnchor, hitAnchor);
          }
        } else {
          console.warn(`❌ 方向不匹配: 拖拽端=${dragDir}, 目标端=${targetDir}`);
        }
      }
    } else {
      console.warn(`⏭️ 未命中有效目标锚点，取消连接。拖拽端方向=${dragDir}`);
    }

    if (isReconnect && linkDragData.connectionId) {
      this.renderer.setReconnecting(linkDragData.connectionId, false);
    }

    this.clearHighlight();
    this.renderer.clearTempLine();
    this.dragManager.linkDragData = null;
    this.dragManager.state = DragState.IDLE;
  }

  private handleCreateDrop(sourceAnchor: Anchor, hitAnchor: Anchor): boolean {
    if (sourceAnchor.type === AnchorType.CONTINUOUS) {
      this.store.addConnection({
        id: crypto.randomUUID(),
        connectorType: ConnectorType.STRAIGHT,
        sourceAnchorId: sourceAnchor.id,
        targetAnchorId: hitAnchor.id,
        stroke: Defaults.connection.stroke,
        strokeWidth: Defaults.connection.strokeWidth,
      });
      console.log(`✅ 新建连线成功（连续锚点）: 源端方向=${sourceAnchor.direction}, 目标端方向=${hitAnchor.direction}`);
      return true;
    }

    const exist = this.store
      .getAllConnections()
      .some(c => c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id);

    if (!exist) {
      this.store.addConnection({
        id: crypto.randomUUID(),
        connectorType: ConnectorType.STRAIGHT,
        sourceAnchorId: sourceAnchor.id,
        targetAnchorId: hitAnchor.id,
        stroke: Defaults.connection.stroke,
        strokeWidth: Defaults.connection.strokeWidth,
      });
      console.log(`✅ 新建连线成功: 源端方向=${sourceAnchor.direction}, 目标端方向=${hitAnchor.direction}`);
      return true;
    } else {
      console.warn('连线已存在，创建取消');
      return false;
    }
  }

  private handleReconnectDrop(hitAnchor: Anchor): boolean {
    const linkDragData = this.dragManager.linkDragData;
    if (!linkDragData) return false;

    const connId = linkDragData.connectionId!;
    const conn = this.store.getConnection(connId);
    if (!conn) return false;

    const dragDir = linkDragData.dragDirection;
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

  cancelLinkDrag(): void {
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
