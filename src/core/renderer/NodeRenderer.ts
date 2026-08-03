// src/core/renderer/NodeRenderer.ts

import type { Store } from "../store/Store";
import type { SelectionManager } from "../selection/SelectionManager";
import type { Node } from "../../types/SvgModel";
import { createSvgElement } from "../../utils/dom";
import { NodeShape } from "../../types/SvgModel";

export class NodeRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly nodeLayer: SVGGElement
  ) {}

  render(): void {
    this.nodeLayer.innerHTML = "";
    const nodes = this.store.getAllNodes();

    for (const node of nodes) {
      const g = createSvgElement("g") as SVGGElement;
      g.setAttribute("data-node-id", node.id);

      const isSelected = this.selection.isSelected("node", node.id);
      const strokeColor = isSelected ? "#ff6622" : (node.stroke || "#5588dd");
      const strokeWidth = isSelected ? 3 : (node.strokeWidth || 2);

      let shapeEl: SVGElement;
      switch (node.shape) {
        case NodeShape.CIRCLE:
          shapeEl = this.createCircle(node, strokeColor, strokeWidth);
          break;
        case NodeShape.DIAMOND:
          shapeEl = this.createDiamond(node, strokeColor, strokeWidth);
          break;
        case NodeShape.ELLIPSE:
          shapeEl = this.createEllipse(node, strokeColor, strokeWidth);
          break;
        default:
          shapeEl = this.createRect(node, strokeColor, strokeWidth);
          break;
      }

      g.appendChild(shapeEl);

      if (node.label) {
        const text = createSvgElement("text") as SVGTextElement;
        text.setAttribute("x", String(node.x + node.width / 2));
        text.setAttribute("y", String(node.y + node.height / 2 + 6));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#222222");
        text.setAttribute("font-size", "14");
        text.textContent = node.label;
        g.appendChild(text);
      }

      // 点击选中节点
      shapeEl.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.selection.select("node", node.id);
      });

      this.nodeLayer.appendChild(g);
    }
  }

  private createRect(node: Node, stroke: string, strokeWidth: number): SVGRectElement {
    const rect = createSvgElement("rect") as SVGRectElement;
    rect.setAttribute("x", String(node.x));
    rect.setAttribute("y", String(node.y));
    rect.setAttribute("width", String(node.width));
    rect.setAttribute("height", String(node.height));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", node.fill || "#ffffff");
    rect.setAttribute("stroke", stroke);
    rect.setAttribute("stroke-width", String(strokeWidth));
    return rect;
  }

  private createCircle(node: Node, stroke: string, strokeWidth: number): SVGCircleElement {
    const circle = createSvgElement("circle") as SVGCircleElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const r = Math.min(node.width, node.height) / 2;
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", node.fill || "#ffffff");
    circle.setAttribute("stroke", stroke);
    circle.setAttribute("stroke-width", String(strokeWidth));
    return circle;
  }

  private createDiamond(node: Node, stroke: string, strokeWidth: number): SVGPolygonElement {
    const poly = createSvgElement("polygon") as SVGPolygonElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const hw = node.width / 2;
    const hh = node.height / 2;
    const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
    poly.setAttribute("points", points);
    poly.setAttribute("fill", node.fill || "#ffffff");
    poly.setAttribute("stroke", stroke);
    poly.setAttribute("stroke-width", String(strokeWidth));
    return poly;
  }

  private createEllipse(node: Node, stroke: string, strokeWidth: number): SVGEllipseElement {
    const ellipse = createSvgElement("ellipse") as SVGEllipseElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const rx = node.width / 2;
    const ry = node.height / 2;
    ellipse.setAttribute("cx", String(cx));
    ellipse.setAttribute("cy", String(cy));
    ellipse.setAttribute("rx", String(rx));
    ellipse.setAttribute("ry", String(ry));
    ellipse.setAttribute("fill", node.fill || "#ffffff");
    ellipse.setAttribute("stroke", stroke);
    ellipse.setAttribute("stroke-width", String(strokeWidth));
    return ellipse;
  }
}