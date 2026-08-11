// src/calc/anchor/position.ts

import type { Point, Rect } from '../../types/geometry';
import type { Node, Anchor } from '../../types/SvgModel';
import type { NodeShape, AnchorPosition } from '../../types/SvgModel';

/**
 * 根据节点和锚点计算锚点在画布上的坐标
 * @param node 节点对象（包含位置、尺寸、形状）
 * @param anchor 锚点对象（包含位置、偏移）
 * @returns 锚点坐标 (x, y)
 */
export function calcAnchorPosForNode(node: Node, anchor: Anchor): Point {
  const rect: Rect = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };

  const shape = node.shape;
  const position = anchor.position;

  if (!shape) {
    throw new Error('节点缺少 shape 属性，请确保节点包含正确的形状（rectangle/circle/diamond/ellipse）');
  }
  if (!position) {
    throw new Error('锚点缺少 position 属性，请确保锚点包含正确的位置（top/right/bottom/left等）');
  }

  let pt: Point;
  switch (shape) {
    case 'circle':
      pt = getCircleAnchor(rect, position);
      break;
    case 'ellipse':
      pt = getEllipseAnchor(rect, position);
      break;
    case 'diamond':
      pt = getDiamondAnchor(rect, position);
      break;
    default:
      pt = getRectAnchor(rect, position);
  }

  return pt;
}

// ============ 矩形锚点 ============

function getRectAnchor(rect: Rect, position: AnchorPosition): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  switch (position) {
    case 'top-left':
      return { x: rect.x, y: rect.y };
    case 'top':
      return { x: cx, y: rect.y };
    case 'top-right':
      return { x: rect.x + rect.width, y: rect.y };
    case 'right':
      return { x: rect.x + rect.width, y: cy };
    case 'bottom-right':
      return { x: rect.x + rect.width, y: rect.y + rect.height };
    case 'bottom':
      return { x: cx, y: rect.y + rect.height };
    case 'bottom-left':
      return { x: rect.x, y: rect.y + rect.height };
    case 'left':
      return { x: rect.x, y: cy };
    default:
      return { x: cx, y: cy };
  }
}

// ============ 圆形锚点 ============

function getCircleAnchor(rect: Rect, position: AnchorPosition): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const r = Math.min(rect.width, rect.height) / 2;
  const angle = getAngleForPosition(position);
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

// ============ 椭圆锚点 ============

function getEllipseAnchor(rect: Rect, position: AnchorPosition): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const angle = getAngleForPosition(position);
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
}

// ============ 菱形锚点 ============

function getDiamondAnchor(rect: Rect, position: AnchorPosition): Point {
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
    case 'top-left':
      return mid(left, top);
    case 'top':
      return top;
    case 'top-right':
      return mid(top, right);
    case 'right':
      return right;
    case 'bottom-right':
      return mid(right, bottom);
    case 'bottom':
      return bottom;
    case 'bottom-left':
      return mid(bottom, left);
    case 'left':
      return left;
    default:
      return { x: cx, y: cy };
  }
}

// ============ 工具函数 ============

/**
 * 将锚点位置枚举转换为弧度角度（用于圆形和椭圆）
 */
function getAngleForPosition(position: AnchorPosition): number {
  switch (position) {
    case 'top-left':
      return -Math.PI * 0.75;
    case 'top':
      return -Math.PI / 2;
    case 'top-right':
      return -Math.PI * 0.25;
    case 'right':
      return 0;
    case 'bottom-right':
      return Math.PI * 0.25;
    case 'bottom':
      return Math.PI / 2;
    case 'bottom-left':
      return Math.PI * 0.75;
    case 'left':
      return Math.PI;
    default:
      return 0;
  }
}
