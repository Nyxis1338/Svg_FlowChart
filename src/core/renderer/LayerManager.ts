// src/core/renderer/LayerManager.ts

import { createSvgElement } from '../../utils/dom';

export class LayerManager {
  public readonly rootGroup: SVGGElement;
  public readonly bgLayer: SVGGElement;
  public readonly elementLayer: SVGGElement;
  public readonly tempLayer: SVGGElement;

  constructor(parent: SVGGElement) {
    this.rootGroup = createSvgElement('g') as SVGGElement;
    this.bgLayer = createSvgElement('g') as SVGGElement;
    this.elementLayer = createSvgElement('g') as SVGGElement;
    this.tempLayer = createSvgElement('g') as SVGGElement;
    this.rootGroup.append(this.bgLayer, this.elementLayer, this.tempLayer);
    parent.appendChild(this.rootGroup);
  }

  destroy(): void {
    this.rootGroup.remove();
  }
}
