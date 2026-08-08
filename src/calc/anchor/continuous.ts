// src/calc/anchor/continuous.ts

import type { Point, Rect } from '../../types/geometry';
import { Geometry } from '../geometry';
import { NodeShape } from '../../types/SvgModel';
import type { Node } from '../../types/SvgModel';

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
 * 计算连续锚点位置（支持矩形/圆形/椭圆/菱形）
 * @param node 节点
 * @param targetPoint 目标点（鼠标或对端中心）
 * @param allowedFaces 可选，限定边缘方向
 * @returns 锚点坐标
 */
export function getContinuousAnchorPosition(
  node: Node,
  targetPoint: Point,
  allowedFaces?: ('top' | 'bottom' | 'left' | 'right')[]
): Point {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const rect = { x: node.x, y: node.y, width: node.width, height: node.height };

  // 如果目标点恰好在节点中心，默认向下
  const eps = 0.01;
  if (Math.abs(targetPoint.x - cx) < eps && Math.abs(targetPoint.y - cy) < eps) {
    return { x: cx, y: rect.y + rect.height };
  }

  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;
  const angle = Math.atan2(dy, dx);

  let point: Point | null = null;

  switch (node.shape) {
    case NodeShape.CIRCLE: {
      const r = Math.min(node.width, node.height) / 2;
      point = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      break;
    }
    case NodeShape.ELLIPSE: {
      const rx = node.width / 2;
      const ry = node.height / 2;
      point = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
      break;
    }
    case NodeShape.DIAMOND: {
      const hw = node.width / 2;
      const hh = node.height / 2;
      const t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
      point = { x: cx + t * dx, y: cy + t * dy };
      break;
    }
    default: {
      // 矩形：使用射线相交
      const result = Geometry.rayRectIntersect(rect, { x: cx, y: cy }, { x: dx, y: dy });
      if (result) {
        point = result;
      } else {
        // 备选：直接计算射线与四条边的交点
        point = rayRectFallback(rect, { x: cx, y: cy }, { x: dx, y: dy });
      }
      break;
    }
  }

  // 如果限定边缘面，检查并修正
  if (point && allowedFaces && allowedFaces.length > 0) {
    const face = getFaceForPoint(point, rect);
    if (face && !allowedFaces.includes(face)) {
      // 换到允许面的最近点
      return getClosestAllowedFacePoint(rect, targetPoint, allowedFaces);
    }
  }

  return point || { x: cx, y: rect.y + rect.height };
}

/**
 * 射线-矩形相交备选（纯数学计算）
 */
function rayRectFallback(rect: Rect, origin: Point, direction: Point): Point {
  const { x, y, width, height } = rect;
  const { x: ox, y: oy } = origin;
  const { x: dx, y: dy } = direction;
  const eps = 1e-10;

  const edges = [
    [
      { x, y },
      { x: x + width, y },
    ],
    [
      { x: x + width, y },
      { x: x + width, y: y + height },
    ],
    [
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    [
      { x, y: y + height },
      { x, y },
    ],
  ];

  let bestT = Infinity;
  let bestPoint = { x: ox, y: oy };

  for (const [p1, p2] of edges) {
    const ex = p2.x - p1.x;
    const ey = p2.y - p1.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < eps) continue;
    const t = ((p1.x - ox) * ey - (p1.y - oy) * ex) / denom;
    const u = ((p1.x - ox) * dy - (p1.y - oy) * dx) / denom;
    if (t > eps && u >= 0 && u <= 1 && t < bestT) {
      bestT = t;
      bestPoint = { x: ox + t * dx, y: oy + t * dy };
    }
  }
  return bestPoint;
}

/**
 * 获取点所在的边缘面
 */
function getFaceForPoint(p: Point, rect: Rect): 'top' | 'bottom' | 'left' | 'right' | '' {
  const eps = 0.5;
  if (Math.abs(p.y - rect.y) < eps) return 'top';
  if (Math.abs(p.y - (rect.y + rect.height)) < eps) return 'bottom';
  if (Math.abs(p.x - rect.x) < eps) return 'left';
  if (Math.abs(p.x - (rect.x + rect.width)) < eps) return 'right';
  return '';
}

/**
 * 当射线交点不在允许面时，计算允许面上最近的点
 */
function getClosestAllowedFacePoint(
  rect: Rect,
  target: Point,
  allowedFaces: ('top' | 'bottom' | 'left' | 'right')[]
): Point {
  const candidates: Point[] = [];
  if (allowedFaces.includes('top')) candidates.push({ x: target.x, y: rect.y });
  if (allowedFaces.includes('bottom')) candidates.push({ x: target.x, y: rect.y + rect.height });
  if (allowedFaces.includes('left')) candidates.push({ x: rect.x, y: target.y });
  if (allowedFaces.includes('right')) candidates.push({ x: rect.x + rect.width, y: target.y });

  let best = candidates[0];
  let minDist = Infinity;
  for (const p of candidates) {
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < minDist) {
      minDist = d;
      best = p;
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
