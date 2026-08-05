// src/calc/anchor/perimeter.ts

import type { Point, Rect } from '../../types/geometry';
import { Geometry } from '../geometry';

/**
 * 沿矩形周长均匀分布锚点（核心算法）
 */
function computePerimeterAnchor(rect: Rect, count: number, index: number): Point {
  if (count <= 0) {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  const safeIndex = ((index % count) + count) % count;
  const proportion = safeIndex / count;
  return Geometry.pointOnPerimeter(rect, proportion);
}

/**
 * 获取单个周长锚点
 */
export function getPerimeterAnchor(rect: Rect, total: number, idx: number): Point {
  return computePerimeterAnchor(rect, total, idx);
}

/**
 * 获取全部周长锚点列表
 */
export function getPerimeterAnchorList(rect: Rect, total: number): Point[] {
  if (total <= 0) return [];
  const list: Point[] = [];
  for (let i = 0; i < total; i++) {
    list.push(computePerimeterAnchor(rect, total, i));
  }
  return list;
}
