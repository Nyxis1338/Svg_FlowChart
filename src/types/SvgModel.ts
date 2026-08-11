// src/types/SvgModel.ts

import type { Point, Rect } from './geometry';

// ==================== 类型定义 ====================

export type NodeShape = 'rectangle' | 'circle' | 'diamond' | 'ellipse';
export type ArrowDirection = 'none' | 'source' | 'target' | 'both';
export type ConnectorType = 'straight' | 'bezier' | 'flowchart';
/** 静态锚点的位置（8个方向） */
export type AnchorPosition =
  | 'top'
  | 'right'
  | 'left'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

// ==================== 标签和箭头配置 ====================

export interface LabelConfig {
  text: string;
  fontSize?: number;
  color?: string;
  offset?: Point;
}

export interface ArrowConfig {
  direction?: ArrowDirection;
  type?: 'fork' | 'triangle'; // 新增
  length?: number;
  width?: number;
  color?: string;
  foldback?: number; // 仅 triangle 可用
}

// ==================== 实体接口 ====================

export interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  shape?: NodeShape;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  selected?: boolean;
  anchorIds?: string[];
  zIndex?: number;
  data?: Record<string, unknown>;
}

export interface Anchor {
  id: string;
  nodeId: string;
  position?: AnchorPosition;
  direction: 'input' | 'output' | 'both';
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  offset?: Point;
  visible?: boolean;
  data?: Record<string, unknown>;
}

export interface Connection {
  id: string;
  connectorType: ConnectorType;
  sourceAnchorId?: string;
  targetAnchorId?: string;
  stroke?: string;
  strokeWidth?: number;
  label?: LabelConfig;
  arrow?: ArrowConfig;
  selected?: boolean;
  fixed?: boolean; // 是否固定（不可拖拽），默认 false
  stub?: number;
  gap?: number;
  zIndex?: number;
}
