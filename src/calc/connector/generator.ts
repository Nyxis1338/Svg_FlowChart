// src/calc/connector/generator.ts

import type { Point } from '../../types/geometry';
import { ConnectorType } from '../../types/SvgModel';
import { connectorStraight } from './straight';
import { connectorBezier } from './bezier';
import { connectorFlowchart } from './flowchart';

export function generatePath(mode: ConnectorType, start: Point, end: Point): string {
  switch (mode) {
    case ConnectorType.STRAIGHT:
      return connectorStraight(start, end);
    case ConnectorType.BEZIER:
      return connectorBezier(start, end);
    case ConnectorType.FLOWCHART:
      return connectorFlowchart(start, end);
    default:
      return connectorStraight(start, end);
  }
}
