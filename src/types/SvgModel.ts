// src/types/SvgModel.ts

import type { Point, Rect } from "./geometry";
import type { StaticAnchorType } from "../calc/anchor";

// ==================== 枚举定义 ====================

/** 节点形状 */
export enum NodeShape {
    RECTANGLE = 'rectangle',
    CIRCLE = 'circle',
    DIAMOND = 'diamond',
    ELLIPSE = 'ellipse',
}

/** 锚点类型 */
export enum AnchorType {
    /** 静态锚点：在节点特定位置（上/右/下/左等）固定，可见 */
    STATIC = 'static',
    /** 周长锚点：沿节点边缘均匀分布，不可见但可交互 */
    PERIMETER = 'perimeter',
}

/** 静态锚点的位置（8个方向） */
export enum AnchorPosition {
    TOP_LEFT = 'top-left',
    TOP = 'top',
    TOP_RIGHT = 'top-right',
    RIGHT = 'right',
    BOTTOM_RIGHT = 'bottom-right',
    BOTTOM = 'bottom',
    BOTTOM_LEFT = 'bottom-left',
    LEFT = 'left',
}

/** 箭头方向 */
export enum ArrowDirection {
    NONE = 'none',
    SOURCE = 'source',
    TARGET = 'target',
    BOTH = 'both',
}

/** 连线类型 */
export enum ConnectorType {
    STRAIGHT = 'straight',
    BEZIER = 'bezier',
    FLOWCHART = 'flowchart',
}

// ==================== 标签和箭头配置 ====================

export interface LabelConfig {
    text: string;
    fontSize?: number;
    color?: string;
    offset?: Point;
}

export interface ArrowConfig {
    direction?: ArrowDirection;
    length?: number;
    width?: number;
    color?: string;
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
    data?: Record<string, unknown>;
}

export interface Anchor {
    id: string;
    nodeId: string;
    type: AnchorType;
    position?: AnchorPosition;          // 仅 STATIC 有效
    direction: 'input' | 'output';
    radius?: number;
    fill?: string;
    stroke?: string;
    offset?: Point;                     // 额外偏移
    perimeterTotal?: number;            // 仅 PERIMETER 有效
    perimeterIndex?: number;            // 仅 PERIMETER 有效
    visible?: boolean;
    data?: Record<string, unknown>;
}

export interface Connection {
    id: string;
    connectorType: ConnectorType;
    sourceAnchorId?: string;
    targetAnchorId?: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    stroke?: string;
    strokeWidth?: number;
    label?: LabelConfig;
    arrow?: ArrowConfig;
    selected?: boolean;
}

// ==================== 容器与视图状态 ====================

export interface ContainerConfig {
    id: string;
    background?: string;
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
}

export interface ViewState {
    translateX: number;
    translateY: number;
    scale: number;
}

export interface SvgDataModel {
    nodes: Record<string, Node>;
    connections: Record<string, Connection>;
    anchors: Record<string, Anchor>;
    viewState: ViewState;
    containerConfig: ContainerConfig;
}