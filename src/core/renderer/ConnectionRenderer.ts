// src/core/renderer/ConnectionRenderer.ts

import type { Store } from "../store/Store";
import type { SelectionManager } from "../selection/SelectionManager";
import type { Connection, LabelConfig, ArrowConfig } from "../../types/SvgModel";
import type { Point } from "../../types/geometry";
import { createSvgElement } from "../../utils/dom";
import { ArrowDirection } from "../../types/SvgModel";
import { generatePath } from "../../calc";

export class ConnectionRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly connectionLayer: SVGGElement
  ) {}

  render(): void {
    this.connectionLayer.innerHTML = "";
    const connections = this.store.getAllConnections();

    for (const conn of connections) {
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;

      const g = createSvgElement("g") as SVGGElement;
      g.dataset["connectionId"] = conn.id;
      g.style.cursor = "pointer";

      // 路径
      const path = createSvgElement("path") as SVGPathElement;
      path.setAttribute("d", pathInfo.pathD);
      path.setAttribute("fill", "none");
      const isSelected = this.selection.isSelected("connection", conn.id);
      path.setAttribute("stroke", isSelected ? "#ff6622" : (conn.stroke || "#666666"));
      path.setAttribute("stroke-width", String(isSelected ? 4 : (conn.strokeWidth || 2)));
      g.appendChild(path);

      // 标签
      if (conn.label) {
        const labelEl = this.renderLabel(conn.label, pathInfo);
        if (labelEl) g.appendChild(labelEl);
      }

      // 箭头
      if (conn.arrow && conn.arrow.direction !== ArrowDirection.NONE) {
        const arrowEl = this.renderArrow(conn.arrow, pathInfo, conn.stroke);
        if (arrowEl) g.appendChild(arrowEl);
      }

      // 点击选中连线
      g.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.selection.select("connection", conn.id);
      });

      this.connectionLayer.appendChild(g);
    }
  }

  private renderLabel(label: LabelConfig, pathInfo: { start: Point; end: Point; pathD: string }): SVGTextElement | null {
    const mid = this.getPathMidPoint(pathInfo.start, pathInfo.end);
    const text = createSvgElement("text") as SVGTextElement;
    const offset = label.offset || { x: 0, y: -10 };
    text.setAttribute("x", String(mid.x + offset.x));
    text.setAttribute("y", String(mid.y + offset.y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", label.color || "#333333");
    text.setAttribute("font-size", String(label.fontSize || 12));
    text.setAttribute("font-family", "sans-serif");
    text.textContent = label.text;
    return text;
  }

  private renderArrow(arrow: ArrowConfig, pathInfo: { start: Point; end: Point; pathD: string }, defaultColor?: string): SVGPathElement | null {
    const direction = arrow.direction || ArrowDirection.TARGET;
    const length = arrow.length || 10;
    const width = arrow.width || 8;
    const color = arrow.color || defaultColor || "#666666";

    const positions: Array<{ point: Point; angle: number }> = [];
    if (direction === ArrowDirection.TARGET || direction === ArrowDirection.BOTH) {
      const angle = this.getLineAngle(pathInfo.start, pathInfo.end);
      positions.push({ point: pathInfo.end, angle });
    }
    if (direction === ArrowDirection.SOURCE || direction === ArrowDirection.BOTH) {
      const angle = this.getLineAngle(pathInfo.end, pathInfo.start);
      positions.push({ point: pathInfo.start, angle });
    }
    if (positions.length === 0) return null;

    const arrowPath = createSvgElement("path") as SVGPathElement;
    let d = "";
    for (const pos of positions) {
      const { point, angle } = pos;
      const halfWidth = width / 2;
      const theta = angle;
      const tip = point;
      const base = {
        x: point.x - Math.cos(theta) * length,
        y: point.y - Math.sin(theta) * length,
      };
      const left = {
        x: base.x + Math.cos(theta + Math.PI / 2) * halfWidth,
        y: base.y + Math.sin(theta + Math.PI / 2) * halfWidth,
      };
      const right = {
        x: base.x + Math.cos(theta - Math.PI / 2) * halfWidth,
        y: base.y + Math.sin(theta - Math.PI / 2) * halfWidth,
      };
      d += `M ${tip.x} ${tip.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z `;
    }
    arrowPath.setAttribute("d", d.trim());
    arrowPath.setAttribute("fill", color);
    arrowPath.setAttribute("stroke", "none");
    arrowPath.setAttribute("pointer-events", "none");
    return arrowPath;
  }

  private getPathMidPoint(start: Point, end: Point): Point {
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  }

  private getLineAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
  }
}