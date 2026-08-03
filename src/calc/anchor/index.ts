import type { Point, Rect } from "../../types/geometry";
import { computeStaticAnchor, StaticAnchorType } from "./static";
import { computeContinuousAnchor } from "./continuous";
import { computePerimeterAnchor, getAllPerimeterAnchors } from "./perimeter";

export * from "./static";
export type AnchorType = StaticAnchorType | "Continuous" | "Perimeter";

/**
 * 静态锚点：计算节点上固定位置（上/右/下/左/中心）的坐标
 */
export function getStaticAnchor(rect: Rect, type: StaticAnchorType, offset?: Point): Point {
  const pt = computeStaticAnchor(rect, type);
  if (offset) {
    return { x: pt.x + offset.x, y: pt.y + offset.y };
  }
  return pt;
}

/**
 * 连续锚点：根据两个矩形的相对位置计算最佳连接点
 * 仅接受 Rect 类型（调用方负责从 Node 提取 Rect）
 */
export function getContinuousAnchorPair(sourceRect: Rect, targetRect: Rect): {
  source: Point;
  target: Point;
} {
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