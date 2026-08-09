// src/calc/connection-builder.ts

import type { Point } from '../types/geometry';
import type { Connection, Anchor, Node } from '../types/SvgModel';
import { AnchorType, ConnectorType } from '../types/SvgModel';
import { Defaults } from '../styles/defaults';
import { calcAnchorPosForNode } from './anchor/position';
import { computePath } from './connector/path';
import { getContinuousAnchorPair } from './anchor/continuous';
import { getAnchorOrientation } from '../utils/anchor-helpers';
import { pathIntersectsNodes, detourPath } from './correctline';

function applyGapAndStub(anchorPos: Point, node: Node, anchor: Anchor, gap: number, stub: number): Point {
  const orientation = getAnchorOrientation(anchor, node);
  const totalOffset = gap + stub;
  return {
    x: anchorPos.x + orientation.dx * totalOffset,
    y: anchorPos.y + orientation.dy * totalOffset,
  };
}

/**
 * 解析 SVG path 字符串为点数组
 */
function parsePathD(pathD: string): Point[] {
  const points: Point[] = [];
  const parts = pathD.match(/[ML]\s*([\d.]+)\s*([\d.]+)/g);
  if (parts) {
    for (const part of parts) {
      const [, x, y] = part.match(/([\d.]+)\s*([\d.]+)/) || [];
      if (x && y) points.push({ x: parseFloat(x), y: parseFloat(y) });
    }
  }
  return points;
}

function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

export function computeConnectionPath(
  conn: Connection,
  getAnchor: (id: string) => Anchor | undefined,
  getNode: (id: string) => Node | undefined,
  allNodes?: Node[]
): { start: Point; end: Point; pathD: string } | null {
  if (conn.sourceAnchorId && conn.targetAnchorId) {
    const sourceAnchor = getAnchor(conn.sourceAnchorId);
    const targetAnchor = getAnchor(conn.targetAnchorId);
    if (!sourceAnchor || !targetAnchor) return null;
    const sourceNode = getNode(sourceAnchor.nodeId);
    const targetNode = getNode(targetAnchor.nodeId);
    if (!sourceNode || !targetNode) return null;

    const gap = conn.gap ?? Defaults.connection.gap;
    const stub = conn.stub ?? Defaults.connection.stub;

    // 原始锚点坐标
    const rawStart = calcAnchorPosForNode(sourceNode, sourceAnchor);
    const rawEnd = calcAnchorPosForNode(targetNode, targetAnchor);

    // 应用 gap+stub（法线方向）
    const start = applyGapAndStub(rawStart, sourceNode, sourceAnchor, gap, stub);
    const end = applyGapAndStub(rawEnd, targetNode, targetAnchor, gap, stub);

    // 生成路径
    let result = computePath(start, end, conn.connectorType);

    // 如果提供了所有节点，进行绕行检测
    if (allNodes && allNodes.length > 0) {
      const pathPoints = parsePathD(result.pathD);
      const detection = pathIntersectsNodes(pathPoints, allNodes, sourceNode.id, targetNode.id);
      if (detection.intersects && detection.node) {
        // 尝试向上绕行
        let detouredPoints = detourPath(pathPoints, detection.node, 'up');
        let recheck = pathIntersectsNodes(detouredPoints, allNodes, sourceNode.id, targetNode.id);
        if (recheck.intersects) {
          // 向上不行，尝试向下
          detouredPoints = detourPath(pathPoints, detection.node, 'down');
        }
        result.pathD = pointsToPathD(detouredPoints);
      }
    }

    return { start, end, pathD: result.pathD };
  }

  // 模式2：节点直连（略）
  return null;
}
