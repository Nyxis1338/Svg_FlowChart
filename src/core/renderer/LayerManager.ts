// src/core/renderer/LayerManager.ts

import { createSvgElement } from '../../utils/dom';

export class LayerManager {
  public readonly rootGroup: SVGGElement;
  public readonly bgLayer: SVGGElement;
  public readonly elementLayer: SVGGElement; // 所有正式元素（节点+连线+锚点）统一放在这里
  public readonly tempLayer: SVGGElement; // 临时线（拖拽时显示，在最上层）

  constructor(parent: SVGGElement) {
    this.rootGroup = createSvgElement('g') as SVGGElement;
    this.bgLayer = createSvgElement('g') as SVGGElement;
    this.elementLayer = createSvgElement('g') as SVGGElement;
    this.tempLayer = createSvgElement('g') as SVGGElement;

    // 图层顺序：背景 → 正式元素 → 临时线
    this.rootGroup.append(this.bgLayer, this.elementLayer, this.tempLayer);
    parent.appendChild(this.rootGroup);
  }

  destroy(): void {
    this.rootGroup.remove();
  }
}
