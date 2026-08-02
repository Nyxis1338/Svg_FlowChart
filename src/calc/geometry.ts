import type { Point, Rect } from "../types/geometry";

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
    const v = this.subtract(s2, s1);      // 线段方向向量
    const w = this.subtract(point, s1);   // 点到起点的向量
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
      top: [{ x, y }, { x: x + width, y }],
      right: [{ x: x + width, y }, { x: x + width, y: y + height }],
      bottom: [{ x: x + width, y: y + height }, { x, y: y + height }],
      left: [{ x, y: y + height }, { x, y }]
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
      { pts: edges.left, length: rect.height }
    ];

    for (const e of edgeList) {
      if (dist <= e.length) {
        const s = e.pts[0];
        const ePt = e.pts[1];
        const t = e.length > 0 ? dist / e.length : 0;
        return {
          x: s.x + (ePt.x - s.x) * t,
          y: s.y + (ePt.y - s.y) * t
        };
      }
      dist -= e.length;
    }

    // 如果由于浮点误差导致未返回，返回起点（左上角）作为兜底
    return { x: rect.x, y: rect.y };
  }
};