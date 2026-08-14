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
import { Geometry } from '../geometry';

/**
 * 生成完整的连线路径
 * 路径结构：   rawStart → stubStart → start → (连接器) → end → stubEnd → rawEnd
 * 点间距离(*归一化)：   gap         stub                    stub       gap
 */
export function generateConnectionPath(
  conn: Connection,
  getNode: (id: string) => Node | undefined,
  getAnchor: (id: string) => Anchor | undefined
): {
  pathD: string;
  startDirection: { dx: number; dy: number };
  endDirection: { dx: number; dy: number };
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
  // 5. 生成连接器路径（start → end）
  // 放在一起 是因为方向向量 会根据不同的connectorType 得到不同的值
  const connectorType = conn.connectorType ?? Defaults.connection.connectorType;
  const typeStr = typeof connectorType === 'string' ? connectorType : connectorType;

  let connectorResult: { path: string; startDirection: any; endDirection: any };

  if (typeStr === 'flowchart') {
    connectorResult = connectorFlowchart(start, end);
  } else if (typeStr === 'bezier') {
    connectorResult = connectorBezier(start, end);
  } else {
    connectorResult = connectorStraight(start, end);
  }
  const connectorPath = connectorResult.path;
  const startDirection = connectorResult.startDirection;
  const endDirection = connectorResult.endDirection;

  // 6. 将 connectorPath 的第一个 "M" 替换为 "L"
  // 因为完整路径的第一个 M 由 rawStart 提供
  const connectorBody = connectorPath.replace(/^M/, 'L');

  // 7. 完整路径
  const pathD = ` M ${stubStart.x} ${stubStart.y}` + ` ${connectorBody}` + ` L ${stubEnd.x} ${stubEnd.y}`;

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
