// src/core/renderer/NodeRenderer.ts

import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Node } from '../../types/SvgModel';
import { createSvgElement } from '../../utils/dom';
import { Defaults } from '../../styles/defaults';

export class NodeRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly elementLayer: SVGGElement
  ) {}

  render(): void {
    const nodes = this.store.getAllNodes();
    const sorted = [...nodes].sort((a, b) => (a.zIndex ?? Defaults.zIndexBase) - (b.zIndex ?? Defaults.zIndexBase));

    for (const node of sorted) {
      const nodeZ = node.zIndex ?? Defaults.zIndexBase;

      // ---- 节点组 ----
      const g = createSvgElement('g') as SVGGElement;
      g.setAttribute('data-node-id', node.id);
      g.dataset['zIndex'] = String(nodeZ);

      const isSelected = this.selection.isSelected('node', node.id);
      const defaultStroke = Defaults.node.stroke;
      const defaultStrokeWidth = Defaults.node.strokeWidth;
      const strokeColor = isSelected ? Defaults.node.selectedStroke : node.stroke || defaultStroke;
      const strokeWidth = isSelected ? Defaults.node.selectedStrokeWidth : node.strokeWidth || defaultStrokeWidth;

      let shapeEl: SVGElement;
      switch (node.shape) {
        case 'circle':
          shapeEl = this.createCircle(node, strokeColor, strokeWidth, isSelected);
          break;
        case 'diamond':
          shapeEl = this.createDiamond(node, strokeColor, strokeWidth, isSelected);
          break;
        case 'ellipse':
          shapeEl = this.createEllipse(node, strokeColor, strokeWidth, isSelected);
          break;
        default:
          shapeEl = this.createRect(node, strokeColor, strokeWidth, isSelected);
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

      this.elementLayer.appendChild(g);

      // ---- 锚点（独立添加，zIndex 比节点高 1） ----
      const anchors = this.store.getNodeAnchors(node.id);
      for (const ap of anchors) {
        const pos = this.store.calcAnchorPosForNode(node, ap);
        const circle = createSvgElement('circle') as SVGCircleElement;
        const radius = ap.radius ?? Defaults.anchor.radius;
        circle.setAttribute('cx', String(pos.x));
        circle.setAttribute('cy', String(pos.y));
        circle.setAttribute('r', String(radius));
        circle.style.cursor = 'default';
        circle.style.transition = 'all 0.15s ease-out';
        circle.dataset['anchorId'] = ap.id;
        circle.dataset['zIndex'] = String(nodeZ + 1);
        circle.dataset['nodeId'] = node.id;

        circle.setAttribute('fill', ap.fill ?? Defaults.anchor.fill);
        circle.setAttribute('stroke', ap.stroke ?? Defaults.anchor.stroke);
        circle.setAttribute('stroke-width', String(ap.strokeWidth ?? Defaults.anchor.strokeWidth));
        this.elementLayer.appendChild(circle);
      }
    }
  }

  /**
   * 高亮/取消高亮锚点（用于拖拽悬停反馈）
   */
  highlightAnchor(anchorId: string, highlight: boolean): void {
    const circles = this.elementLayer.querySelectorAll(`circle[data-anchor-id="${anchorId}"]`);
    for (const circle of circles) {
      const ap = this.store.getAnchor(anchorId);
      const baseRadius = ap?.radius ?? Defaults.anchor.radius;

      if (highlight) {
        const hoverRadius = baseRadius * Defaults.anchor.hoverRadiusMultiplier;
        circle.setAttribute('r', String(hoverRadius));
        circle.setAttribute('stroke', Defaults.anchor.hoverStroke);
        circle.setAttribute('stroke-width', String(Defaults.anchor.hoverStrokeWidth));
        circle.setAttribute('filter', Defaults.anchor.hoverShadow);
      } else {
        circle.setAttribute('r', String(baseRadius));
        circle.setAttribute('stroke', ap?.stroke ?? Defaults.anchor.stroke);
        circle.setAttribute('fill', ap?.fill ?? Defaults.anchor.fill);
        circle.setAttribute('stroke-width', String(ap?.strokeWidth ?? Defaults.anchor.strokeWidth));
        circle.setAttribute('filter', 'none');
      }
    }
  }

  // ---- 节点形状创建方法 ----
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
