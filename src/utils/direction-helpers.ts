// src/utils/direction-helpers.ts

import type { Anchor } from '../types/SvgModel';
import { AnchorType } from '../types/SvgModel';

/**
 * 检查拖拽端与目标锚点的方向是否兼容
 * @param sourceAnchor 拖拽源锚点
 * @param hitAnchor 命中的目标锚点
 * @param dragDirection 拖拽方向（'output' | 'input'）
 * @param isReconnect 是否为重连操作
 * @returns 是否兼容
 */
export function isDirectionCompatible(
  sourceAnchor: Anchor | undefined | null,
  hitAnchor: Anchor | undefined | null,
  dragDirection: 'output' | 'input',
  isReconnect: boolean
): boolean {
  if (!sourceAnchor || !hitAnchor) return false;

  if (sourceAnchor.type === AnchorType.CONTINUOUS) {
    return true;
  }

  if (isReconnect) {
    return dragDirection === hitAnchor.direction || hitAnchor.direction === 'both';
  } else {
    return dragDirection === 'output' && (hitAnchor.direction === 'input' || hitAnchor.direction === 'both');
  }
}
