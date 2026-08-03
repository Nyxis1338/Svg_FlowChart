import type { Point } from "../../types/geometry";
import { connectorStraight } from "./straight";
import { connectorBezier } from "./bezier";
import { connectorFlowchart } from "./flowchart";
import { ConnectorType } from "../../types/SvgModel";

/**
 * 生成 SVG 路径字符串（接受枚举或字符串）
 */
export function generatePath(mode: ConnectorType, start: Point, end: Point): string {
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
      // 类型守卫，确保所有情况都被处理
      const _exhaustiveCheck: never = modeStr;
      return _exhaustiveCheck;
  }
}

/**
 * 带额外选项的路径生成函数
 */
export function generatePathWithOptions(
  mode: ConnectorType,
  start: Point,
  end: Point,
  options?: Record<string, any>
): string {
  const modeStr = typeof mode === 'string' ? mode : mode;
  switch (modeStr) {
    case ConnectorType.STRAIGHT:
    case "straight":
      return connectorStraight(start, end);
    case ConnectorType.BEZIER:
    case "bezier": {
      const offsetFactor = options?.offsetFactor ?? 0.5;
      const minOffset = options?.minOffset ?? 40;
      return connectorBezier(start, end, offsetFactor, minOffset);
    }
    case ConnectorType.FLOWCHART:
    case "flowchart": {
      const stub = options?.stub ?? 35;
      return connectorFlowchart(start, end, stub);
    }
    default:
      const _exhaustiveCheck: never = modeStr;
      return _exhaustiveCheck;
  }
}