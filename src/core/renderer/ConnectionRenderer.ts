// src/core/renderer/ConnectionRenderer.ts

import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Connection, LabelConfig, ArrowConfig } from '../../types/SvgModel';
import type { Point } from '../../types/geometry';
import { createSvgElement } from '../../utils/dom';
import { ArrowDirection, ConnectorType } from '../../types/SvgModel';
import { computePath } from '../../calc/connector/path';
import { Defaults } from '../../styles/defaults';

export class ConnectionRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly elementLayer: SVGGElement
  ) {}

  render(skipIds?: Set<string>): void {
    // ❌ 不再清空 layer，由 SvgRenderer 统一清空
    const connections = this.store.getAllConnections();
    // 按 zIndex 升序排序
    const sorted = [...connections].sort((a, b) => (a.zIndex ?? 100) - (b.zIndex ?? 100));

    for (const conn of sorted) {
      if (skipIds && skipIds.has(conn.id)) {
        continue;
      }

      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;

      const { start, end, pathD } = pathInfo;

      const stub = conn.stub ?? Defaults.connection.stub;
      const gap = conn.gap ?? Defaults.connection.gap;
      const result = computePath(start, end, conn.connectorType, { stub, gap });
      const adjustedPathD = result.pathD;

      const g = createSvgElement('g') as SVGGElement;
      g.dataset['connectionId'] = conn.id;
      g.style.cursor = 'pointer';
      g.dataset['zIndex'] = String(conn.zIndex ?? 100);

      const path = createSvgElement('path') as SVGPathElement;
      path.setAttribute('d', adjustedPathD);
      path.setAttribute('fill', 'none');
      const isSelected = this.selection.isSelected('connection', conn.id);
      const defaultStroke = Defaults.connection.stroke;
      const defaultWidth = Defaults.connection.strokeWidth;
      path.setAttribute('stroke', isSelected ? Defaults.connection.selectedStroke : conn.stroke || defaultStroke);
      path.setAttribute(
        'stroke-width',
        String(isSelected ? Defaults.connection.selectedStrokeWidth : conn.strokeWidth || defaultWidth)
      );
      path.setAttribute('stroke-linecap', Defaults.connection.strokeLinecap);
      path.setAttribute('stroke-linejoin', Defaults.connection.strokeLinejoin);
      g.appendChild(path);

      if (conn.label) {
        const labelEl = this.renderLabel(conn.label, { start, end, pathD });
        if (labelEl) g.appendChild(labelEl);
      }

      if (conn.arrow && conn.arrow.direction !== ArrowDirection.NONE) {
        const arrowEl = this.renderArrow(conn.arrow, { start, end, pathD }, conn.stroke);
        if (arrowEl) g.appendChild(arrowEl);
      }

      // ✅ 添加到统一的 elementLayer
      this.elementLayer.appendChild(g);
    }
  }

  private renderLabel(
    label: LabelConfig,
    pathInfo: { start: Point; end: Point; pathD: string }
  ): SVGTextElement | null {
    const mid = this.getPathMidPoint(pathInfo.start, pathInfo.end);
    const text = createSvgElement('text') as SVGTextElement;
    const offsetX = label.offset?.x ?? Defaults.label.offsetX;
    const offsetY = label.offset?.y ?? Defaults.label.offsetY;
    text.setAttribute('x', String(mid.x + offsetX));
    text.setAttribute('y', String(mid.y + offsetY));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', label.color ?? Defaults.label.color);
    text.setAttribute('font-size', String(label.fontSize ?? Defaults.label.fontSize));
    text.setAttribute('font-family', Defaults.label.fontFamily);
    text.textContent = label.text;
    return text;
  }

  private renderArrow(
    arrow: ArrowConfig,
    pathInfo: { start: Point; end: Point; pathD: string },
    defaultColor?: string
  ): SVGPathElement | null {
    const direction = arrow.direction || ArrowDirection.TARGET;
    const length = arrow.length || Defaults.arrow.length;
    const width = arrow.width || Defaults.arrow.width;
    const color = arrow.color || defaultColor || Defaults.arrow.color;
    const foldback = arrow.foldback ?? Defaults.arrow.foldback;

    const positions: Array<{ endpoint: Point; angle: number }> = [];
    if (direction === ArrowDirection.TARGET || direction === ArrowDirection.BOTH) {
      const angle = this.getLineAngle(pathInfo.start, pathInfo.end);
      positions.push({ endpoint: pathInfo.end, angle });
    }
    if (direction === ArrowDirection.SOURCE || direction === ArrowDirection.BOTH) {
      const angle = this.getLineAngle(pathInfo.end, pathInfo.start);
      positions.push({ endpoint: pathInfo.start, angle });
    }
    if (positions.length === 0) return null;

    const arrowPath = createSvgElement('path') as SVGPathElement;
    let d = '';

    for (const pos of positions) {
      const { endpoint, angle } = pos;
      const theta = angle;

      const tip = { x: endpoint.x, y: endpoint.y };
      const base = {
        x: endpoint.x - Math.cos(theta) * length,
        y: endpoint.y - Math.sin(theta) * length,
      };

      const halfWidth = width / 2;
      const tailLeft = {
        x: base.x + Math.cos(theta + Math.PI / 2) * halfWidth,
        y: base.y + Math.sin(theta + Math.PI / 2) * halfWidth,
      };
      const tailRight = {
        x: base.x + Math.cos(theta - Math.PI / 2) * halfWidth,
        y: base.y + Math.sin(theta - Math.PI / 2) * halfWidth,
      };

      const foldDist = length * (1 - foldback);
      const foldWidth = halfWidth * foldback;
      const foldLeft = {
        x: tip.x - Math.cos(theta) * foldDist + Math.cos(theta + Math.PI / 2) * foldWidth,
        y: tip.y - Math.sin(theta) * foldDist + Math.sin(theta + Math.PI / 2) * foldWidth,
      };
      const foldRight = {
        x: tip.x - Math.cos(theta) * foldDist + Math.cos(theta - Math.PI / 2) * foldWidth,
        y: tip.y - Math.sin(theta) * foldDist + Math.sin(theta - Math.PI / 2) * foldWidth,
      };

      d += `M ${tip.x} ${tip.y} L ${foldLeft.x} ${foldLeft.y} L ${tailLeft.x} ${tailLeft.y} `;
      d += `L ${tailRight.x} ${tailRight.y} L ${foldRight.x} ${foldRight.y} Z `;
    }

    arrowPath.setAttribute('d', d.trim());
    arrowPath.setAttribute('fill', color);
    arrowPath.setAttribute('stroke', 'none');
    arrowPath.setAttribute('pointer-events', 'none');
    return arrowPath;
  }

  private getPathMidPoint(start: Point, end: Point): Point {
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  }

  private getLineAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
  }
}
