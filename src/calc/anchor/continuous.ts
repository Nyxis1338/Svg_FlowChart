import type { Point, Rect } from "../../types/geometry";
import type { FlowNode } from "../../types/SvgModel";
import { Geometry } from "../geometry";

/**
 * 计算连续锚点（Continuous Anchor）的一对坐标
 * 该算法会遍历源节点和目标节点的四条边，找到距离最近的一对点作为连线端点
 * 
 * @param sourceRect 源节点的矩形区域
 * @param targetRect 目标节点的矩形区域
 * @returns 包含源端点和目标端点的坐标对象
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

      // 候选点组合：线段端点互投影
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

  return {
    source: { ...bestSource },
    target: { ...bestTarget }
  };
}

/**
 * 重载：支持直接传入 FlowNode 对象
 */
export function computeContinuousAnchorFromNodes(sourceNode: FlowNode, targetNode: FlowNode) {
  return computeContinuousAnchor(sourceNode, targetNode);
}