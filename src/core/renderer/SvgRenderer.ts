import type { SvgEngine } from "../SvgEngine";
import type { ViewportManager } from "../viewport/ViewportManager";
import { LayerManager } from "./LayerManager";
import { NodeRenderer } from "./NodeRenderer";
import { AnchorRenderer } from "./AnchorRenderer";
import { ConnectionRenderer } from "./ConnectionRenderer";
import { DragManager } from "../interaction/DragManager";
import type { SelectionManager } from "../selection/SelectionManager";
import { createContextMenu, createMenuItem, createSvgElement } from "../../utils/dom";
import { NodeShape } from "../../types/SvgModel";

export class SvgRenderer {
  private readonly chart: SvgEngine;
  private readonly svgRoot: SVGSVGElement;
  private readonly viewport: ViewportManager;
  private readonly dragManager: DragManager;
  private readonly selection: SelectionManager;

  private layerManager: LayerManager;
  private nodeRenderer: NodeRenderer;
  private anchorRenderer: AnchorRenderer;
  private connectionRenderer: ConnectionRenderer;

  private tempLineGroup: SVGGElement | null = null;   // 容纳临时连线和端点
  private tempLineEl: SVGPathElement | null = null;
  private tempDotEl: SVGCircleElement | null = null;

  private contextMenu: HTMLDivElement;

  constructor(chart: SvgEngine) {
    this.chart = chart;
    this.svgRoot = chart.getSvgRoot();
    this.viewport = chart.viewport;
    this.dragManager = chart.dragManager;
    this.selection = chart.selection;

    this.layerManager = new LayerManager(this.svgRoot);
    this.nodeRenderer = new NodeRenderer(
      this.chart.store,
      this.selection,
      this.layerManager.nodeLayer
    );
    this.anchorRenderer = new AnchorRenderer(
      this.chart.store,
      this.dragManager,
      this.layerManager.anchorLayer
    );
    this.connectionRenderer = new ConnectionRenderer(
      this.chart.store,
      this.selection,
      this.layerManager.connectionLayer
    );

    this.contextMenu = createContextMenu();
    document.body.appendChild(this.contextMenu);

    this.svgRoot.addEventListener("contextmenu", this.onContextMenu.bind(this));
    document.addEventListener("mousedown", this.hideContextMenu.bind(this));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hideContextMenu();
    });
    this.svgRoot.addEventListener("mousedown", () => {
      this.selection.clear();
    });

    this.chart.store.subscribe(() => this.renderAll());
    this.selection.subscribe(() => this.renderAll());
  }

  renderAll(): void {
    this.connectionRenderer.render();
    this.anchorRenderer.render();
    this.nodeRenderer.render();
  }

  // 临时连线（带端点圆点，半透明灰色）
  setTempLine(pos: { x1: number; y1: number; x2: number; y2: number }): void {
    if (!this.tempLineGroup) {
      this.tempLineGroup = createSvgElement("g") as SVGGElement;
      this.tempLineGroup.setAttribute("pointer-events", "none");

      this.tempLineEl = createSvgElement("path") as SVGPathElement;
      this.tempLineEl.setAttribute("stroke", "rgba(150,150,150,0.7)");
      this.tempLineEl.setAttribute("stroke-width", "2.5");
      this.tempLineEl.setAttribute("fill", "none");
      this.tempLineEl.setAttribute("stroke-dasharray", "8 4");
      this.tempLineGroup.appendChild(this.tempLineEl);

      this.tempDotEl = createSvgElement("circle") as SVGCircleElement;
      this.tempDotEl.setAttribute("r", "6");
      this.tempDotEl.setAttribute("fill", "rgba(150,150,150,0.5)");
      this.tempDotEl.setAttribute("stroke", "none");
      this.tempLineGroup.appendChild(this.tempDotEl);

      this.layerManager.connectionLayer.appendChild(this.tempLineGroup);
    }

    this.tempLineEl!.setAttribute("d", `M${pos.x1} ${pos.y1} L${pos.x2} ${pos.y2}`);
    this.tempDotEl!.setAttribute("cx", String(pos.x2));
    this.tempDotEl!.setAttribute("cy", String(pos.y2));
  }

  clearTempLine(): void {
    if (this.tempLineGroup) {
      this.tempLineGroup.remove();
      this.tempLineGroup = null;
      this.tempLineEl = null;
      this.tempDotEl = null;
    }
  }

  getTempLineExists(): boolean {
    return !!this.tempLineGroup;
  }

  highlightAnchor(anchorId: string, highlight: boolean): void {
    this.anchorRenderer.highlightAnchor(anchorId, highlight);
  }

  // 右键菜单（保持不变）
  private onContextMenu(evt: MouseEvent): void { /* ... 原有逻辑 ... */ }
  private hideContextMenu(): void { /* ... */ }
  destroy(): void { /* ... */ }
}