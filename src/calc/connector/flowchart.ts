// src/calc/connector/flowchart.ts

import type { Point } from '../../types/geometry';

/**
 * 方向向量接口
 */
interface Orientation {
  dx: number;
  dy: number;
}

/**
 * 生成正交折线路径（start → end 的中间部分）
 * 返回以 M 开头的完整路径，供 generator 拼接
 *
 * @param start 连接器起点（已包含 gap+stub 偏移）
 * @param end 连接器终点（已包含 gap+stub 偏移）
 * @param sourceOrientation 起点法线方向
 * @param targetOrientation 终点法线方向
 * @param midpoint 中间点位置（0~1，默认 0.5）
 * @returns SVG 路径字符串（以 M 开头）
 */
export function connectorFlowchart(
  start: Point,
  end: Point,
  sourceOrientation: Orientation,
  targetOrientation: Orientation,
  midpoint: number = 0.5
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // 起点终点重合
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const midX = start.x + (end.x - start.x) * midpoint;
  const midY = start.y + (end.y - start.y) * midpoint;

  const distX = Math.abs(end.x - start.x);
  const distY = Math.abs(end.y - start.y);

  let path = `M ${start.x} ${start.y}`;
  if (distX > distY) {
    // 水平主导：先水平后垂直
    path += ` L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  } else {
    // 垂直主导：先垂直后水平
    path += ` L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  }
  return path;
}
