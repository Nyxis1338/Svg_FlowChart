import type { Point } from "../../types/geometry";

/**
 * 直线连接器：生成从起点到终点的直线路径
 * @param start 起点坐标
 * @param end 终点坐标
 * @returns SVG 路径字符串，例如 "M 10 20 L 100 200"
 */
export function connectorStraight(start: Point, end: Point): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}