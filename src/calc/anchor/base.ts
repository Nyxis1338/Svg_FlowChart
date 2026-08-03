import type { Point } from "../../types/geometry";
import type { Node } from "../../types/SvgModel";

/**
 * 锚点计算器抽象基类
 * 所有具体锚点计算策略（static、perimeter、continuous）都应继承此类
 */
export abstract class BaseAnchorCalculator {
  /**
   * 根据节点信息和锚点ID，计算锚点在画布上的精确坐标
   * @param node 节点对象（包含位置和尺寸）
   * @param anchorId 锚点唯一标识
   * @returns 锚点的画布坐标
   */
  abstract calculate(node: Node, anchorId: string): Point;
}