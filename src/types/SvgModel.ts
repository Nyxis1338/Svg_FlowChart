// src/types/SvgModel.ts

import type { Point, Rect } from "./geometry";
// 假设原有的 calc 类型仍然使用，我们保留兼容
import type { StaticAnchorType } from "../calc/anchor";
import type { ConnectorMode } from "../calc/connector";

// ==================== 新增枚举定义 ====================

/** 节点形状 */
export enum NodeShape {
    RECTANGLE = 'rectangle',
    CIRCLE = 'circle',
    DIAMOND = 'diamond',
    ELLIPSE = 'ellipse',
}

/** 锚点类型 (替代原有的 anchorMode 概念) */
export enum AnchorType {
    /** 固定锚点：在节点特定位置显示为可见点 */
    FIXED = 'fixed',
    /** 周长锚点：沿节点边缘动态计算，对应原有的 'perimeter' */
    PERIMETER = 'perimeter',
    /** 静态锚点：固定偏移量，对应原有的 'static' */
    STATIC = 'static',
}

/** 固定锚点的位置 */
export enum AnchorPosition {
    TOP = 'top',
    RIGHT = 'right',
    BOTTOM = 'bottom',
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

// ==================== 增强的 AnchorPoint ====================

/**
 * 锚点（端点）定义
 * 兼容原有的 anchorMode，同时引入新的 type/position 体系
 */
export interface AnchorPoint {
    id: string;
    nodeId: string;

    // ---- 原有字段（保持兼容） ----
    /** @deprecated 建议使用 type 代替 */
    anchorMode?: "static" | "perimeter";
    staticType?: StaticAnchorType;
    perimeterTotal?: number;
    perimeterIndex?: number;
    offset?: Point;
    direction: "input" | "output";

    // ---- 新增字段 ----
    /** 锚点类型，明确区分固定、周长、静态 */
    type?: AnchorType;
    /** 当 type = FIXED 时，指定其在节点上的位置 */
    position?: AnchorPosition;
    /** 是否在画布上可见（固定锚点通常可见，周长锚点通常不可见） */
    visible?: boolean;

    // ---- 渲染样式（原有） ----
    radius?: number;
    fill?: string;
    stroke?: string;

    data?: Record<string, unknown>;
}

// ==================== 增强的 FlowNode ====================

/**
 * 节点定义
 * 增加形状、样式、选中状态，并引入锚点聚合（可选）
 */
export interface FlowNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;

    // ---- 新增字段 ----
    shape?: NodeShape;                 // 节点形状，默认 rectangle
    fill?: string;                     // 背景色
    stroke?: string;                   // 边框色
    strokeWidth?: number;              // 边框宽度
    selected?: boolean;                // 选中状态
    /** 该节点包含的锚点ID列表（便于快速获取，但数据以独立 AnchorPoint 为准） */
    anchorIds?: string[];

    data?: Record<string, unknown>;
}

// ==================== 增强的 FlowConnection ====================

/**
 * 连线标签配置
 */
export interface LabelConfig {
    text: string;
    fontSize?: number;
    color?: string;
    offset?: Point;      // 相对连线中点的偏移
}

/**
 * 连线箭头配置
 */
export interface ArrowConfig {
    direction?: ArrowDirection;
    length?: number;
    width?: number;
    color?: string;
}

/**
 * 连线定义
 * 保留两种连接模式，同时增加标签和箭头
 */
export interface FlowConnection {
    id: string;
    connectorType: ConnectorType;  // 原来是 ConnectorMode，现在改为枚举
    stroke?: string;
    strokeWidth?: number;

    // 模式A：锚点相连（实体端点）
    sourceAnchorId?: string;
    targetAnchorId?: string;

    // 模式B：节点直连（Continuous 自动锚点）
    sourceNodeId?: string;
    targetNodeId?: string;

    // ---- 新增字段 ----
    label?: LabelConfig;
    arrow?: ArrowConfig;
    selected?: boolean;
}

// ==================== 容器配置（新增） ====================

/**
 * 容器（画布）配置
 */
export interface ContainerConfig {
    id: string;                         // 格式：'content-{uuid}'
    background?: string;
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
}

/**
 * 视图状态（用于 ViewportManager）
 */
export interface ViewState {
    translateX: number;
    translateY: number;
    scale: number;
}

// ==================== 顶层数据模型（用于 SvgStore） ====================

/**
 * SvgStore 管理的完整数据模型
 * 您可以根据需要选择是否采用此结构
 */
export interface SvgDataModel {
    nodes: Record<string, FlowNode>;
    connections: Record<string, FlowConnection>;
    anchors: Record<string, AnchorPoint>;  // 新增锚点独立存储
    viewState: ViewState;
    containerConfig: ContainerConfig;
}