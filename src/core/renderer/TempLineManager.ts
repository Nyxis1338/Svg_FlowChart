// src/core/renderer/TempLineManager.ts

import { createSvgElement } from '../../utils/dom';
import { ConnectorType } from '../../types/SvgModel';
import { connectorBezier } from '../../calc/connector/bezier';
import { connectorFlowchart } from '../../calc/connector/flowchart';
import { connectorStraight } from '../../calc/connector/straight';

/**
 * 临时线管理器
 * 负责在拖拽连线过程中绘制和更新临时路径
 */
export class TempLineManager {
  private group: SVGGElement | null = null;
  private pathEl: SVGPathElement | null = null;
  private dotEl: SVGCircleElement | null = null;

  constructor(private connectionLayer: SVGGElement) {}

  /**
   * 设置/更新临时线
   */
  setTempLine(
    pos: { x1: number; y1: number; x2: number; y2: number },
    connectorType?: ConnectorType,
    isReconnect: boolean = false,
    stroke?: string,
    strokeWidth?: number,
    orientation?: { dx: number; dy: number }
  ): void {
    if (!this.group) {
      this.group = createSvgElement('g') as SVGGElement;
      this.group.setAttribute('pointer-events', 'none');

      this.pathEl = createSvgElement('path') as SVGPathElement;
      this.pathEl.setAttribute('fill', 'none');
      this.group.appendChild(this.pathEl);

      this.dotEl = createSvgElement('circle') as SVGCircleElement;
      this.dotEl.setAttribute('r', '6');
      this.dotEl.setAttribute('fill', 'rgba(150,150,150,0.5)');
      this.dotEl.setAttribute('stroke', 'none');
      this.group.appendChild(this.dotEl);

      this.connectionLayer.appendChild(this.group);
    }

    // 设置样式
    if (isReconnect && stroke) {
      this.pathEl!.setAttribute('stroke', stroke);
      this.pathEl!.setAttribute('stroke-width', String(strokeWidth || 2));
      this.pathEl!.setAttribute('stroke-dasharray', 'none');
    } else {
      this.pathEl!.setAttribute('stroke', 'rgba(150,150,150,0.7)');
      this.pathEl!.setAttribute('stroke-width', '2.5');
      this.pathEl!.setAttribute('stroke-dasharray', '8 4');
    }

    // 生成路径
    const start = { x: pos.x1, y: pos.y1 };
    const end = { x: pos.x2, y: pos.y2 };
    let pathD: string;

    if (connectorType === ConnectorType.FLOWCHART) {
      // 临时线使用源方向，目标方向默认向上（或可传入）
      const srcOrient = orientation || { dx: 0, dy: 1 };
      const tgtOrient = { dx: 0, dy: -1 }; // 默认目标方向向上
      // 传递四个必要参数，stub 和 alwaysRespectStubs 使用默认值
      pathD = connectorFlowchart(start, end, srcOrient, tgtOrient);
    } else if (connectorType === ConnectorType.BEZIER) {
      pathD = connectorBezier(start, end, 0.5, 40);
    } else {
      pathD = connectorStraight(start, end);
    }

    this.pathEl!.setAttribute('d', pathD);
    this.dotEl!.setAttribute('cx', String(pos.x2));
    this.dotEl!.setAttribute('cy', String(pos.y2));
  }

  /**
   * 清除临时线（从 DOM 移除并置空引用）
   */
  clear(): void {
    if (this.group) {
      this.group.remove();
      this.group = null;
      this.pathEl = null;
      this.dotEl = null;
    }
  }

  /**
   * 获取临时线组元素（用于在重新渲染时保留）
   */
  getGroup(): SVGGElement | null {
    return this.group;
  }

  /**
   * 检查临时线是否存在
   */
  exists(): boolean {
    return this.group !== null;
  }

  /**
   * 销毁（清理）
   */
  destroy(): void {
    this.clear();
  }
}
