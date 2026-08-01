import type { Point, Rect } from "./geometry";
import type { StaticAnchorType } from "../calc/anchor";
import type { ConnectorMode } from "../calc/connector";

/**
 * AnchorPoint = Anchor + Endpoint 合并一体
 * 画布可见输入输出端点
 */
export interface AnchorPoint {
  id: string;
  nodeId: string;

  anchorMode: "static" | "perimeter";
  staticType?: StaticAnchorType;
  perimeterTotal?: number;
  perimeterIndex?: number;

  offset?: Point;
  direction: "input" | "output";

  // 渲染样式
  radius?: number;
  fill?: string;
  stroke?: string;

  data?: Record<string, unknown>;
}

export interface FlowNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  data?: Record<string, unknown>;
}

export interface FlowConnection {
  id: string;
  connectorType: ConnectorMode;
  stroke?: string;
  strokeWidth?: number;

  // 模式A：锚点相连（实体端点）
  sourceAnchorId?: string;
  targetAnchorId?: string;

  // 模式B：节点直连 Continuous 自动锚点（无实体端点）
  sourceNodeId?: string;
  targetNodeId?: string;
}