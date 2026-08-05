// src/calc/connector/flowchart.ts

import type { Point } from '../../types/geometry';
import { Defaults } from '../../styles/defaults';

/**
 * 生成正交折线路径，支持第一段强制沿法线方向
 * @param start 起点
 * @param end 终点
 * @param orientation 起点法线方向 {dx, dy}，若未提供则自动判断
 * @param stub 存根长度，默认 5
 * @returns SVG path 字符串
 */
export function connectorFlowchart(
  start: Point,
  end: Point,
  orientation?: { dx: number; dy: number },
  stub: number = Defaults.connection.stub
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // 即使距离小于 stub，也要保留 stub（alwaysRespectStubs）
  // 如果距离太小，直接画直线（stub 无法满足）
  if (absDx < 1 && absDy < 1) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  // 确定第一段方向（优先使用 orientation）
  let firstDir: 'h' | 'v';
  if (orientation) {
    firstDir = Math.abs(orientation.dx) > Math.abs(orientation.dy) ? 'h' : 'v';
  } else {
    firstDir = absDx > absDy ? 'h' : 'v';
  }

  // 计算中间点，保留 stub
  let points: Point[];
  if (firstDir === 'h') {
    const signX = Math.sign(dx) || 1;
    const midX = (start.x + end.x) / 2;
    // 确保 stub 方向正确
    const stubX = start.x + signX * stub;
    points = [
      { x: stubX, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x - signX * stub, y: end.y },
    ];
  } else {
    const signY = Math.sign(dy) || 1;
    const midY = (start.y + end.y) / 2;
    const stubY = start.y + signY * stub;
    points = [
      { x: start.x, y: stubY },
      { x: start.x, y: midY },
      { x: end.x, y: midY },
      { x: end.x, y: end.y - signY * stub },
    ];
  }

  // 构建路径
  let d = `M ${start.x} ${start.y}`;
  for (const p of points) {
    d += ` L ${p.x} ${p.y}`;
  }
  d += ` L ${end.x} ${end.y}`;
  return d;
}
