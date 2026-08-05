// src/calc/anchor/position.ts

import type { Point, Rect } from '../../types/geometry';
import type { Node, Anchor } from '../../types/SvgModel';
import { NodeShape, AnchorType, AnchorPosition } from '../../types/SvgModel';
import { getStaticAnchor } from './static';
import { getPerimeterAnchor } from './perimeter';

/**
 * 根据节点和锚点计算锚点位置（主函数）
 */
export function calcAnchorPosForNode(node: Node, anchor: Anchor): Point {
  const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
  if (anchor.type === AnchorType.STATIC && anchor.position) {
    return getStaticAnchorPositionWithShape(rect, node.shape, anchor.position, anchor.offset);
  }
  if (anchor.type === AnchorType.CONTINUOUS) {
    if (anchor.perimeterTotal !== undefined && anchor.perimeterIndex !== undefined) {
      let pt = getPerimeterAnchor(rect, anchor.perimeterTotal, anchor.perimeterIndex);
      if (anchor.offset) {
        pt = { x: pt.x + anchor.offset.x, y: pt.y + anchor.offset.y };
      }
      return pt;
    }
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * 通用锚点位置计算（接受 Rect）
 */
export function calcAnchorPos(rect: Rect, anchor: Anchor): Point {
  if (anchor.type === AnchorType.STATIC && anchor.position) {
    return getStaticAnchor(rect, anchor.position, anchor.offset);
  }
  if (anchor.type === AnchorType.CONTINUOUS) {
    if (anchor.perimeterTotal !== undefined && anchor.perimeterIndex !== undefined) {
      let pt = getPerimeterAnchor(rect, anchor.perimeterTotal, anchor.perimeterIndex);
      if (anchor.offset) {
        pt = { x: pt.x + anchor.offset.x, y: pt.y + anchor.offset.y };
      }
      return pt;
    }
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// ============ 内部辅助 ============

function getStaticAnchorPositionWithShape(
  rect: Rect,
  shape: NodeShape | undefined,
  position: AnchorPosition,
  offset?: Point
): Point {
  let pt: Point;
  if (shape === NodeShape.CIRCLE) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const r = Math.min(rect.width, rect.height) / 2;
    const angle = getAngleForPosition(position);
    pt = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  } else if (shape === NodeShape.ELLIPSE) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    const angle = getAngleForPosition(position);
    pt = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  } else if (shape === NodeShape.DIAMOND) {
    pt = getDiamondAnchorPosition(rect, position);
  } else {
    // 矩形或其他（默认矩形边缘）
    pt = getStaticAnchor(rect, position);
  }
  if (offset) {
    pt = { x: pt.x + offset.x, y: pt.y + offset.y };
  }
  return pt;
}

function getDiamondAnchorPosition(rect: Rect, position: AnchorPosition): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const hw = rect.width / 2;
  const hh = rect.height / 2;

  const top = { x: cx, y: cy - hh };
  const right = { x: cx + hw, y: cy };
  const bottom = { x: cx, y: cy + hh };
  const left = { x: cx - hw, y: cy };

  const mid = (p1: Point, p2: Point): Point => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });

  switch (position) {
    case AnchorPosition.TOP_LEFT:
      return mid(left, top);
    case AnchorPosition.TOP:
      return top;
    case AnchorPosition.TOP_RIGHT:
      return mid(top, right);
    case AnchorPosition.RIGHT:
      return right;
    case AnchorPosition.BOTTOM_RIGHT:
      return mid(right, bottom);
    case AnchorPosition.BOTTOM:
      return bottom;
    case AnchorPosition.BOTTOM_LEFT:
      return mid(bottom, left);
    case AnchorPosition.LEFT:
      return left;
    default:
      return { x: cx, y: cy };
  }
}

function getAngleForPosition(position: AnchorPosition): number {
  switch (position) {
    case AnchorPosition.TOP_LEFT:
      return -Math.PI * 0.75;
    case AnchorPosition.TOP:
      return -Math.PI / 2;
    case AnchorPosition.TOP_RIGHT:
      return -Math.PI * 0.25;
    case AnchorPosition.RIGHT:
      return 0;
    case AnchorPosition.BOTTOM_RIGHT:
      return Math.PI * 0.25;
    case AnchorPosition.BOTTOM:
      return Math.PI / 2;
    case AnchorPosition.BOTTOM_LEFT:
      return Math.PI * 0.75;
    case AnchorPosition.LEFT:
      return Math.PI;
    default:
      return 0;
  }
}
