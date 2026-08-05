// src/calc/anchor/continuous.ts

import type { Point, Rect } from '../../types/geometry';
import { Geometry } from '../geometry';

/**
 * 计算连续锚点（核心算法）
 * 返回源节点和目标节点边缘上的最佳连接点对
 */
function computeContinuousAnchor(
  sourceRect: Rect,
  targetRect: Rect
): {
  source: Point;
  target: Point;
} {
  const srcEdges = Geometry.getRectEdges(sourceRect);
  const tgtEdges = Geometry.getRectEdges(targetRect);

  const edgesSrc: [Point, Point][] = [srcEdges.top, srcEdges.right, srcEdges.bottom, srcEdges.left];
  const edgesTgt: [Point, Point][] = [tgtEdges.top, tgtEdges.right, tgtEdges.bottom, tgtEdges.left];

  let minDist = Infinity;
  let bestSource: Point = { x: 0, y: 0 };
  let bestTarget: Point = { x: 0, y: 0 };

  for (const se of edgesSrc) {
    for (const te of edgesTgt) {
      const [sA, sB] = se;
      const [tA, tB] = te;
      const candidates: Array<{ sp: Point; tp: Point }> = [];

      candidates.push({ sp: sA, tp: Geometry.projectPointOnSegment(sA, tA, tB) });
      candidates.push({ sp: sB, tp: Geometry.projectPointOnSegment(sB, tA, tB) });
      candidates.push({ sp: Geometry.projectPointOnSegment(tA, sA, sB), tp: tA });
      candidates.push({ sp: Geometry.projectPointOnSegment(tB, sA, sB), tp: tB });

      for (const c of candidates) {
        const dist = Geometry.distance(c.sp, c.tp);
        if (dist < minDist) {
          minDist = dist;
          bestSource = c.sp;
          bestTarget = c.tp;
        }
      }
    }
  }

  // 修正到矩形边缘（浮点误差）
  const clampedSource = clampPointToRectEdge(bestSource, sourceRect);
  const clampedTarget = clampPointToRectEdge(bestTarget, targetRect);

  return {
    source: clampedSource,
    target: clampedTarget,
  };
}

/**
 * 将点修正到矩形边缘（辅助）
 */
function clampPointToRectEdge(point: Point, rect: Rect): Point {
  const edges = Geometry.getRectEdges(rect);
  const edgeList: [Point, Point][] = [edges.top, edges.right, edges.bottom, edges.left];
  let minDist = Infinity;
  let best: Point = point;

  for (const [p1, p2] of edgeList) {
    const projected = Geometry.projectPointOnSegment(point, p1, p2);
    const dist = Geometry.distance(point, projected);
    if (dist < minDist) {
      minDist = dist;
      best = projected;
    }
  }
  return best;
}

/**
 * 对外导出：连续锚点对
 */
export function getContinuousAnchorPair(sourceRect: Rect, targetRect: Rect): { source: Point; target: Point } {
  return computeContinuousAnchor(sourceRect, targetRect);
}
