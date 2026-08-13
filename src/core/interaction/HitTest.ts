// src/core/interaction/HitTest.ts

import type { Point } from '../../types/geometry';
import type { Store } from '../store/Store';
import type { Anchor } from '../../types/SvgModel';

export type HitTargetType = 'node' | 'anchor' | 'connection' | null;

export class HitTest {
  public findNearestAnchor(
    point: Point,
    store: Store,
    excludeAnchorId?: string,
    hitRadius: number = 15
  ): Anchor | null {
    const allAnchors = store.getAllAnchors();
    let closest: Anchor | null = null;
    let minDist = hitRadius;

    for (const ap of allAnchors) {
      if (excludeAnchorId && ap.id === excludeAnchorId) continue;
      const node = store.getNode(ap.nodeId);
      if (!node) continue;
      const pos = store.calcAnchorPosForNode(node, ap);
      // 角锚点使用更大的检测半径
      const isCorner =
        (ap.position?.includes('top') && ap.position?.includes('left')) ||
        (ap.position?.includes('top') && ap.position?.includes('right')) ||
        (ap.position?.includes('bottom') && ap.position?.includes('left')) ||
        (ap.position?.includes('bottom') && ap.position?.includes('right'));
      const radius = isCorner ? hitRadius * 1.5 : hitRadius;
      const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
      if (dist < minDist) {
        minDist = dist;
        closest = ap;
      }
    }
    return closest;
  }
}
