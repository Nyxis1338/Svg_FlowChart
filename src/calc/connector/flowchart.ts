// src/calc/connector/flowchart.ts

import type { Point } from '../../types/geometry';
import { Defaults } from '../../styles/defaults';

/**
 * 生成正交折线路径，强制 stub 段沿锚点法线方向向外延伸
 * 路径结构：起点 → stubStart → 正交折线 → stubEnd → 终点
 */
export function connectorFlowchart(
  start: Point,
  end: Point,
  sourceOrientation: { dx: number; dy: number },
  targetOrientation: { dx: number; dy: number },
  stub: number = Defaults.connection.stub,
  alwaysRespectStubs: boolean = true
): string {
  if (Math.abs(start.x - end.x) < 0.001 && Math.abs(start.y - end.y) < 0.001) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  let actualStub = stub;
  if (!alwaysRespectStubs) {
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < stub * 2) {
      actualStub = Math.max(dist / 3, 1);
    }
  }

  // 起点 stub 端点（沿法线方向向外）
  const sSignX = Math.sign(sourceOrientation.dx) || 0;
  const sSignY = Math.sign(sourceOrientation.dy) || 0;
  const stubStart: Point = {
    x: start.x + sSignX * actualStub,
    y: start.y + sSignY * actualStub,
  };

  // 终点 stub 端点（沿法线方向向外）
  const tSignX = Math.sign(targetOrientation.dx) || 0;
  const tSignY = Math.sign(targetOrientation.dy) || 0;
  const stubEnd: Point = {
    x: end.x + tSignX * actualStub,
    y: end.y + tSignY * actualStub,
  };

  // 构建从 stubStart 到 stubEnd 的正交折线
  // 选择水平距离和垂直距离中较大的作为第一段方向
  const dx = stubEnd.x - stubStart.x;
  const dy = stubEnd.y - stubStart.y;

  let middlePoints: Point[] = [];
  if (Math.abs(dx) > Math.abs(dy)) {
    // 先水平后垂直
    middlePoints = [{ x: stubEnd.x, y: stubStart.y }];
  } else {
    // 先垂直后水平
    middlePoints = [{ x: stubStart.x, y: stubEnd.y }];
  }

  // 构建完整路径
  let d = `M ${start.x} ${start.y}`;
  d += ` L ${stubStart.x} ${stubStart.y}`;
  for (const p of middlePoints) {
    d += ` L ${p.x} ${p.y}`;
  }
  d += ` L ${stubEnd.x} ${stubEnd.y}`;
  d += ` L ${end.x} ${end.y}`;

  return d;
}
