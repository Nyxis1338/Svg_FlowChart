import type { Point, Rect } from "../../types/geometry";
import { Geometry } from "../geometry";

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

  return {
    source: { ...bestSource },
    target: { ...bestTarget }
  };
}