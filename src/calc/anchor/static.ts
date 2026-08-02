import type { Point, Rect } from "../../types/geometry";

/**
 * 静态锚点类型：
 * - Top: 上边中点
 * - Right: 右边中点
 * - Bottom: 下边中点
 * - Left: 左边中点
 * - Center: 节点中心
 */
export type StaticAnchorType = "Top" | "Right" | "Bottom" | "Left" | "Center";

/**
 * 计算静态锚点在画布上的坐标
 * @param rect 节点的矩形区域
 * @param type 锚点类型
 * @returns 锚点的画布坐标
 */
export function computeStaticAnchor(rect: Rect, type: StaticAnchorType): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  switch (type) {
    case "Top":
      return { x: cx, y: rect.y };
    case "Right":
      return { x: rect.x + rect.width, y: cy };
    case "Bottom":
      return { x: cx, y: rect.y + rect.height };
    case "Left":
      return { x: rect.x, y: cy };
    case "Center":
      return { x: cx, y: cy };
    default:
      // 类型守卫，确保所有情况都被处理
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
  }
}