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
import { ConnectorType, AnchorType } from '../../types/SvgModel';
import { getContinuousAnchorPosition } from '../../calc/anchor/continuous';
import { getAnchorOrientation } from '../../utils/anchor-helpers';
import { isDirectionCompatible } from '../../utils/direction-helpers';
import type { DragManager } from './DragManager';
import { DragState } from './DragManager';

/**
 * 创建连线拖拽执行器
 * 处理从锚点拖拽创建新连线的完整生命周期
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
   * 启动创建连线拖拽
   */
  start(anchor: Anchor, evt: MouseEvent): void {
    if (this.viewport.isSpaceActive() || this.dragManager.state !== 'idle') return;

    const isOutput =
      anchor.type === AnchorType.CONTINUOUS || anchor.direction === 'output' || anchor.direction === 'both';
    const isFull = this.store.isAnchorFull(anchor.id);
    if (isFull) {
      console.warn(`锚点 ${anchor.id} 已满，不能拖拽`);
      return;
    }

    if (!isOutput) {
      console.warn(`⏭️ 锚点 ${anchor.id} 不是输出端，取消拖拽`);
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
    this.dragManager.state = DragState.LINK_DRAGGING;
  }

  /**
   * 真正开始拖拽（鼠标移动后）
   */
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
    if (!node) return; // 防御性检查
    const orientation = getAnchorOrientation(anchor, node);
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

  /**
   * 处理移动更新
   */
  processMove(canvasPos: Point): boolean {
    const data = this.dragManager.linkDragData;
    if (!data) return false;

    data.endX = canvasPos.x;
    data.endY = canvasPos.y;

    let startX = data.startX;
    let startY = data.startY;

    const srcAnchor = this.store.getAnchor(data.sourceAnchorId);

    if (srcAnchor && srcAnchor.type === AnchorType.CONTINUOUS) {
      const sourceNode = this.store.getNode(srcAnchor.nodeId);
      if (sourceNode) {
        const dynamicPos = getContinuousAnchorPosition(sourceNode, canvasPos);
        startX = dynamicPos.x;
        startY = dynamicPos.y;
        data.startX = startX;
        data.startY = startY;
        console.log('✅ 动态起点更新:', startX, startY);
      }
    }

    const stroke = data.stroke;
    const strokeWidth = data.strokeWidth;
    const connectorType = data.connectorType || ConnectorType.FLOWCHART;
    const orientation = data.orientation;

    this.renderer.setTempLine(
      { x1: startX, y1: startY, x2: canvasPos.x, y2: canvasPos.y },
      connectorType,
      false, // isReconnect = false
      stroke,
      strokeWidth,
      orientation
    );

    // 命中检测
    const hitAnchor = this.hitTest.findNearestAnchor(canvasPos, this.store, data.sourceAnchorId);
    const sourceAnchor = this.store.getAnchor(data.sourceAnchorId);
    const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;

    const directionCompatible = isDirectionCompatible(sourceAnchor, hitAnchor, data.dragDirection, false);

    const isValidTarget = hitAnchor && sourceNode && hitAnchor.id !== data.sourceAnchorId && directionCompatible;

    if (isValidTarget && hitAnchor !== this.dragManager.highlightedAnchor) {
      console.log(
        `[高亮] 拖拽端方向: ${data.dragDirection}, 目标锚点: ${hitAnchor.id}, 目标方向: ${hitAnchor.direction}`
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

  /**
   * 结束拖拽（鼠标释放）
   */
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

  /**
   * 取消拖拽
   */
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
