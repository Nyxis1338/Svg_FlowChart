// src/core/interaction/HitTest.ts

import type { Point } from '../../types/geometry';
import type { Store } from '../store/Store';
import type { Anchor, Node, Connection } from '../../types/SvgModel';

export type HitTargetType = 'node' | 'anchor' | 'connection' | null;

export interface HitResult {
  type: HitTargetType;
  id: string | null;
  /** 如果是锚点，返回锚点对象（便于后续直接使用） */
  anchor?: Anchor;
}

/**
 * 命中检测模块：纯几何计算，不包含业务逻辑（如方向校验、最大连线数等）
 */
export class HitTest {
  /**
   * 检测鼠标下方最近的锚点
   * @param point 画布逻辑坐标
   * @param store 数据仓库
   * @param excludeAnchorId 排除的锚点ID（通常为自身）
   * @param hitRadius 检测半径，默认 22
   * @returns 命中的锚点，若无则返回 null
   */
  public findNearestAnchor(
    point: Point,
    store: Store,
    excludeAnchorId?: string,
    hitRadius: number = 30 // 从 22 增大到 30
  ): Anchor | null {
    const allAnchors = store.getAllAnchors();
    let closest: Anchor | null = null;
    let minDist = hitRadius;

    for (const ap of allAnchors) {
      // 排除自身锚点
      if (excludeAnchorId && ap.id === excludeAnchorId) continue;

      const node = store.getNode(ap.nodeId);
      if (!node) continue;
      const pos = store.calcAnchorPosForNode(node, ap);
      const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
      if (dist < minDist) {
        minDist = dist;
        closest = ap;
      }
    }
    return closest;
  }

  /**
   * 综合命中检测（预留扩展）
   * 未来可检测节点、连线等
   */
  public test(point: Point, store: Store, options?: { excludeAnchorId?: string; hitRadius?: number }): HitResult {
    const hitRadius = options?.hitRadius ?? 22;
    const anchor = this.findNearestAnchor(point, store, options?.excludeAnchorId, hitRadius);
    if (anchor) {
      return { type: 'anchor', id: anchor.id, anchor };
    }

    // 未来可扩展：检测节点、连线
    // TODO: 节点矩形检测、连线路径距离检测

    return { type: null, id: null };
  }
}
