// src/core/renderer/AnchorRenderer.ts

import type { Store } from '../store/Store';
import type { Anchor } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';

export class AnchorRenderer {
  constructor(
    private readonly store: Store,
    private readonly elementLayer: SVGGElement
  ) {}

  // 不再需要 render，因为锚点由 NodeRenderer 绘制
  // render() 可以删除

  highlightAnchor(anchorId: string, highlight: boolean): void {
    // 锚点现在是节点的子元素，需要从 elementLayer 中查找
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
        const dirStyle = Defaults.anchor.directionStyles[ap?.direction ?? 'both'];
        circle.setAttribute('r', String(baseRadius));
        circle.setAttribute('stroke', ap?.stroke ?? dirStyle.stroke);
        circle.setAttribute('fill', ap?.fill ?? dirStyle.fill);
        circle.setAttribute('stroke-width', String(ap?.strokeWidth ?? dirStyle.strokeWidth));
        circle.setAttribute('filter', 'none');
      }
    }
  }
}
