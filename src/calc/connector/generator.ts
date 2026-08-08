// src/calc/connector/generator.ts

import type { Point } from '../../types/geometry';
import { ConnectorType } from '../../types/SvgModel';
import { connectorStraight } from './straight';
import { connectorBezier } from './bezier';
import { connectorFlowchart } from './flowchart';
import { Defaults } from '../../styles/defaults';

function applyGap(start: Point, end: Point, gap: number): { start: Point; end: Point } {
  if (gap === 0) return { start, end };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < gap * 2) {
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    return { start: mid, end: mid };
  }
  const ratio = gap / dist;
  return {
    start: { x: start.x + dx * ratio, y: start.y + dy * ratio },
    end: { x: end.x - dx * ratio, y: end.y - dy * ratio },
  };
}

export function generatePath(
  mode: ConnectorType,
  start: Point,
  end: Point,
  options?: {
    stub?: number;
    gap?: number;
    alwaysRespectStubs?: boolean;
    sourceOrientation?: { dx: number; dy: number };
    targetOrientation?: { dx: number; dy: number };
  }
): string {
  const stub = options?.stub ?? Defaults.connection.stub;
  const gap = options?.gap ?? Defaults.connection.gap;
  const alwaysRespectStubs = options?.alwaysRespectStubs ?? true;
  const sourceOrientation = options?.sourceOrientation ?? { dx: 0, dy: 1 };
  const targetOrientation = options?.targetOrientation ?? { dx: 0, dy: -1 };

  // 应用 gap（偏移端点）
  const { start: s, end: e } = applyGap(start, end, gap);

  switch (mode) {
    case ConnectorType.STRAIGHT:
      return connectorStraight(s, e);
    case ConnectorType.BEZIER:
      return connectorBezier(s, e);
    case ConnectorType.FLOWCHART:
      return connectorFlowchart(s, e, sourceOrientation, targetOrientation, stub, alwaysRespectStubs);
    default:
      return connectorStraight(s, e);
  }
}
