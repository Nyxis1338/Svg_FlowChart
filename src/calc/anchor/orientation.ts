// src/calc/anchor/orientation.ts

import type { Point } from '../../types/geometry';
import type { Node, Anchor } from '../../types/SvgModel';
import { calcAnchorPosForNode } from './position';
import { Geometry } from '../geometry';

/**
 * 计算锚点法线方向
 * @param node 节点对象
 * @param anchor 锚点对象
 * @returns 法线方向 { dx, dy }，归一化后
 */
export function getAnchorOrientation(node: Node, anchor: Anchor): { dx: number; dy: number } {
  const shape = node.shape;
  const position = anchor.position;

  if (!position) {
    throw new Error('锚点缺少 position 属性');
  }
  if (!shape) {
    throw new Error('节点缺少 shape 属性');
  }

  switch (shape) {
    case 'rectangle':
      return getRectOrientation(position);
    case 'circle':
    case 'ellipse':
    case 'diamond':
      const topLevel = ['top', 'right', 'bottom', 'left'];
      if (topLevel.includes(position)) {
        return getCardinalOrientation(position);
      }
      // 角点：动态计算（从中心指向锚点）
      const anchorPos = calcAnchorPosForNode(node, anchor);
      const center = {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2,
      };
      return Geometry.direction(center, anchorPos);

    default:
      throw new Error('节点 shape 属性不正确');
  }
}

/**
 * 矩形法线（硬编码）
 */
function getRectOrientation(position: string): { dx: number; dy: number } {
  switch (position) {
    case 'top':
    case 'top-left':
    case 'top-right':
      return { dx: 0, dy: -1 };
    case 'bottom':
    case 'bottom-left':
    case 'bottom-right':
      return { dx: 0, dy: 1 };
    case 'left':
      return { dx: -1, dy: 0 };
    case 'right':
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 1 };
  }
}

/**
 * 四个基本方向的法线
 */
function getCardinalOrientation(position: string): { dx: number; dy: number } {
  switch (position) {
    case 'top':
      return { dx: 0, dy: -1 };
    case 'right':
      return { dx: 1, dy: 0 };
    case 'bottom':
      return { dx: 0, dy: 1 };
    case 'left':
      return { dx: -1, dy: 0 };
    default:
      return { dx: 0, dy: 1 };
  }
}

/**
 * 计算从中心到锚点的方向向量（归一化）
 */
// function normalizeDirection(from: Point, to: Point): { dx: number; dy: number } {
//   const dx = to.x - from.x;
//   const dy = to.y - from.y;
//   const len = Math.hypot(dx, dy);
//   if (len === 0) return { dx: 0, dy: 1 };
//   return { dx: dx / len, dy: dy / len };
// }
