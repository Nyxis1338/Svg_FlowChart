// src/utils/anchor-helpers.ts

import type { Anchor, Node } from '../types/SvgModel';
import { Geometry } from '../calc/geometry';
import { calcAnchorPosForNode } from '../calc/anchor/position';

export function getAnchorOrientation(anchor: Anchor, node: Node): { dx: number; dy: number } {
  const pos = calcAnchorPosForNode(node, anchor);
  const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  const vector = Geometry.subtract(pos, center);
  const normalized = Geometry.normalize(vector);
  return { dx: normalized.x, dy: normalized.y };
}
