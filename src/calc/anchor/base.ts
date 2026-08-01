import type { Point } from "../../types/geometry";
import type { FlowNode } from "../../types/flow-model";

export abstract class BaseAnchorCalculator {
  /**
   * 根据节点信息，计算锚点画布坐标
   */
  abstract calculate(node: FlowNode, anchorId: string): Point;
}