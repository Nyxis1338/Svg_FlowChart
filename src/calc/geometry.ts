// src/calc/geometry.ts

import type { Point, Rect } from '../types/geometry';

export const Geometry = {
  // ---- 方向与归一化 ----
  /**
   * 计算从 from 到 to 的单位方向向量
   * @returns { dx, dy }，若两点重合则返回零向量
   */
  direction(from: Point, to: Point): { dx: number; dy: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-10) return { dx: 0, dy: 0 };
    return { dx: dx / len, dy: dy / len };
  },

  /**
   * 归一化一个已有的方向向量 { dx, dy }
   * @returns 单位方向向量，若长度为零则返回零向量
   */
  normalizeDirection(v: { dx: number; dy: number }): { dx: number; dy: number } {
    const len = Math.hypot(v.dx, v.dy);
    if (len < 1e-10) return { dx: 0, dy: 0 };
    return { dx: v.dx / len, dy: v.dy / len };
  },
};
