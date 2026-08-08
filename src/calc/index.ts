// src/calc/index.ts

/**
 * calc 计算模块
 * 提供锚点计算（anchor）和连线路径生成（connector）的核心算法
 *
 * 子模块：
 * - geometry: 几何工具函数（点、线段、矩形运算）
 * - anchor: 锚点位置计算（static / perimeter / continuous）
 * - connector: 连线路径生成（straight / bezier / flowchart）
 */

// 导出几何工具
export * from './geometry';

// 导出锚点计算模块
export * from './anchor';

// 导出连线路径生成模块
export * from './connector';

// 导出连线构建器
export * from './connection-builder';
