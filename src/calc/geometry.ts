// src/calc/geometry.ts

import type { Point, Rect } from '../types/geometry';

/**
 * 几何计算工具集
 * 提供点、线段、矩形相关的常用数学运算
 * 所有方法均为纯函数，无副作用
 */
export const Geometry = {
  /**
   * 计算两点之间的欧几里得距离
   * @param p1 第一个点
   * @param p2 第二个点
   * @returns 两点间的距离
   */
  distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * 向量减法：p1 - p2
   * @param p1 被减数点
   * @param p2 减数点
   * @returns 差值向量
   */
  subtract(p1: Point, p2: Point): Point {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
  },

  /**
   * 向量加法：p1 + p2
   * @param p1 第一个点/向量
   * @param p2 第二个点/向量
   * @returns 和向量
   */
  add(p1: Point, p2: Point): Point {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
  },

  /**
   * 向量数乘：p * scalar
   * @param p 原始点/向量
   * @param scalar 缩放标量
   * @returns 缩放后的向量
   */
  multiply(p: Point, scalar: number): Point {
    return { x: p.x * scalar, y: p.y * scalar };
  },

  /**
   * 向量归一化（单位向量）
   * @param p 待归一化的向量
   * @returns 单位向量；若输入为零向量，则返回零向量本身
   */
  normalize(p: Point): Point {
    const d = this.distance({ x: 0, y: 0 }, p);
    return d === 0 ? { x: 0, y: 0 } : { x: p.x / d, y: p.y / d };
  },

  /**
   * 计算两个向量的点积（内积）
   * @param p1 第一个向量
   * @param p2 第二个向量
   * @returns 点积值
   */
  dot(p1: Point, p2: Point): number {
    return p1.x * p2.x + p1.y * p2.y;
  },

  /**
   * 计算点在线段上的投影点（最近点）
   * @param point 待投影的点
   * @param s1 线段的起点
   * @param s2 线段的终点
   * @returns 投影点坐标（如果投影点在线段延长线上，则返回最近的端点）
   */
  projectPointOnSegment(point: Point, s1: Point, s2: Point): Point {
    const v = this.subtract(s2, s1); // 线段方向向量
    const w = this.subtract(point, s1); // 点到起点的向量
    const c1 = this.dot(w, v);

    // 投影点在线段起点之前
    if (c1 <= 0) return { ...s1 };

    const c2 = this.dot(v, v);
    // 投影点在线段终点之后
    if (c2 <= c1) return { ...s2 };

    // 投影点在线段内部
    const b = c1 / c2;
    return this.add(s1, this.multiply(v, b));
  },

  /**
   * 获取矩形的四条边（每条边以两个端点表示）
   * 方向：顺时针，从顶部开始
   * @param rect 矩形区域
   * @returns 包含 top, right, bottom, left 四条边的对象
   */
  getRectEdges(rect: Rect): {
    top: [Point, Point];
    right: [Point, Point];
    bottom: [Point, Point];
    left: [Point, Point];
  } {
    const { x, y, width, height } = rect;
    return {
      top: [
        { x, y },
        { x: x + width, y },
      ],
      right: [
        { x: x + width, y },
        { x: x + width, y: y + height },
      ],
      bottom: [
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
      left: [
        { x, y: y + height },
        { x, y },
      ],
    };
  },

  /**
   * 计算矩形的周长
   * @param rect 矩形区域
   * @returns 周长值
   */
  getRectPerimeterLength(rect: Rect): number {
    return 2 * (rect.width + rect.height);
  },

  /**
   * 根据周长比例在矩形边框上获取对应的点坐标
   * 适用于 PerimeterAnchor 等需要沿节点边缘均匀分布锚点的场景
   *
   * @param rect 矩形区域
   * @param proportion 比例值，范围 [0, 1]
   *   - 0 对应矩形左上角（从顶部边开始）
   *   - 0.25 对应右上角
   *   - 0.5 对应右下角
   *   - 0.75 对应左下角
   *   - 1 回到左上角
   * @returns 矩形边框上的对应点
   */
  pointOnPerimeter(rect: Rect, proportion: number): Point {
    // 将比例限制在 [0, 1] 范围内
    const p = Math.max(0, Math.min(1, proportion));
    const len = this.getRectPerimeterLength(rect);
    let dist = p * len;

    const edges = this.getRectEdges(rect);
    const edgeList: Array<{ pts: [Point, Point]; length: number }> = [
      { pts: edges.top, length: rect.width },
      { pts: edges.right, length: rect.height },
      { pts: edges.bottom, length: rect.width },
      { pts: edges.left, length: rect.height },
    ];

    for (const e of edgeList) {
      if (dist <= e.length) {
        const s = e.pts[0];
        const ePt = e.pts[1];
        const t = e.length > 0 ? dist / e.length : 0;
        return {
          x: s.x + (ePt.x - s.x) * t,
          y: s.y + (ePt.y - s.y) * t,
        };
      }
      dist -= e.length;
    }

    // 如果由于浮点误差导致未返回，返回起点（左上角）作为兜底
    return { x: rect.x, y: rect.y };
  },

  /**
   * 计算从原点沿方向向量出发的射线与轴对齐矩形（AABB）的交点
   * @param rect 矩形区域
   * @param origin 射线起点（通常为节点中心）
   * @param direction 方向向量（指向鼠标或对端中心）
   * @returns 交点坐标；若无交点则返回 null
   */
  rayRectIntersect(rect: Rect, origin: Point, direction: Point): Point | null {
    const { x, y, width, height } = rect;
    const { x: ox, y: oy } = origin;
    const { x: dx, y: dy } = direction;

    // 如果方向向量几乎为零，返回原点
    const eps = 1e-10;
    if (Math.abs(dx) < eps && Math.abs(dy) < eps) {
      return { x: ox, y: oy };
    }

    let tMin = -Infinity;
    let tMax = Infinity;

    // X 轴方向
    if (Math.abs(dx) < eps) {
      // 射线垂直，如果原点不在矩形 X 范围内则无交点
      if (ox < x - eps || ox > x + width + eps) return null;
    } else {
      let t1 = (x - ox) / dx;
      let t2 = (x + width - ox) / dx;
      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
    }

    // Y 轴方向
    if (Math.abs(dy) < eps) {
      if (oy < y - eps || oy > y + height + eps) return null;
    } else {
      let t1 = (y - oy) / dy;
      let t2 = (y + height - oy) / dy;
      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
    }

    // 无交点，或交点位于射线反方向
    if (tMin > tMax || tMax < 0) return null;

    // 取最近的正交点
    const t = tMin > eps ? tMin : tMax;
    // 额外保护：如果 t 为负无穷或正无穷，返回原点
    if (!isFinite(t)) return { x: ox, y: oy };

    return {
      x: ox + t * dx,
      y: oy + t * dy,
    };
  },
};

/**
 * 计算从 from 到 to 的单位方向向量
 */
export function direction(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}
