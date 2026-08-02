import type { Point, Rect } from "../../types/geometry";
import type { FlowNode } from "../../types/SvgModel";
import { computeStaticAnchor, StaticAnchorType } from "./static";
import { computeContinuousAnchor } from "./continuous";
import { computePerimeterAnchor, getAllPerimeterAnchors } from "./perimeter";

export * from "./static";

export type AnchorType = StaticAnchorType | "Continuous" | "Perimeter";

/**
 * 类型守卫：判断是否为 FlowNode
 */
function isFlowNode(obj: Rect | FlowNode): obj is FlowNode {
  return 'id' in obj && 'label' in obj;
}

export function getStaticAnchor(rect: Rect, type: StaticAnchorType, offset?: Point): Point {
  const pt = computeStaticAnchor(rect, type);
  if (offset) {
    return { x: pt.x + offset.x, y: pt.y + offset.y };
  }
  return pt;
}

export function getContinuousAnchorPair(
  source: Rect | FlowNode,
  target: Rect | FlowNode
): { source: Point; target: Point } {
  const sourceRect: Rect = isFlowNode(source)
    ? { x: source.x, y: source.y, width: source.width, height: source.height }
    : source;
  const targetRect: Rect = isFlowNode(target)
    ? { x: target.x, y: target.y, width: target.width, height: target.height }
    : target;

  return computeContinuousAnchor(sourceRect, targetRect);
}

export function getPerimeterAnchor(rect: Rect, total: number, idx: number): Point {
  return computePerimeterAnchor(rect, total, idx);
}

export function getPerimeterAnchorList(rect: Rect, total: number): Point[] {
  return getAllPerimeterAnchors(rect, total);
}