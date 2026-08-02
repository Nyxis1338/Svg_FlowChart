// 复刻 jsPlumb PerimeterAnchor 逻辑：
// 支持在矩形边框均匀生成 N 个锚点，0~1 索引循环获取

import type { Point, Rect } from "../../types/geometry";
import { Geometry } from "../geometry";

/**
 * 沿矩形周长均匀分布锚点
 * @param rect 节点包围盒
 * @param count 锚点总数（必须 > 0）
 * @param index 当前锚点索引 0 ~ count-1
 * @returns 锚点在画布上的坐标
 */
export function computePerimeterAnchor(rect: Rect, count: number, index: number): Point {
  // 参数校验
  if (count <= 0) {
    console.warn("PerimeterAnchor: count must be > 0, using default center");
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  // 安全取模，支持负索引
  const safeIndex = ((index % count) + count) % count;
  const proportion = safeIndex / count;

  // 按周长比例计算点位置
  return Geometry.pointOnPerimeter(rect, proportion);
}

/**
 * 一次性获取全部周边锚点数组
 */
export function getAllPerimeterAnchors(rect: Rect, count: number): Point[] {
  if (count <= 0) return [];
  const list: Point[] = [];
  for (let i = 0; i < count; i++) {
    list.push(computePerimeterAnchor(rect, count, i));
  }
  return list;
}