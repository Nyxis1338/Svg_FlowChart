import type { Point } from "../../types/geometry";

/**
 * 连线路径生成器抽象基类
 * 所有具体连线策略（直线、贝塞尔、流程图）都应继承此类
 */
export abstract class BaseConnector {
  /**
   * 根据起点和终点生成 SVG 路径字符串
   * @param start 起点坐标
   * @param end 终点坐标
   * @returns 符合 SVG 规范的路径数据（d 属性值）
   */
  abstract generate(start: Point, end: Point): string;

  /**
   * 可选：带额外参数的生成方法，供子类扩展使用
   * 例如：stub 长度、控制点偏移量等
   */
  generateWithOptions?(start: Point, end: Point, options?: Record<string, any>): string;
}