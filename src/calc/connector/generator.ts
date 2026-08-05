// src/calc/connector/generator.ts

import type { Point } from '../../types/geometry';
import { ConnectorType } from '../../types/SvgModel';
import { connectorStraight } from './straight';
import { connectorBezier } from './bezier';
import { connectorFlowchart } from './flowchart';
import { Defaults } from '../../styles/defaults';

/**
 * 在起点和终点应用 gap（间距）
 */
function applyGap(start: Point, end: Point, gap: number = 0): { start: Point; end: Point } {
  if (gap === 0) return { start, end };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < gap * 2) {
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    return { start: mid, end: mid };
  }
  const ratio = gap / dist;
  const newStart = {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio,
  };
  const newEnd = {
    x: end.x - dx * ratio,
    y: end.y - dy * ratio,
  };
  return { start: newStart, end: newEnd };
}

/**
 * 生成路径
 * @param mode 连线类型
 * @param start 起点
 * @param end 终点
 * @param options 可选参数
 * @param orientation 起点法线方向（用于 flowchart）
 */
export function generatePath(
  mode: ConnectorType,
  start: Point,
  end: Point,
  options?: { stub?: number; gap?: number },
  orientation?: { dx: number; dy: number }
): string {
  const stub = options?.stub ?? Defaults.connection.stub ?? 30;
  const gap = options?.gap ?? Defaults.connection.gap ?? 0;

  // 应用 gap
  const { start: s, end: e } = applyGap(start, end, gap);

  switch (mode) {
    case ConnectorType.STRAIGHT:
      return connectorStraight(s, e);
    case ConnectorType.BEZIER:
      return connectorBezier(s, e);
    case ConnectorType.FLOWCHART:
      // ✅ 传递 orientation 和 stub
      return connectorFlowchart(s, e, orientation, stub);
    default:
      const _exhaustiveCheck: never = mode;
      return _exhaustiveCheck;
  }
}

/**
 * 带额外选项的路径生成
 */
export function generatePathWithOptions(
  mode: ConnectorType,
  start: Point,
  end: Point,
  options?: { stub?: number; gap?: number },
  orientation?: { dx: number; dy: number }
): string {
  return generatePath(mode, start, end, options, orientation);
}
