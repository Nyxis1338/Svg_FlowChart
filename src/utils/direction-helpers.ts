// src/utils/direction-helpers.ts

import type { Anchor } from '../types/SvgModel';

/**
 * 检查拖拽端与目标锚点的方向是否兼容
 */
export function isDirectionCompatible(
  sourceAnchor: Anchor | null | undefined,
  hitAnchor: Anchor | null | undefined,
  dragDirection: 'output' | 'input',
  isReconnect: boolean
): boolean {
  if (!sourceAnchor || !hitAnchor) return false;
  if (isReconnect) {
    return dragDirection === hitAnchor.direction || hitAnchor.direction === 'both';
  }
  return dragDirection === 'output' && (hitAnchor.direction === 'input' || hitAnchor.direction === 'both');
}
