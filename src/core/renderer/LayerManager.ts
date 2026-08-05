// src/core/renderer/LayerManager.ts

import { createSvgElement } from '../../utils/dom';

export class LayerManager {
  public readonly rootGroup: SVGGElement;
  public readonly bgLayer: SVGGElement;
  public readonly connectionLayer: SVGGElement;
  public readonly nodeLayer: SVGGElement;
  public readonly anchorLayer: SVGGElement;

  constructor(parent: SVGSVGElement) {
    this.rootGroup = createSvgElement('g') as SVGGElement;
    this.bgLayer = createSvgElement('g') as SVGGElement;
    this.connectionLayer = createSvgElement('g') as SVGGElement;
    this.nodeLayer = createSvgElement('g') as SVGGElement;
    this.anchorLayer = createSvgElement('g') as SVGGElement;

    // ✅ 图层顺序：节点 → 连线 → 锚点（后添加的在上层）
    this.rootGroup.append(this.bgLayer, this.nodeLayer, this.connectionLayer, this.anchorLayer);
    parent.appendChild(this.rootGroup);
  }

  destroy(): void {
    this.rootGroup.remove();
  }
}
