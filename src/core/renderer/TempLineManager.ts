// src/core/renderer/TempLineManager.ts

import { createSvgElement } from '../../utils/dom';
import { connectorBezier } from '../../calc/connector/bezier';
import { connectorFlowchart } from '../../calc/connector/flowchart';
import { connectorStraight } from '../../calc/connector/straight';

export class TempLineManager {
  private group: SVGGElement | null = null;
  private pathEl: SVGPathElement | null = null;
  private dotEl: SVGCircleElement | null = null;

  constructor(private tempLayer: SVGGElement) {}

  setTempLine(
    pos: { x1: number; y1: number; x2: number; y2: number },
    connectorType?: string,
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
      this.tempLayer.appendChild(this.group);
    }

    if (isReconnect && stroke) {
      this.pathEl!.setAttribute('stroke', stroke);
      this.pathEl!.setAttribute('stroke-width', String(strokeWidth || 2));
      this.pathEl!.setAttribute('stroke-dasharray', 'none');
    } else {
      this.pathEl!.setAttribute('stroke', 'rgba(150,150,150,0.7)');
      this.pathEl!.setAttribute('stroke-width', '2.5');
      this.pathEl!.setAttribute('stroke-dasharray', '8 4');
    }

    const start = { x: pos.x1, y: pos.y1 };
    const end = { x: pos.x2, y: pos.y2 };

    let pathD: string;
    if (connectorType === 'flowchart') {
      const srcOrient = orientation || { dx: 0, dy: 1 };
      const tgtOrient = { dx: 0, dy: -1 };
      pathD = connectorFlowchart(start, end, srcOrient, tgtOrient);
    } else if (connectorType === 'bezier') {
      pathD = connectorBezier(start, end);
    } else {
      pathD = connectorStraight(start, end);
    }

    this.pathEl!.setAttribute('d', pathD);
    this.dotEl!.setAttribute('cx', String(pos.x2));
    this.dotEl!.setAttribute('cy', String(pos.y2));
  }

  clear(): void {
    if (this.group) {
      this.group.remove();
      this.group = null;
      this.pathEl = null;
      this.dotEl = null;
    }
  }

  getGroup(): SVGGElement | null {
    return this.group;
  }

  exists(): boolean {
    return this.group !== null;
  }

  destroy(): void {
    this.clear();
  }
}
