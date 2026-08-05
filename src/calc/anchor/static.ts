// src/calc/anchor/static.ts

import type { Point, Rect } from '../../types/geometry';
import { AnchorPosition } from '../../types/SvgModel';

/**
 * 计算静态锚点（固定位置，共8个）
 * @param rect 节点矩形
 * @param position 锚点位置（8个之一）
 * @param offset 额外偏移量（可选）
 * @returns 锚点画布坐标
 */
export function getStaticAnchor(rect: Rect, position: AnchorPosition, offset?: Point): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  let pt: Point;
  switch (position) {
    case AnchorPosition.TOP_LEFT:
      pt = { x: rect.x, y: rect.y };
      break;
    case AnchorPosition.TOP:
      pt = { x: cx, y: rect.y };
      break;
    case AnchorPosition.TOP_RIGHT:
      pt = { x: rect.x + rect.width, y: rect.y };
      break;
    case AnchorPosition.RIGHT:
      pt = { x: rect.x + rect.width, y: cy };
      break;
    case AnchorPosition.BOTTOM_RIGHT:
      pt = { x: rect.x + rect.width, y: rect.y + rect.height };
      break;
    case AnchorPosition.BOTTOM:
      pt = { x: cx, y: rect.y + rect.height };
      break;
    case AnchorPosition.BOTTOM_LEFT:
      pt = { x: rect.x, y: rect.y + rect.height };
      break;
    case AnchorPosition.LEFT:
      pt = { x: rect.x, y: cy };
      break;
    default:
      pt = { x: cx, y: cy };
  }
  if (offset) {
    pt = { x: pt.x + offset.x, y: pt.y + offset.y };
  }
  return pt;
}
