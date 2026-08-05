// src/core/renderer/LayerManager.ts

import { createSvgElement } from '../../utils/dom';

export class LayerManager {
  public readonly bgLayer: SVGGElement;
  public readonly connectionLayer: SVGGElement;
  public readonly nodeLayer: SVGGElement;
  public readonly anchorLayer: SVGGElement;

  constructor(parent: SVGGElement) {
    this.bgLayer = createSvgElement('g') as SVGGElement;
    this.connectionLayer = createSvgElement('g') as SVGGElement;
    this.nodeLayer = createSvgElement('g') as SVGGElement;
    this.anchorLayer = createSvgElement('g') as SVGGElement;

    // 图层顺序：bgLayer (网格背景) -> nodeLayer -> connectionLayer -> anchorLayer
    // 注意：ViewportManager 已经添加了 gridLayer，它会通过 prepend 放在最前，
    // 所以这里 append 的图层会在 gridLayer 之上。
    parent.append(this.bgLayer, this.nodeLayer, this.connectionLayer, this.anchorLayer);
  }

  destroy(): void {
    this.bgLayer.remove();
    this.nodeLayer.remove();
    this.connectionLayer.remove();
    this.anchorLayer.remove();
  }
}
