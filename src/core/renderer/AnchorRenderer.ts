// src/core/renderer/AnchorRenderer.ts

import type { Store } from '../store/Store';
import type { Anchor } from '../../types/SvgModel';
import { createSvgElement } from '../../utils/dom';
import { Defaults } from '../../styles/defaults';

export class AnchorRenderer {
  constructor(
    private readonly store: Store,
    private readonly elementLayer: SVGGElement
  ) {}

  render(): void {
    // 清空由 SvgRenderer 统一处理，这里直接添加
    const anchors = this.store.getAllAnchors();
    for (const ap of anchors) {
      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;

      const pos = this.store.calcAnchorPosForNode(node, ap);
      const circle = createSvgElement('circle') as SVGCircleElement;
      const radius = ap.radius ?? Defaults.anchor.radius;
      circle.setAttribute('cx', String(pos.x));
      circle.setAttribute('cy', String(pos.y));
      circle.setAttribute('r', String(radius));
      circle.style.cursor = 'default';
      circle.style.transition = 'all 0.15s ease-out';
      circle.dataset['anchorId'] = ap.id;

      const dirStyle = Defaults.anchor.directionStyles[ap.direction] || Defaults.anchor.directionStyles.both;
      circle.setAttribute('fill', ap.fill ?? dirStyle.fill);
      circle.setAttribute('stroke', ap.stroke ?? dirStyle.stroke);
      circle.setAttribute('stroke-width', String(ap.strokeWidth ?? dirStyle.strokeWidth));

      this.elementLayer.appendChild(circle);
    }
  }

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
