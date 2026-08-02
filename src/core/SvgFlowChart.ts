// src/core/SvgFlowChart.ts
import { FlowStore } from "./store/FlowStore";
import { ViewportManager } from "./viewport/ViewportManager";
import { SelectionManager } from "./selection/SelectionManager";
import { DragManager } from "./interaction/DragManager";
import { SvgRenderer } from "./renderer/SvgRenderer";

export class SvgFlowChart {
  public readonly svgRoot: SVGSVGElement;
  public readonly store: FlowStore;
  public readonly viewport: ViewportManager;
  public readonly selection: SelectionManager;
  public readonly dragManager: DragManager;
  public readonly renderer: SvgRenderer;

  constructor(container: HTMLElement) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    container.appendChild(svg);
    this.svgRoot = svg;
    this.store = new FlowStore();
    this.viewport = new ViewportManager(this.svgRoot);
    this.selection = new SelectionManager();

    // 顺序调整：先创建 dragManager，再创建 renderer
    this.dragManager = new DragManager(this);
    this.renderer = new SvgRenderer(this);
  }

  // 对外获取svg根
  getSvgRoot(): SVGSVGElement {
    return this.svgRoot;
  }
}