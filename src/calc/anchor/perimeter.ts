// 复刻 jsPlumb PerimeterAnchor 逻辑：
// 支持在矩形边框均匀生成 N 个锚点，0~1 索引循环获取

import type { Point, Rect } from "../../types/geometry";
import { Geometry } from "../geometry";

/**
 * 沿矩形周长均匀分布锚点
 * @param rect 节点包围盒
 * @param count 锚点总数
 * @param index 当前锚点索引 0 ~ count-1
 */
export function computePerimeterAnchor(rect: Rect, count: number, index: number): Point {
  if (count <= 0) return { x: rect.x + rect.width / 2, y: rect.y };
  const safeIndex = ((index % count) + count) % count;
  const proportion = safeIndex / count;
  return Geometry.pointOnPerimeter(rect, proportion);
}

/**
 * 一次性获取全部周边锚点数组
 */
export function getAllPerimeterAnchors(rect: Rect, count: number): Point[] {
  const list: Point[] = [];
  for (let i = 0; i < count; i++) {
    list.push(computePerimeterAnchor(rect, count, i));
  }
  return list;
}