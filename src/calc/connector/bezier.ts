// src/calc/connector/bezier.ts

import type { Point } from '../../types/geometry';
import { Geometry } from '../geometry';

export interface BezierResult {
  path: string;
  startDirection: { dx: number; dy: number };
  endDirection: { dx: number; dy: number };
}

/**
 * 贝塞尔曲线连接器（三次贝塞尔曲线）
 * 使用两个控制点生成平滑曲线，控制点沿起点和终点的水平方向偏移
 *
 * @param start 起点坐标
 * @param end 终点坐标
 * @param offsetFactor 控制点偏移因子（默认 0.5，即取水平距离的一半），可传入自定义值
 * @param minOffset 最小偏移量（默认 40），防止曲线过于平直
 * @returns SVG 路径字符串，例如 "M 10 20 C 30 20, 80 100, 100 100"
 */

export function connectorBezier(
  start: Point,
  end: Point,
  offsetFactor: number = 0.5,
  minOffset: number = 40
): BezierResult {
  const dx = end.x - start.x;
  const offset = Math.max(Math.abs(dx) * offsetFactor, minOffset);
  const cp1: Point = { x: start.x + offset, y: start.y };
  const cp2: Point = { x: end.x - offset, y: end.y };
  const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  return {
    path,
    startDirection: Geometry.direction(cp1, start), // 反向
    endDirection: Geometry.direction(cp2, end),
  };
}
