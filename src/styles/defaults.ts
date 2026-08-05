// src/styles/defaults.ts

/**
 * 全局默认样式配置
 * 所有渲染器均从此文件读取默认值，实现开箱即用
 * 用户可通过传入属性覆盖这些默认值
 */

export const Defaults = {
  /** 节点默认样式 */
  node: {
    fill: '#ffffff',
    stroke: '#d0d7de',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    labelColor: '#333333',
    labelFontSize: 14,
    labelOffsetY: 6,
    shadowFilter: 'url(#node-shadow)',
    selectedShadowFilter: 'url(#node-selected-glow)',
    selectedStroke: '#ff6b6b',
    selectedStrokeWidth: 3,
  },

  /** 锚点默认样式 */
  anchor: {
    radius: 5,
    fill: '#ffffff',
    stroke: '#5470c6',
    strokeWidth: 2,
    hoverStroke: '#ff6b6b',
    hoverStrokeWidth: 3,
    hoverRadiusMultiplier: 1.6,
    hoverShadow: 'drop-shadow(0 0 8px rgba(255,107,107,0.5))',
  },

  /** 连线默认样式 */
  connection: {
    stroke: '#5b6c7d',
    strokeWidth: 2,
    selectedStroke: '#ff6622',
    selectedStrokeWidth: 4,
    strokeLinecap: 'butt',
    strokeLinejoin: 'round',
    stub: 5, // 默认 stub 长度
    gap: 0, // 默认 gap 长度
    maxConnections: 4, // 默认每个锚点最多 4 条连线（-1 表示无限制）
  },

  /** 箭头默认样式 */
  arrow: {
    type: 'fork', // 'fork' | 'triangle'
    length: 12,
    width: 8,
    foldback: 0.623, // 三叉箭头经典值
    color: '#5b6c7d', // 默认与连线同色
  },

  /** 标签默认样式 */
  label: {
    color: '#333333',
    fontSize: 12,
    offsetX: 0,
    offsetY: -10,
    fontFamily: 'sans-serif',
  },
} as const;

/** 预设连线颜色（8种优雅色） */
export const ConnectorColors = [
  '#5b6c7d', // 蓝灰
  '#e74c3c', // 红
  '#2ecc71', // 绿
  '#f39c12', // 橙
  '#9b59b6', // 紫
  '#1abc9c', // 青
  '#e67e22', // 橙红
  '#3498db', // 蓝
];
