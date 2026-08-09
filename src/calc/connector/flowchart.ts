// src/calc/connector/flowchart.ts

import type { Point } from '../../types/geometry';

/**
 * 生成正交折线路径（仅桥接两个端点，不再处理 stub）
 * 假设起点和终点已经过 gap+stub 偏移
 */
export function connectorFlowchart(start: Point, end: Point): string {
  if (Math.abs(start.x - end.x) < 0.001 && Math.abs(start.y - end.y) < 0.001) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let middlePoints: Point[] = [];
  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平优先：先水平后垂直
    middlePoints = [{ x: end.x, y: start.y }];
  } else {
    // 垂直优先：先垂直后水平
    middlePoints = [{ x: start.x, y: end.y }];
  }

  let d = `M ${start.x} ${start.y}`;
  for (const p of middlePoints) {
    d += ` L ${p.x} ${p.y}`;
  }
  d += ` L ${end.x} ${end.y}`;
  return d;
}
