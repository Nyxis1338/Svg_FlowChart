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
    stroke: '#2980b9', // 海洋蓝
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
    // 选中样式（点击锚点后）
    selectedStroke: '#ff6b6b',
    selectedStrokeWidth: 3,
    selectedRadiusMultiplier: 1.4, // 适度放大
    selectedShadow: 'drop-shadow(0 0 6px rgba(255,107,107,0.4))',
    // 拖拽悬停样式（拖拽到锚点上方）- 强调模糊阴影感
    hoverStroke: '#ff6b6b',
    hoverStrokeWidth: 3,
    hoverRadiusMultiplier: 1.4, // 与选中保持一致，避免尺寸突变
    hoverShadow: 'drop-shadow(0 0 18px rgba(255,107,107,0.8)) drop-shadow(0 0 8px rgba(255,107,107,0.5))', // 双重模糊阴影
  },

  /** 连线默认样式 */
  connection: {
    connectorType: 'flowchart',
    stroke: '#27ae60', // 舒适绿色
    strokeWidth: 2,
    selectedStroke: '#ff6b6b',
    selectedStrokeWidth: 3,
    strokeLinecap: 'butt',
    strokeLinejoin: 'round',
    stub: 5,
    gap: 0,
    maxConnections: 4,
  },

  /** 箭头默认样式 */
  arrow: {
    type: 'triangle',
    length: 12,
    width: 8,
    foldback: 0.623,
    color: '#27ae60', // 默认与连线同色
  },

  /** 标签默认样式 */
  label: {
    color: '#333333',
    fontSize: 12,
    offsetX: 0,
    offsetY: -10,
    fontFamily: 'sans-serif',
  },

  /** z-index 基础值 */
  zIndexBase: 100,
} as const;
