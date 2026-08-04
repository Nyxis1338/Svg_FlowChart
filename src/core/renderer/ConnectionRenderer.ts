// src/core/renderer/ConnectionRenderer.ts

import type { Store } from "../store/Store";
import type { SelectionManager } from "../selection/SelectionManager";
import type { Connection, LabelConfig, ArrowConfig } from "../../types/SvgModel";
import type { Point } from "../../types/geometry";
import { createSvgElement } from "../../utils/dom";
import { ArrowDirection, ConnectorType } from "../../types/SvgModel";
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
      // 计算原始路径信息（起点/终点在节点边缘）
      const pathInfo = this.store.computeConnectionPath(conn);
      if (!pathInfo) continue;

      const { start, end, pathD } = pathInfo;

      // ---- 处理箭头偏移，调整连线终点 ----
      let adjustedStart = start;
      let adjustedEnd = end;
      const hasArrow = conn.arrow && conn.arrow.direction !== ArrowDirection.NONE;
      
      if (hasArrow) {
        const arrowLen = conn.arrow?.length || 12;
        const angle = this.getLineAngle(start, end); // 从 start 到 end 的方向角
        
        // 目标端箭头：连线终点从 end 向 start 方向偏移 arrowLen
        if (conn.arrow!.direction === ArrowDirection.TARGET || conn.arrow!.direction === ArrowDirection.BOTH) {
          adjustedEnd = {
            x: end.x - Math.cos(angle) * arrowLen,
            y: end.y - Math.sin(angle) * arrowLen,
          };
        }
        // 源端箭头：连线起点从 start 向 end 方向偏移 arrowLen
        if (conn.arrow!.direction === ArrowDirection.SOURCE || conn.arrow!.direction === ArrowDirection.BOTH) {
          adjustedStart = {
            x: start.x + Math.cos(angle) * arrowLen,
            y: start.y + Math.sin(angle) * arrowLen,
          };
        }
      }

      // ---- 生成调整后的路径 ----
      const adjustedPathD = generatePath(conn.connectorType, adjustedStart, adjustedEnd);

      const g = createSvgElement("g") as SVGGElement;
      g.dataset["connectionId"] = conn.id;
      g.style.cursor = "pointer";

      // 路径
      const path = createSvgElement("path") as SVGPathElement;
      path.setAttribute("d", adjustedPathD);
      path.setAttribute("fill", "none");
      const isSelected = this.selection.isSelected("connection", conn.id);
      path.setAttribute("stroke", isSelected ? "#ff6622" : (conn.stroke || "#666666"));
      path.setAttribute("stroke-width", String(isSelected ? 4 : (conn.strokeWidth || 2)));
      path.setAttribute("stroke-linecap", "butt");   // 平头，避免突出
      path.setAttribute("stroke-linejoin", "round");
      g.appendChild(path);

      // 标签（基于原始中点，更稳定）
      if (conn.label) {
        const labelEl = this.renderLabel(conn.label, { start, end, pathD });
        if (labelEl) g.appendChild(labelEl);
      }

      // 箭头（使用原始 pathInfo，确保尖端在节点边缘）
      if (conn.arrow && conn.arrow.direction !== ArrowDirection.NONE) {
        const arrowEl = this.renderArrow(conn.arrow, { start, end, pathD }, conn.stroke);
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

  /**
   * 渲染连线箭头（折叠风格，尖端在节点边缘，尾部向内收缩）
   */
  private renderArrow(
    arrow: ArrowConfig,
    pathInfo: { start: Point; end: Point; pathD: string },
    defaultColor?: string
  ): SVGPathElement | null {
    const direction = arrow.direction || ArrowDirection.TARGET;
    const length = arrow.length || 12;
    const width = arrow.width || 8;
    const color = arrow.color || defaultColor || "#666666";
    const foldback = arrow.foldback ?? 0.623;

    // 收集箭头位置（端点 + 方向角）
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

    const arrowPath = createSvgElement("path") as SVGPathElement;
    let d = "";

    for (const pos of positions) {
      const { endpoint, angle } = pos;
      const theta = angle;

      // 尖端固定在节点边缘（连线终点）
      const tip = { x: endpoint.x, y: endpoint.y };

      // 尾部沿连线方向向起点偏移 length（即向连线内部缩进）
      const base = {
        x: endpoint.x - Math.cos(theta) * length,
        y: endpoint.y - Math.sin(theta) * length,
      };

      // 尾部两端（垂直于连线方向）
      const halfWidth = width / 2;
      const tailLeft = {
        x: base.x + Math.cos(theta + Math.PI / 2) * halfWidth,
        y: base.y + Math.sin(theta + Math.PI / 2) * halfWidth,
      };
      const tailRight = {
        x: base.x + Math.cos(theta - Math.PI / 2) * halfWidth,
        y: base.y + Math.sin(theta - Math.PI / 2) * halfWidth,
      };

      // 折叠点
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