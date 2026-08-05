// src/core/renderer/AnchorRenderer.ts

import type { Store } from '../store/Store';
import type { DragManager } from '../interaction/DragManager';
import type { Anchor } from '../../types/SvgModel';
import { createSvgElement } from '../../utils/dom';
import { AnchorType } from '../../types/SvgModel';
import { Defaults } from '../../styles/defaults';

export class AnchorRenderer {
  constructor(
    private readonly store: Store,
    private readonly dragManager: DragManager,
    private readonly anchorLayer: SVGGElement
  ) {}

  render(): void {
    this.anchorLayer.innerHTML = '';
    const anchors = this.store.getAllAnchors();

    for (const ap of anchors) {
      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;

      if (ap.type === AnchorType.CONTINUOUS) {
        continue;
      }

      const pos = this.store.calcAnchorPosForNode(node, ap);

      const circle = createSvgElement('circle') as SVGCircleElement;
      const radius = ap.radius ?? Defaults.anchor.radius;
      circle.setAttribute('cx', String(pos.x));
      circle.setAttribute('cy', String(pos.y));
      circle.setAttribute('r', String(radius));
      circle.style.cursor = 'default';
      circle.style.transition = 'all 0.15s ease-out';
      circle.dataset['anchorId'] = ap.id;

      if (ap.direction === 'output') {
        circle.setAttribute('fill', ap.fill ?? '#ffffff');
        circle.setAttribute('stroke', ap.stroke ?? '#5470c6');
        circle.setAttribute('stroke-width', '2');
      } else if (ap.direction === 'input') {
        circle.setAttribute('fill', ap.fill ?? '#e8f5e9');
        circle.setAttribute('stroke', ap.stroke ?? '#43a047');
        circle.setAttribute('stroke-width', '2');
      } else {
        // both
        circle.setAttribute('fill', ap.fill ?? '#ffffff');
        circle.setAttribute('stroke', ap.stroke ?? '#9c27b0');
        circle.setAttribute('stroke-width', '2');
      }

      // ✅ 事件绑定已移除，由 EventBus 统一处理
      this.anchorLayer.appendChild(circle);
    }
  }

  highlightAnchor(anchorId: string, highlight: boolean): void {
    const circles = this.anchorLayer.querySelectorAll('circle');
    for (const circle of circles) {
      if (circle.dataset['anchorId'] === anchorId) {
        if (highlight) {
          const ap = this.store.getAnchor(anchorId);
          const baseRadius = ap?.radius ?? Defaults.anchor.radius;
          const hoverRadius = baseRadius * Defaults.anchor.hoverRadiusMultiplier;
          circle.setAttribute('r', String(hoverRadius));
          circle.setAttribute('stroke', Defaults.anchor.hoverStroke);
          circle.setAttribute('stroke-width', String(Defaults.anchor.hoverStrokeWidth));
          circle.style.filter = Defaults.anchor.hoverShadow;
        } else {
          const ap = this.store.getAnchor(anchorId);
          const baseRadius = ap?.radius ?? Defaults.anchor.radius;
          circle.setAttribute('r', String(baseRadius));
          if (ap?.direction === 'output') {
            circle.setAttribute('stroke', ap?.stroke ?? '#5470c6');
            circle.setAttribute('fill', ap?.fill ?? '#ffffff');
          } else if (ap?.direction === 'input') {
            circle.setAttribute('stroke', ap?.stroke ?? '#43a047');
            circle.setAttribute('fill', ap?.fill ?? '#e8f5e9');
          } else {
            circle.setAttribute('stroke', ap?.stroke ?? '#9c27b0');
            circle.setAttribute('fill', ap?.fill ?? '#ffffff');
          }
          circle.setAttribute('stroke-width', '2');
          circle.style.filter = 'none';
        }
        break;
      }
    }
  }
}
