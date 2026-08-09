// src/core/renderer/NodeRenderer.ts

import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { Node, Anchor } from '../../types/SvgModel';
import { createSvgElement } from '../../utils/dom';
import { Defaults } from '../../styles/defaults';
import { NodeShape, AnchorType } from '../../types/SvgModel';

export class NodeRenderer {
  constructor(
    private readonly store: Store,
    private readonly selection: SelectionManager,
    private readonly elementLayer: SVGGElement
  ) {}

  render(): void {
    // 不在此清空图层，由 SvgRenderer 统一清空
    const nodes = this.store.getAllNodes();
    // 按 zIndex 升序排序（小的在下层）
    const sorted = [...nodes].sort((a, b) => (a.zIndex ?? 100) - (b.zIndex ?? 100));

    for (const node of sorted) {
      const g = createSvgElement('g') as SVGGElement;
      g.setAttribute('data-node-id', node.id);
      g.dataset['zIndex'] = String(node.zIndex ?? 100);

      // 渲染节点形状
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

      // 渲染标签
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

      // 渲染锚点（作为节点的子元素）
      const anchors = this.store.getNodeAnchors(node.id);
      for (const ap of anchors) {
        if (ap.type === AnchorType.CONTINUOUS) continue; // 连续锚点不可见
        const pos = this.store.calcAnchorPosForNode(node, ap);
        const circle = createSvgElement('circle') as SVGCircleElement;
        const radius = ap.radius ?? Defaults.anchor.radius;
        circle.setAttribute('cx', String(pos.x));
        circle.setAttribute('cy', String(pos.y));
        circle.setAttribute('r', String(radius));
        circle.style.cursor = 'default';
        circle.style.transition = 'all 0.15s ease-out';
        circle.dataset['anchorId'] = ap.id;

        // 从 defaults 读取方向样式
        const dirStyle = Defaults.anchor.directionStyles[ap.direction] || Defaults.anchor.directionStyles.both;
        const fill = ap.fill ?? dirStyle.fill;
        const stroke = ap.stroke ?? dirStyle.stroke;
        const strokeWidthVal = ap.strokeWidth ?? dirStyle.strokeWidth;
        circle.setAttribute('fill', fill);
        circle.setAttribute('stroke', stroke);
        circle.setAttribute('stroke-width', String(strokeWidthVal));
        g.appendChild(circle);
      }

      // 连续锚点标识（如果有）
      const hasContinuous = anchors.some(a => a.type === AnchorType.CONTINUOUS);
      if (hasContinuous) {
        const indicator = this.createContinuousIndicator(node);
        g.appendChild(indicator);
      }

      this.elementLayer.appendChild(g);
    }
  }

  // 连续锚点标识（保持不变）
  private createContinuousIndicator(node: Node): SVGGElement {
    // ... 与之前相同 ...
    const g = createSvgElement('g') as SVGGElement;
    const size = 16;
    const cx = node.x + node.width - 20;
    const cy = node.y + node.height - 20;

    const hitArea = createSvgElement('circle') as SVGCircleElement;
    hitArea.setAttribute('cx', String(cx));
    hitArea.setAttribute('cy', String(cy));
    hitArea.setAttribute('r', '16');
    hitArea.setAttribute('fill', 'transparent');
    hitArea.setAttribute('pointer-events', 'all');
    hitArea.dataset['continuousIndicator'] = 'true';
    g.appendChild(hitArea);

    const circle = createSvgElement('circle') as SVGCircleElement;
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '7');
    circle.setAttribute('fill', 'rgba(84, 112, 198, 0.25)');
    circle.setAttribute('stroke', 'rgba(84, 112, 198, 0.6)');
    circle.setAttribute('stroke-width', '1.5');
    circle.setAttribute('pointer-events', 'none');
    g.appendChild(circle);

    const dot = createSvgElement('circle') as SVGCircleElement;
    dot.setAttribute('cx', String(cx));
    dot.setAttribute('cy', String(cy));
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', 'rgba(84, 112, 198, 0.8)');
    dot.setAttribute('pointer-events', 'none');
    g.appendChild(dot);

    return g;
  }

  // ✅ 补全所有创建方法
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
