import type { Point, Rect } from "../types/geometry";

export const Geometry = {
  distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  subtract(p1: Point, p2: Point): Point {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
  },

  add(p1: Point, p2: Point): Point {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
  },

  multiply(p: Point, scalar: number): Point {
    return { x: p.x * scalar, y: p.y * scalar };
  },

  normalize(p: Point): Point {
    const d = this.distance({ x: 0, y: 0 }, p);
    return d === 0 ? { x: 0, y: 0 } : { x: p.x / d, y: p.y / d };
  },

  dot(p1: Point, p2: Point): number {
    return p1.x * p2.x + p1.y * p2.y;
  },

  projectPointOnSegment(point: Point, s1: Point, s2: Point): Point {
    const v = this.subtract(s2, s1);
    const w = this.subtract(point, s1);
    const c1 = this.dot(w, v);
    if (c1 <= 0) return { ...s1 };

    const c2 = this.dot(v, v);
    if (c2 <= c1) return { ...s2 };

    const b = c1 / c2;
    return this.add(s1, this.multiply(v, b));
  },

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

  // 获取矩形周长总长度
  getRectPerimeterLength(rect: Rect): number {
    return 2 * (rect.width + rect.height);
  },

  // 根据周长比例 [0~1] 获取边框上坐标（供PerimeterAnchor使用）
  pointOnPerimeter(rect: Rect, proportion: number): Point {
    const len = this.getRectPerimeterLength(rect);
    let dist = proportion * len;

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
        const t = dist / e.length;
        return {
          x: s.x + (ePt.x - s.x) * t,
          y: s.y + (ePt.y - s.y) * t
        };
      }
      dist -= e.length;
    }
    return { x: rect.x, y: rect.y };
  }
};