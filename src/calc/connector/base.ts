import type { Point } from "../../types/geometry";

export abstract class BaseConnector {
  /**
   * 生成SVG path路径字符串
   */
  abstract generate(start: Point, end: Point): string;
}