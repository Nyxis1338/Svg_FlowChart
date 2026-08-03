import type { Store } from "../store/Store";
import type { DragManager } from "../interaction/DragManager";
import type { Anchor } from "../../types/SvgModel";
import { createSvgElement } from "../../utils/dom";
import { AnchorType } from "../../types/SvgModel";

export class AnchorRenderer {
  constructor(
    private readonly store: Store,
    private readonly dragManager: DragManager,
    private readonly anchorLayer: SVGGElement
  ) {}

  render(): void {
    this.anchorLayer.innerHTML = "";
    const anchors = this.store.getAllAnchors();

    for (const ap of anchors) {
      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;

      const pos = this.store.calcAnchorPosForNode(node, ap);

      const circle = createSvgElement("circle") as SVGCircleElement;
      circle.setAttribute("cx", String(pos.x));
      circle.setAttribute("cy", String(pos.y));
      circle.setAttribute("r", String(ap.radius || 6));
      circle.style.cursor = "crosshair";
      circle.style.transition = "all 0.15s ease-out";   // 平滑高亮过渡
      circle.dataset["anchorId"] = ap.id;

      if (ap.type === AnchorType.PERIMETER) {
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", "transparent");
        circle.setAttribute("fill-opacity", "0");
        circle.setAttribute("r", String((ap.radius || 6) * 2));
      } else {
        circle.setAttribute("fill", ap.fill || "#4285f4");
        circle.setAttribute("stroke", ap.stroke || "#ffffff");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("r", String(ap.radius || 6));
      }

      circle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.dragManager.startLinkDrag(ap, e);
      });

      this.anchorLayer.appendChild(circle);
    }
  }

  highlightAnchor(anchorId: string, highlight: boolean): void {
    const circles = this.anchorLayer.querySelectorAll('circle');
    for (const circle of circles) {
      if (circle.dataset['anchorId'] === anchorId) {
        if (highlight) {
          circle.setAttribute('stroke', '#ff6622');
          circle.setAttribute('stroke-width', '4');
          const currentR = parseFloat(circle.getAttribute('r') || '6');
          circle.setAttribute('r', String(currentR * 1.5));
          circle.style.filter = 'drop-shadow(0 0 6px rgba(255,102,34,0.6))';
        } else {
          const ap = this.store.getAnchor(anchorId);
          if (ap) {
            circle.setAttribute('stroke', ap.stroke || '#ffffff');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', String(ap.radius || 6));
          } else {
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', '6');
          }
          circle.style.filter = 'none';
        }
        break;
      }
    }
  }
}