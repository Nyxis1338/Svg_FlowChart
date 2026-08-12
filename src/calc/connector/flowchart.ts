// src/calc/connector/flowchart.ts

import type { Point } from '../../types/geometry';
import { Geometry } from '../geometry';

export interface FlowchartResult {
  path: string;
  startDirection: { dx: number; dy: number };
  endDirection: { dx: number; dy: number };
}

/**
 * 生成正交折线路径（start → end 的中间部分）
 * 返回以 M 开头的完整路径，供 generator 拼接
 * @param start 连接器起点（已包含 gap+stub 偏移）
 * @param end 连接器终点（已包含 gap+stub 偏移）
 * @param midpoint 中间点位置（0~1，默认 0.5）
 * @returns SVG 路径字符串（以 M 开头）
 * 1个M + 3个L
 * M 130 190 L 200 190 L 200 220 L 270 220
 */
export function connectorFlowchart(start: Point, end: Point, midpoint: number = 0.5): FlowchartResult {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    return {
      path,
      startDirection: Geometry.direction(end, start),
      endDirection: Geometry.direction(start, end),
    };
  }

  const midX = start.x + (end.x - start.x) * midpoint;
  const midY = start.y + (end.y - start.y) * midpoint;
  const distX = Math.abs(end.x - start.x);
  const distY = Math.abs(end.y - start.y);

  let path: string;
  let startDir: { dx: number; dy: number };
  let endDir: { dx: number; dy: number };

  if (distX > distY) {
    // 水平主导：先水平后垂直
    path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    startDir = Geometry.direction({ x: midX, y: start.y }, start);
    endDir = Geometry.direction({ x: midX, y: end.y }, end);
  } else {
    // 垂直主导：先垂直后水平
    path = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
    startDir = Geometry.direction({ x: start.x, y: midY }, start);
    endDir = Geometry.direction({ x: end.x, y: midY }, end);
  }

  return {
    path,
    startDirection: startDir,
    endDirection: endDir,
  };
}
