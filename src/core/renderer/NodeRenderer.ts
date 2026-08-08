// src/core/renderer/NodeRenderer.ts

import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Node } from '../../types/SvgModel';
import { createSvgElement } from '../../utils/dom';
import { Defaults } from '../../styles/defaults';
import { NodeShape, AnchorType } from '../../types/SvgModel';

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

      const anchors = this.store.getNodeAnchors(node.id);
      const hasContinuous = anchors.some(a => a.type === AnchorType.CONTINUOUS);
      if (hasContinuous) {
        const indicator = this.createContinuousIndicator(node);
        g.appendChild(indicator);
      }

      // 事件绑定已由 EventBus 统一处理
      this.nodeLayer.appendChild(g);
    }
  }

  // 新增方法：创建连续锚点标识（半透明）
  private createContinuousIndicator(node: Node): SVGGElement {
    const g = createSvgElement('g') as SVGGElement;
    const size = 16; // 稍微大一点便于点击
    const cx = node.x + node.width - 20;
    const cy = node.y + node.height - 20;

    // 透明点击区域（半径 16，足够大）
    const hitArea = createSvgElement('circle') as SVGCircleElement;
    hitArea.setAttribute('cx', String(cx));
    hitArea.setAttribute('cy', String(cy));
    hitArea.setAttribute('r', '16');
    hitArea.setAttribute('fill', 'transparent');
    hitArea.setAttribute('pointer-events', 'all');
    hitArea.dataset['continuousIndicator'] = 'true';
    g.appendChild(hitArea);

    // 视觉圆圈（半透明）
    const circle = createSvgElement('circle') as SVGCircleElement;
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '7');
    circle.setAttribute('fill', 'rgba(84, 112, 198, 0.25)');
    circle.setAttribute('stroke', 'rgba(84, 112, 198, 0.6)');
    circle.setAttribute('stroke-width', '1.5');
    circle.setAttribute('pointer-events', 'none');
    g.appendChild(circle);

    // 内部小点
    const dot = createSvgElement('circle') as SVGCircleElement;
    dot.setAttribute('cx', String(cx));
    dot.setAttribute('cy', String(cy));
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', 'rgba(84, 112, 198, 0.8)');
    dot.setAttribute('pointer-events', 'none');
    g.appendChild(dot);

    return g;
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
