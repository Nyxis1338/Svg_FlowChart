// src/core/renderer/ConnectionRenderer.ts

import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Connection, LabelConfig, ArrowConfig } from '../../types/SvgModel';
import type { Point } from '../../types/geometry';
import { createSvgElement } from '../../utils/dom';
import { Defaults } from '../../styles/defaults';
import { Geometry } from '../../calc/geometry';

export class ConnectionRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly elementLayer: SVGGElement
  ) {}

  render(skipIds?: Set<string>): void {
    const connections = this.store.getAllConnections();
    const sorted = [...connections].sort(
      (a, b) => (a.zIndex ?? Defaults.zIndexBase) - (b.zIndex ?? Defaults.zIndexBase)
    );

    for (const conn of sorted) {
      if (skipIds && skipIds.has(conn.id)) continue;
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;
      // 解构时只保留需要的字段
      const { start, end, pathD, startDirection, endDirection } = pathInfo;

      // console.log('startDirection : ', startDirection);
      // console.log('endDirection : ', endDirection);

      const g = createSvgElement('g') as SVGGElement;
      g.dataset['connectionId'] = conn.id;
      g.style.cursor = 'pointer';
      g.dataset['zIndex'] = String(conn.zIndex ?? Defaults.zIndexBase);

      // ---- 主路径 ----
      const path = createSvgElement('path') as SVGPathElement;
      path.setAttribute('d', pathD);
      path.setAttribute('fill', 'none');
      const isSelected = this.selection.isSelected('connection', conn.id);
      const defaultStroke = Defaults.connection.stroke;
      const defaultWidth = Defaults.connection.strokeWidth;
      const strokeColor = isSelected ? Defaults.connection.selectedStroke : conn.stroke || defaultStroke;
      const strokeWidth = isSelected ? Defaults.connection.selectedStrokeWidth : conn.strokeWidth || defaultWidth;
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', String(strokeWidth));
      path.setAttribute('stroke-linecap', Defaults.connection.strokeLinecap);
      path.setAttribute('stroke-linejoin', Defaults.connection.strokeLinejoin);
      g.appendChild(path);

      // ---- 箭头 ----
      if (conn.arrow && conn.arrow.direction !== 'none') {
        const arrow = conn.arrow;
        // 目标端箭头：位置在 end，方向为 start→end
        if (arrow.direction === 'target' || arrow.direction === 'both') {
          const dir = Geometry.normalizeDirection(endDirection);
          const arrowEl = this.renderArrow(arrow, end, dir, strokeColor);
          if (arrowEl) g.appendChild(arrowEl);
        }
        // 源端箭头：位置在 start，方向为 end→start
        if (arrow.direction === 'source' || arrow.direction === 'both') {
          const dir = Geometry.normalizeDirection(startDirection);
          const arrowEl = this.renderArrow(arrow, start, dir, strokeColor);
          if (arrowEl) g.appendChild(arrowEl);
        }
      }

      // ---- 标签 ----
      if (conn.label) {
        const labelEl = this.renderLabel(conn.label, { start, end, pathD });
        if (labelEl) g.appendChild(labelEl);
      }

      this.elementLayer.appendChild(g);
    }
  }

  /**
   * 绘制单个箭头（三角形或三叉）
   */
  private renderArrow(
    arrow: ArrowConfig,
    tip: Point,
    dir: { dx: number; dy: number },
    color: string
  ): SVGPathElement | null {
    const length = arrow.length || Defaults.arrow.length;
    const width = arrow.width || Defaults.arrow.width;
    const type = arrow.type || Defaults.arrow.type;

    // 使用 Geometry.normalizeDirection 替代手写归一化
    const norm = Geometry.normalizeDirection(dir);
    if (norm.dx === 0 && norm.dy === 0) return null;

    const dx = norm.dx;
    const dy = norm.dy;

    // 底边中点
    const base = {
      x: tip.x - dx * length,
      y: tip.y - dy * length,
    };
    // 底边两个端点（垂直于方向向量偏移 ±width/2）
    const halfWidth = width / 2;
    const left = {
      x: base.x + dy * halfWidth,
      y: base.y - dx * halfWidth,
    };
    const right = {
      x: base.x - dy * halfWidth,
      y: base.y + dx * halfWidth,
    };

    const arrowPath = createSvgElement('path') as SVGPathElement;
    let d = '';

    if (type === 'fork') {
      // 两条斜线从 tip 到 left 和 right
      d =
        `M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${left.x.toFixed(2)} ${left.y.toFixed(2)} ` +
        `M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${right.x.toFixed(2)} ${right.y.toFixed(2)}`;
      arrowPath.setAttribute('stroke', color);
      arrowPath.setAttribute('stroke-width', String(width / 3));
      arrowPath.setAttribute('fill', 'none');
    } else {
      d += `M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${left.x.toFixed(2)} ${left.y.toFixed(2)} L ${right.x.toFixed(2)} ${right.y.toFixed(2)} Z`;
      arrowPath.setAttribute('fill', color);
      arrowPath.setAttribute('stroke', 'none');
    }
    arrowPath.setAttribute('d', d.trim());
    arrowPath.setAttribute('pointer-events', 'none');

    return arrowPath;
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

  private getPathMidPoint(start: Point, end: Point): Point {
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  }
}
