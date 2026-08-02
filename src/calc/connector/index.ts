import type { Point } from "../../types/geometry";
import { connectorStraight } from "./straight";
import { connectorBezier } from "./bezier";
import { connectorFlowchart } from "./flowchart";
import { ConnectorType } from "../../types/SvgModel";  // 导入枚举

export type ConnectorMode = "straight" | "bezier" | "flowchart"; // 保留原有类型

/**
 * 根据连线模式和起止点生成 SVG 路径字符串
 * @param mode 连线类型
 * @param start 起点
 * @param end 终点
 * @returns SVG 路径字符串
 */
export function generatePath(mode: ConnectorType | ConnectorMode, start: Point, end: Point): string {
    // 兼容字符串和枚举
    const modeStr = typeof mode === 'string' ? mode : mode;
    switch (modeStr) {
        case ConnectorType.STRAIGHT:
        case "straight":
            return connectorStraight(start, end);
        case ConnectorType.BEZIER:
        case "bezier":
            return connectorBezier(start, end);
        case ConnectorType.FLOWCHART:
        case "flowchart":
            return connectorFlowchart(start, end);
        default:
            const _exhaustiveCheck: never = modeStr;
            return _exhaustiveCheck;
    }
}

/**
 * 带额外选项的路径生成函数
 * @param mode 连线类型
 * @param start 起点
 * @param end 终点
 * @param options 额外参数，例如：
 *   - for flowchart: { stub: 40 }
 *   - for bezier: { offsetFactor: 0.6, minOffset: 50 }
 * @returns SVG 路径字符串
 */
export function generatePathWithOptions(
  mode: ConnectorMode,
  start: Point,
  end: Point,
  options?: Record<string, any>
): string {
  switch (mode) {
    case "straight":
      return connectorStraight(start, end);
    case "bezier": {
      const offsetFactor = options?.offsetFactor ?? 0.5;
      const minOffset = options?.minOffset ?? 40;
      return connectorBezier(start, end, offsetFactor, minOffset);
    }
    case "flowchart": {
      const stub = options?.stub ?? 35;
      return connectorFlowchart(start, end, stub);
    }
    default:
      const _exhaustiveCheck: never = mode;
      return _exhaustiveCheck;
  }
}