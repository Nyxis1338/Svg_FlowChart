// src/calc/correctline.ts

import type { Point, Rect } from '../types/geometry';
import type { Node } from '../types/SvgModel';

/**
 * 检测线段是否与矩形相交（包括边）
 */
function lineIntersectsRect(p1: Point, p2: Point, rect: Rect): boolean {
  // 快速排斥检测
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  if (maxX < rect.x || minX > rect.x + rect.width || maxY < rect.y || minY > rect.y + rect.height) {
    return false;
  }
  // 采样检测线段上的点是否在矩形内
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = p1.x + (p2.x - p1.x) * t;
    const py = p1.y + (p2.y - p1.y) * t;
    if (px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height) {
      return true;
    }
  }
  return false;
}

/**
 * 检测路径是否穿入任何节点（排除源节点和目标节点）
 */
export function pathIntersectsNodes(
  pathPoints: Point[],
  nodes: Node[],
  sourceId: string,
  targetId: string
): { intersects: boolean; node: Node | null } {
  for (const node of nodes) {
    if (node.id === sourceId || node.id === targetId) continue;
    const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
    for (let i = 0; i < pathPoints.length - 1; i++) {
      if (lineIntersectsRect(pathPoints[i], pathPoints[i + 1], rect)) {
        return { intersects: true, node };
      }
    }
  }
  return { intersects: false, node: null };
}

/**
 * 计算绕行路径（绕过指定节点）
 * 策略：找到路径与节点的交点，从节点上方或下方绕行
 */
export function detourPath(pathPoints: Point[], node: Node, direction: 'up' | 'down'): Point[] {
  if (pathPoints.length < 2) return pathPoints;

  const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
  // 找到路径上第一个和最后一个进入节点的点
  let enterIdx = -1,
    exitIdx = -1;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];
    // 检测线段是否与矩形相交
    if (lineIntersectsRect(p1, p2, rect)) {
      if (enterIdx === -1) enterIdx = i;
      exitIdx = i + 1;
    }
  }
  if (enterIdx === -1 || exitIdx === -1) return pathPoints;

  // 计算绕行点：在节点上方或下方偏移
  const offsetY = direction === 'up' ? -node.height : node.height;
  const detourY = node.y + offsetY;
  // 在进入点和退出点之间插入绕行点
  const newPath = [...pathPoints];
  const enterPoint = pathPoints[enterIdx];
  const exitPoint = pathPoints[exitIdx];
  // 绕行点：在节点中心上方/下方，水平位置在进入和退出之间
  const midX = (enterPoint.x + exitPoint.x) / 2;
  const detourPoint = { x: midX, y: detourY };
  // 插入两个点：一个在进入点之后，一个在退出点之前
  newPath.splice(enterIdx + 1, 0, { x: enterPoint.x, y: detourY });
  newPath.splice(enterIdx + 2, 0, { x: exitPoint.x, y: detourY });
  return newPath;
}
