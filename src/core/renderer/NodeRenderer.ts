// src/core/renderer/NodeRenderer.ts

import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Node } from '../../types/SvgModel';
import { createSvgElement } from '../../utils/dom';
import { NodeShape } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';

export class NodeRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly nodeLayer: SVGGElement
  ) {}

  render(): void {
    this.nodeLayer.innerHTML = '';
    const nodes = this.store.getAllNodes();

    for (const node of nodes) {
      const g = createSvgElement('g') as SVGGElement;
      g.setAttribute('data-node-id', node.id);

      const isSelected = this.selection.isSelected('node', node.id);
      const defaultStroke = Defaults.node.stroke;
      const defaultStrokeWidth = Defaults.node.strokeWidth;
      const strokeColor = isSelected ? Defaults.node.selectedStroke : node.stroke || defaultStroke;
      const strokeWidth = isSelected ? Defaults.node.selectedStrokeWidth : node.strokeWidth || defaultStrokeWidth;

      let shapeEl: SVGElement;
      switch (node.shape) {
        case NodeShape.CIRCLE:
          shapeEl = this.createCircle(node, strokeColor, strokeWidth, isSelected);
          break;
        case NodeShape.DIAMOND:
          shapeEl = this.createDiamond(node, strokeColor, strokeWidth, isSelected);
          break;
        case NodeShape.ELLIPSE:
          shapeEl = this.createEllipse(node, strokeColor, strokeWidth, isSelected);
          break;
        default:
          shapeEl = this.createRect(node, strokeColor, strokeWidth, isSelected);
          break;
      }

      g.appendChild(shapeEl);

      if (node.label) {
        const text = createSvgElement('text') as SVGTextElement;
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2 + Defaults.node.labelOffsetY;
        text.setAttribute('x', String(cx));
        text.setAttribute('y', String(cy));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', Defaults.node.labelColor);
        text.setAttribute('font-size', String(Defaults.node.labelFontSize));
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = node.label;
        g.appendChild(text);
      }

      // ✅ 事件绑定已移除，由 EventBus 统一处理
      this.nodeLayer.appendChild(g);
    }
  }

  private createRect(node: Node, stroke: string, strokeWidth: number, isSelected: boolean): SVGRectElement {
    const rect = createSvgElement('rect') as SVGRectElement;
    rect.setAttribute('x', String(node.x));
    rect.setAttribute('y', String(node.y));
    rect.setAttribute('width', String(node.width));
    rect.setAttribute('height', String(node.height));
    rect.setAttribute('rx', String(Defaults.node.rx));
    rect.setAttribute('ry', String(Defaults.node.ry));
    rect.setAttribute('fill', node.fill || Defaults.node.fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', String(strokeWidth));
    rect.setAttribute('filter', isSelected ? Defaults.node.selectedShadowFilter : Defaults.node.shadowFilter);
    return rect;
  }

  private createCircle(node: Node, stroke: string, strokeWidth: number, isSelected: boolean): SVGCircleElement {
    const circle = createSvgElement('circle') as SVGCircleElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const r = Math.min(node.width, node.height) / 2;
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', node.fill || Defaults.node.fill);
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('stroke-width', String(strokeWidth));
    circle.setAttribute('filter', isSelected ? Defaults.node.selectedShadowFilter : Defaults.node.shadowFilter);
    return circle;
  }

  private createDiamond(node: Node, stroke: string, strokeWidth: number, isSelected: boolean): SVGPolygonElement {
    const poly = createSvgElement('polygon') as SVGPolygonElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const hw = node.width / 2;
    const hh = node.height / 2;
    const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
    poly.setAttribute('points', points);
    poly.setAttribute('fill', node.fill || Defaults.node.fill);
    poly.setAttribute('stroke', stroke);
    poly.setAttribute('stroke-width', String(strokeWidth));
    poly.setAttribute('filter', isSelected ? Defaults.node.selectedShadowFilter : Defaults.node.shadowFilter);
    return poly;
  }

  private createEllipse(node: Node, stroke: string, strokeWidth: number, isSelected: boolean): SVGEllipseElement {
    const ellipse = createSvgElement('ellipse') as SVGEllipseElement;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const rx = node.width / 2;
    const ry = node.height / 2;
    ellipse.setAttribute('cx', String(cx));
    ellipse.setAttribute('cy', String(cy));
    ellipse.setAttribute('rx', String(rx));
    ellipse.setAttribute('ry', String(ry));
    ellipse.setAttribute('fill', node.fill || Defaults.node.fill);
    ellipse.setAttribute('stroke', stroke);
    ellipse.setAttribute('stroke-width', String(strokeWidth));
    ellipse.setAttribute('filter', isSelected ? Defaults.node.selectedShadowFilter : Defaults.node.shadowFilter);
    return ellipse;
  }
}
