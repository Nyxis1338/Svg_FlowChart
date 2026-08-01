import type { Point } from "../../types/geometry";

export type HitTargetType = "node" | "anchor" | "connection" | null;
export interface HitResult {
  type: HitTargetType;
  id: string | null;
}

export class HitTest {
  // 后续实现：独立坐标拾取算法
  public test(point: Point): HitResult {
    return { type: null, id: null };
  }
}