// src/calc/connector/path.ts

import type { Point } from '../../types/geometry';
import type { ConnectorType } from '../../types/SvgModel';
import { generatePath } from './generator';

export interface ConnectionPathResult {
  start: Point;
  end: Point;
  pathD: string;
}

/**
 * 计算连线路径（纯函数）
 * @param start 原始起点（节点边缘）
 * @param end 原始终点（节点边缘）
 * @param connectorType 连线类型
 * @param options 可选参数：{ stub?: number, gap?: number }
 * @returns 包含起点、终点和路径字符串的对象
 */
export function computePath(
  start: Point,
  end: Point,
  connectorType: ConnectorType,
  options?: { stub?: number; gap?: number }
): ConnectionPathResult {
  const pathD = generatePath(connectorType, start, end, options);
  return { start, end, pathD };
}
