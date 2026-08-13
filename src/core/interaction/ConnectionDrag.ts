// src/core/interaction/ConnectionDrag.ts

import type { Point } from '../../types/geometry';
import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { ViewportManager } from '../viewport/ViewportManager';
import type { SvgRenderer } from '../renderer/SvgRenderer';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Anchor, Connection } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { HitTest } from './HitTest';
import type { DragManager } from './DragManager';
import { getAnchorOrientation } from '../../calc/anchor/orientation';
import { Geometry } from '../../calc/geometry';

/**
 * 连线拖拽执行器（统一处理创建和重连）
 */
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

  /**
   * 启动连线拖拽（自动判断创建或重连）
   */
  start(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.dragManager.state !== 'idle') return;

    const isFull = this.store.isAnchorFull(anchor.id);
    if (isFull) {
      console.warn(`锚点 ${anchor.id} 已满，不能拖拽`);
      return;
    }

    // 查找已有连线（重连模式）
    const existingConnection = this.store.findConnectionByAnchor(anchor.id);
    const isReconnect = existingConnection !== undefined && !isFull;

    if (isReconnect && existingConnection?.fixed === true) {
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
      isReconnect,
    };
    this.dragManager.state = 'link_dragging';
  }

  /**
   * 真正开始拖拽（鼠标移动后）
   */
  startDragging(): void {
    const pending = this.dragManager.pendingDrag;
    if (!pending) return;

    const { anchor, startPos, evt, isReconnect } = pending;

    if (isReconnect) {
      const existingConnection = this.store.findConnectionByAnchor(anchor.id);
      if (!existingConnection) {
        console.warn('重连时未找到现有连线');
        this._resetDragState();
        return;
      }
      this.handleReconnect(anchor, existingConnection, startPos, evt);
    } else {
      this.handleCreate(anchor, startPos, evt);
    }

    this.dragManager.pendingDrag = null;
    this.chart.getSvgRoot().style.cursor = 'grabbing';
    this.clearHighlight();
  }

  private handleCreate(anchor: Anchor, anchorPos: Point, _evt: MouseEvent): void {
    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;

    const orientation = getAnchorOrientation(node, anchor);

    this.dragManager.linkDragData = {
      sourceAnchorId: anchor.id,
      startX: anchorPos.x,
      startY: anchorPos.y,
      endX: anchorPos.x,
      endY: anchorPos.y,
      type: 'create',
      dragDirection: 'output',
      orientation,
      connectorType: 'straight',
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
      orientation,
      stroke,
      strokeWidth,
      connectorType,
      fixedAnchorId,
    };

    this.renderer.setReconnecting(conn.id, true);
    this.renderer.highlightAnchor(anchor.id, true);
  }

  /**
   * 处理拖拽移动更新
   */
  processMove(canvasPos: Point): boolean {
    const data = this.dragManager.linkDragData;
    if (!data) return false;

    data.endX = canvasPos.x;
    data.endY = canvasPos.y;

    const isReconnect = data.type === 'reconnect';

    // 更新临时线
    this._updateTempLine(data, canvasPos);

    // 命中检测
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, data.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(data.sourceAnchorId);
    const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

    const isValidTarget = hitAnchor && sourceNode && hitAnchor.id !== data.sourceAnchorId;

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

  /**
   * 结束拖拽（鼠标释放）
   */
  end(evt: MouseEvent): void {
    const data = this.dragManager.linkDragData;
    if (!data) return;

    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, data.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(data.sourceAnchorId);
    const isReconnect = data.type === 'reconnect';
    let success = false;

    const dragDir = data.dragDirection;
    console.log(`[onMouseUp] 目标锚点: ${hitAnchor?.id || '无'}`);

    if (hitAnchor && sourceAnchor) {
      if (hitAnchor.id === sourceAnchor.id) {
        console.warn(`⏭️ 目标锚点与源锚点相同，取消操作`);
      } else {
        success = this._handleDrop(sourceAnchor, hitAnchor, isReconnect);
      }
    } else {
      console.warn(`⏭️ 未命中有效目标锚点，取消操作。拖拽端方向=${dragDir}`);
    }

    // 清理
    if (isReconnect && data.connectionId) {
      this.renderer.setReconnecting(data.connectionId, false);
    }

    this.clearHighlight();
    this.renderer.clearTempLine();
    this._resetDragState();
  }

  /**
   * 取消拖拽
   */
  cancel(): void {
    this._resetDragState();
    this.renderer.clearTempLine();
    this.clearHighlight();
  }

  // ==================== 私有辅助方法 ====================

  private _updateTempLine(data: any, canvasPos: Point): void {
    const isReconnect = data.type === 'reconnect';
    const connectorType = data.connectorType || 'flowchart';
    const orientation = data.orientation;

    this.renderer.setTempLine(
      { x1: data.startX, y1: data.startY, x2: canvasPos.x, y2: canvasPos.y },
      connectorType,
      isReconnect,
      data.stroke,
      data.strokeWidth,
      orientation
    );
  }

  private _handleDrop(sourceAnchor: Anchor, hitAnchor: Anchor, isReconnect: boolean): boolean {
    if (isReconnect) {
      return this._handleReconnectDrop(sourceAnchor, hitAnchor);
    } else {
      return this._handleCreateDrop(sourceAnchor, hitAnchor);
    }
  }

  private _handleCreateDrop(sourceAnchor: Anchor, hitAnchor: Anchor): boolean {
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
      console.log(`✅ 新建连线成功: 源锚点=${sourceAnchor.id}, 目标锚点=${hitAnchor.id}`);
      return true;
    } else {
      console.warn('连线已存在，创建取消');
      return false;
    }
  }

  private _handleReconnectDrop(sourceAnchor: Anchor, hitAnchor: Anchor): boolean {
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

  private _resetDragState(): void {
    this.dragManager.linkDragData = null;
    this.dragManager.pendingDrag = null;
    this.dragManager.state = 'idle';
  }

  private clearHighlight(): void {
    if (this.dragManager.highlightedAnchor) {
      this.renderer.highlightAnchor(this.dragManager.highlightedAnchor.id, false);
      this.dragManager.highlightedAnchor = null;
    }
  }
}
