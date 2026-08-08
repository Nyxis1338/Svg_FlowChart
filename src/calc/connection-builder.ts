// src/calc/connection-path.ts

import type { Point } from '../types/geometry';
import type { Connection, Anchor, Node } from '../types/SvgModel';
import { AnchorType, ConnectorType } from '../types/SvgModel';
import { Defaults } from '../styles/defaults';
import { calcAnchorPosForNode } from './anchor/position';
import { computePath } from './connector/path';
import { getContinuousAnchorPair } from './anchor/continuous';

/**
 * 计算连线路径（纯函数）
 * @param conn 连线对象
 * @param getAnchor 获取锚点的函数
 * @param getNode 获取节点的函数
 * @returns 路径信息，包含起点、终点和路径字符串；若无效则返回 null
 */
export function computeConnectionPath(
  conn: Connection,
  getAnchor: (id: string) => Anchor | undefined,
  getNode: (id: string) => Node | undefined
): { start: Point; end: Point; pathD: string } | null {
  // 模式1：锚点相连
  if (conn.sourceAnchorId && conn.targetAnchorId) {
    const sourceAnchor = getAnchor(conn.sourceAnchorId);
    const targetAnchor = getAnchor(conn.targetAnchorId);
    if (!sourceAnchor || !targetAnchor) return null;
    const sourceNode = getNode(sourceAnchor.nodeId);
    const targetNode = getNode(targetAnchor.nodeId);
    if (!sourceNode || !targetNode) return null;

    // 连续锚点外部点计算（用于动态锚点位置）
    const sourceExternal =
      sourceAnchor.type === AnchorType.CONTINUOUS
        ? { x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 }
        : undefined;
    const targetExternal =
      targetAnchor.type === AnchorType.CONTINUOUS
        ? { x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y + sourceNode.height / 2 }
        : undefined;

    const start = calcAnchorPosForNode(sourceNode, sourceAnchor, sourceExternal);
    const end = calcAnchorPosForNode(targetNode, targetAnchor, targetExternal);

    // 获取方向（用于 flowchart 的 stub）
    // 注意：我们仍然需要从 Anchor 获取 orientation，但这里不再引入 Store 依赖
    // 我们可以在 calc 层提供一个工具函数，或者直接在 Store 中计算并传入
    // 但为了保持纯函数，我们这里简化：仅传递 stub/gap，不传递方向（由 connectorFlowchart 内部自适应）
    // 如果你需要支持方向，可以在调用 computePath 时传入 sourceOrientation/targetOrientation
    const result = computePath(start, end, conn.connectorType, {
      stub: conn.stub ?? Defaults.connection.stub,
      gap: conn.gap ?? Defaults.connection.gap,
      alwaysRespectStubs: true,
    });

    return { start, end, pathD: result.pathD };
  }

  // 模式2：节点直连（连续锚点）
  if (conn.sourceNodeId && conn.targetNodeId) {
    const sourceNode = getNode(conn.sourceNodeId);
    const targetNode = getNode(conn.targetNodeId);
    if (!sourceNode || !targetNode) return null;
    const { source, target } = getContinuousAnchorPair(
      { x: sourceNode.x, y: sourceNode.y, width: sourceNode.width, height: sourceNode.height },
      { x: targetNode.x, y: targetNode.y, width: targetNode.width, height: targetNode.height }
    );
    const result = computePath(source, target, conn.connectorType, {
      stub: conn.stub ?? Defaults.connection.stub,
      gap: conn.gap ?? Defaults.connection.gap,
      alwaysRespectStubs: true,
    });
    return { start: source, end: target, pathD: result.pathD };
  }

  return null;
}
