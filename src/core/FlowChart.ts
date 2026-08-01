import { SvgRenderer } from "./renderer/SvgRenderer";
import { FlowStore } from "./store/FlowStore";
import { ViewportManager } from "./viewport/ViewportManager";
import { SelectionManager } from "./selection/SelectionManager";
import { DragManager } from "./interaction/DragManager";
import { EventBus } from "./interaction/EventBus";

export interface FlowChartOptions {
  width?: number;
  height?: number;
}

export class FlowChart {
  public readonly container: HTMLElement;
  public readonly eventBus: EventBus;
  public readonly store: FlowStore;
  public readonly selection: SelectionManager;
  public readonly viewport: ViewportManager;
  public readonly renderer: SvgRenderer;
  public readonly dragManager: DragManager;

  constructor(container: HTMLElement, options: FlowChartOptions = {}) {
    this.container = container;
    this.eventBus = new EventBus();
    this.store = new FlowStore();
    this.selection = new SelectionManager();

    // 修复 createElementNS 必须双参数问题
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.style.width = options.width ? `${options.width}px` : "100%";
    svgEl.style.height = options.height ? `${options.height}px` : "100%";
    container.appendChild(svgEl);

    // 先创建视口，再传入渲染器（消除可选undefined类型警告）
    this.viewport = new ViewportManager(svgEl);

    // 严格匹配 SvgRenderer 5个入参顺序：container, svgRoot, store, selection, viewport
    this.renderer = new SvgRenderer(container, svgEl, this.store, this.selection, this.viewport);

    // 初始化拖拽交互
    this.dragManager = new DragManager(this.store, this.renderer, this.selection, this.viewport);
  }

  destroy(): void {
    this.dragManager.destroy();
    this.renderer.destroy();
    this.eventBus.offAll();
  }
}