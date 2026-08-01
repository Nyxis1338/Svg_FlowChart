import type { Point, Rect } from "../../types/geometry";
import { computeStaticAnchor, StaticAnchorType } from "./static";
import { computeContinuousAnchor } from "./continuous";
import { computePerimeterAnchor, getAllPerimeterAnchors } from "./perimeter";

// 导出静态锚相关类型/函数
export * from "./static";

// 修正类型名：StaticAnchorType 不是 Static
export type AnchorType = StaticAnchorType | "Continuous" | "Perimeter";

/**
 * 静态锚点
 */
export function getStaticAnchor(rect: Rect, type: StaticAnchorType, offset?: Point): Point {
  const pt = computeStaticAnchor(rect, type);
  if (offset) {
    return { x: pt.x + offset.x, y: pt.y + offset.y };
  }
  return pt;
}

/**
 * 连续锚点（一对节点）
 */
export function getContinuousAnchorPair(sourceRect: Rect, targetRect: Rect) {
  return computeContinuousAnchor(sourceRect, targetRect);
}

/**
 * 周边均分锚点
 */
export function getPerimeterAnchor(rect: Rect, total: number, idx: number): Point {
  return computePerimeterAnchor(rect, total, idx);
}
export function getPerimeterAnchorList(rect: Rect, total: number): Point[] {
  return getAllPerimeterAnchors(rect, total);
}