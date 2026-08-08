// src/utils/anchor-helpers.ts

import type { Anchor } from '../types/SvgModel';
import { AnchorPosition } from '../types/SvgModel';

export function getAnchorOrientation(anchor: Anchor): { dx: number; dy: number } {
  if (!anchor.position) {
    return { dx: 0, dy: 1 }; // 默认向下
  }
  switch (anchor.position) {
    case AnchorPosition.TOP:
    case AnchorPosition.TOP_LEFT:
    case AnchorPosition.TOP_RIGHT:
      return { dx: 0, dy: -1 };
    case AnchorPosition.BOTTOM:
    case AnchorPosition.BOTTOM_LEFT:
    case AnchorPosition.BOTTOM_RIGHT:
      return { dx: 0, dy: 1 };
    case AnchorPosition.LEFT:
      return { dx: -1, dy: 0 };
    case AnchorPosition.RIGHT:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 1 };
  }
}
