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

      // ★ 连续锚点不渲染
      if (ap.type === AnchorType.PERIMETER) {
        continue;
      }

      const pos = this.store.calcAnchorPosForNode(node, ap);

      const circle = createSvgElement("circle") as SVGCircleElement;
      circle.setAttribute("cx", String(pos.x));
      circle.setAttribute("cy", String(pos.y));
      // 默认半径 5（可从 ap.radius 读取，但如果没有则用 5）
      const radius = ap.radius ?? 5;
      circle.setAttribute("r", String(radius));
      circle.style.cursor = "crosshair";
      circle.style.transition = "all 0.15s ease-out";
      circle.dataset["anchorId"] = ap.id;

      // ★ 默认样式：白色填充，蓝色边框
      circle.setAttribute("fill", "#ffffff");
      circle.setAttribute("stroke", "#5470c6");
      circle.setAttribute("stroke-width", "2");

      // 如果 ap 中自定义了颜色，可覆盖（但建议统一风格）
      if (ap.fill) circle.setAttribute("fill", ap.fill);
      if (ap.stroke) circle.setAttribute("stroke", ap.stroke);

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
          // ★ 高亮：红色边框，放大，发光阴影
          circle.setAttribute('stroke', '#ff6b6b');
          circle.setAttribute('stroke-width', '3');
          const currentR = parseFloat(circle.getAttribute('r') || '5');
          circle.setAttribute('r', String(currentR * 1.6));
          circle.style.filter = 'drop-shadow(0 0 8px rgba(255,107,107,0.5))';
        } else {
          // ★ 恢复默认
          const ap = this.store.getAnchor(anchorId);
          if (ap) {
            // 使用 ap 中的颜色，否则用默认
            circle.setAttribute('stroke', ap.stroke || '#5470c6');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', String(ap.radius ?? 5));
          } else {
            // 降级
            circle.setAttribute('stroke', '#5470c6');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', '5');
          }
          circle.style.filter = 'none';
        }
        break;
      }
    }
  }
}