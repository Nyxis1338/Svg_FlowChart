import type { Point, Rect } from "../../types/geometry";
import type { Node } from "../../types/SvgModel";
import { Geometry } from "../geometry";

/**
 * 计算连续锚点（Continuous Anchor）的一对坐标
 * 遍历源节点和目标节点的四条边，找到距离最近的一对点作为连线端点
 * 返回的点保证在矩形边缘上
 */
export function computeContinuousAnchor(sourceRect: Rect, targetRect: Rect): {
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

  // 安全兜底：确保点在矩形边缘上（防止浮点误差导致点在内部）
  const clampedSource = clampPointToRectEdge(bestSource, sourceRect);
  const clampedTarget = clampPointToRectEdge(bestTarget, targetRect);

  // 🔍 在这里插入调试日志（返回前）
  console.log('=== computeContinuousAnchor 调试 ===');
  console.log('源矩形:', sourceRect);
  console.log('目标矩形:', targetRect);
  console.log('原始计算的源端点:', bestSource);
  console.log('原始计算的目标端点:', bestTarget);
  console.log('修正后的源端点:', clampedSource);
  console.log('修正后的目标端点:', clampedTarget);
  console.log('目标端点是否在边缘? 期望: x=', targetRect.x, '或', targetRect.x + targetRect.width, '， y=', targetRect.y, '或', targetRect.y + targetRect.height);
  console.log('实际目标端点:', clampedTarget);
  
  return {
    source: clampedSource,
    target: clampedTarget,
  };
}

/**
 * 将点修正到矩形边缘上（找到最近边并投影）
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
 * 重载：支持直接传入 Node 对象
 */
export function computeContinuousAnchorFromNodes(sourceNode: Node, targetNode: Node) {
  return computeContinuousAnchor(sourceNode, targetNode);
}