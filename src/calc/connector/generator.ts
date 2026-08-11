// src/calc/connector/generator.ts

import type { Point } from '../../types/geometry';
import type { Node, Anchor, Connection } from '../../types/SvgModel';
import { ConnectorType } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';
import { calcAnchorPosForNode } from '../anchor/position';
import { getAnchorOrientation } from '../anchor/orientation';
import { connectorStraight } from './straight';
import { connectorBezier } from './bezier';
import { connectorFlowchart } from './flowchart';
import { direction } from '../geometry';

/**
 * 生成完整的连线路径
 * 路径结构：rawStart → stubStart → start → (连接器) → end → stubEnd → rawEnd
 */
export function generateConnectionPath(
  conn: Connection,
  getNode: (id: string) => Node | undefined,
  getAnchor: (id: string) => Anchor | undefined
): {
  pathD: string;
  startDirection: Point;
  endDirection: Point;
  rawStart: Point;
  rawEnd: Point;
  start: Point;
  end: Point;
} | null {
  if (!conn.sourceAnchorId || !conn.targetAnchorId) return null;

  const sourceAnchor = getAnchor(conn.sourceAnchorId);
  const targetAnchor = getAnchor(conn.targetAnchorId);
  if (!sourceAnchor || !targetAnchor) return null;

  const sourceNode = getNode(sourceAnchor.nodeId);
  const targetNode = getNode(targetAnchor.nodeId);
  if (!sourceNode || !targetNode) return null;

  const gap = conn.gap ?? Defaults.connection.gap;
  const stub = conn.stub ?? Defaults.connection.stub;

  // 1. 原始锚点坐标
  const rawStart = calcAnchorPosForNode(sourceNode, sourceAnchor);
  const rawEnd = calcAnchorPosForNode(targetNode, targetAnchor);

  // 2. 法线方向
  const sourceOrient = getAnchorOrientation(sourceNode, sourceAnchor);
  const targetOrient = getAnchorOrientation(targetNode, targetAnchor);

  // 3. 计算关键点
  const stubStart: Point = {
    x: rawStart.x + sourceOrient.dx * gap,
    y: rawStart.y + sourceOrient.dy * gap,
  };
  const start: Point = {
    x: rawStart.x + sourceOrient.dx * (gap + stub),
    y: rawStart.y + sourceOrient.dy * (gap + stub),
  };
  const end: Point = {
    x: rawEnd.x + targetOrient.dx * (gap + stub),
    y: rawEnd.y + targetOrient.dy * (gap + stub),
  };
  const stubEnd: Point = {
    x: rawEnd.x + targetOrient.dx * gap,
    y: rawEnd.y + targetOrient.dy * gap,
  };

  // 4. 方向向量（用于箭头）
  const startDirection = direction(start, rawStart);
  const endDirection = direction(end, rawEnd);

  // 5. 生成连接器路径（start → end）
  const connectorType = conn.connectorType ?? Defaults.connection.connectorType;
  const typeStr = typeof connectorType === 'string' ? connectorType : connectorType;

  let connectorPath: string;
  if (typeStr === 'straight') {
    connectorPath = connectorStraight(start, end);
  } else if (typeStr === 'bezier') {
    connectorPath = connectorBezier(start, end);
  } else {
    connectorPath = connectorFlowchart(start, end, sourceOrient, targetOrient);
  }

  // 6. 将 connectorPath 的第一个 "M" 替换为 "L"
  // 因为完整路径的第一个 M 由 rawStart 提供
  const connectorBody = connectorPath.replace(/^M/, 'L');

  // 7. 完整路径
  const pathD =
    `M ${rawStart.x} ${rawStart.y}` +
    ` L ${stubStart.x} ${stubStart.y}` +
    ` L ${start.x} ${start.y}` +
    ` ${connectorBody}` +
    ` L ${end.x} ${end.y}` +
    ` L ${stubEnd.x} ${stubEnd.y}` +
    ` L ${rawEnd.x} ${rawEnd.y}`;

  return {
    pathD,
    startDirection,
    endDirection,
    rawStart,
    rawEnd,
    start,
    end,
  };
}
