import type { SvgFlowChart } from "../SvgFlowChart";
import type { FlowStore } from "../store/FlowStore";
import type { ViewportManager } from "../viewport/ViewportManager";
import type { SvgRenderer } from "../renderer/SvgRenderer";
import type { SelectionManager } from "../selection/SelectionManager";
import type { AnchorPoint, FlowNode } from "../../types/flow-model";
import type { Point } from "../../types/geometry";

export class DragManager {
  private readonly chart: SvgFlowChart;
  // private readonly store: FlowStore;
  // private readonly viewport: ViewportManager;
  // private readonly renderer: SvgRenderer;
  // private readonly selection: SelectionManager;

  // 节点拖拽状态
  private nodeDrag: {
    active: boolean;
    nodeId: string;
    offset: Point;
  } | null = null;

  // ==========【新增】锚点连线拖拽状态 ==========
  private linkDrag: {
    active: boolean;
    sourceAnchorId: string;
    startX: number;
    startY: number;
  } | null = null;

  constructor(chart: SvgFlowChart) {
    this.chart = chart;
    this.bindEvents();
  }

  private get store() { return this.chart.store; }
  private get viewport() { return this.chart.viewport; }
  private get selection() { return this.chart.selection; }
  private get renderer() { return this.chart.renderer; }


  private bindEvents() {
    const svg = this.chart.getSvgRoot();
    svg.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));
  }


private onMouseDown(evt: MouseEvent) {
  const target = evt.target as SVGElement;
  // 命中锚点circle直接跳过节点拖拽逻辑，不再遍历打印undefined
  if (target.tagName === "circle" && target.hasAttribute("data-anchor-id")) {
    return;
  }

  let nodeId: string | undefined;
  console.log("点击元素", target);
  // 向上遍历父级，读取 data-node-id
  let el: SVGElement | null = target;
  while (el && !nodeId) {
    nodeId = el.getAttribute("data-node-id") ?? undefined;
    const parent = el.parentElement;
    if (!parent) break;
    el = parent as unknown as SVGElement;
  }
  console.log("找到nodeId：", nodeId);
  if (!nodeId) return;

  evt.stopPropagation();
  const node = this.store.getNode(nodeId);
  if (!node) return;
  const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });
  this.nodeDrag = {
    active: true,
    nodeId,
    offset: {
      x: canvasPos.x - node.x,
      y: canvasPos.y - node.y
    }
  };
  console.log("开启拖拽", this.nodeDrag);
  this.selection.select("node", nodeId);
}

/** 对外暴露：锚点启动连线拖拽 */
startLinkDrag(anchor: AnchorPoint, evt: MouseEvent) {
  // 空格平移画布时禁止拉连线
  if (this.viewport.isSpaceActive()) return;
  // 现在全部锚点direction=output，此判断不会拦截
  if (anchor.direction !== "output") return;

  console.log("开始拉取连线", anchor.id, anchor.direction);
  const canvasPos = this.viewport.screenToCanvas({
    x: evt.clientX,
    y: evt.clientY
  });
  console.log("锚点基准坐标", canvasPos);

  // 初始化拖拽状态，必须完整赋值
  this.linkDrag = {
    active: true,
    sourceAnchorId: anchor.id,
    startX: canvasPos.x,
    startY: canvasPos.y
  };
  evt.preventDefault();
  // jsPlumb：拖拽开启全局抓取光标
  this.chart.getSvgRoot().style.cursor = "grabbing";
}

private onMouseMove(evt: MouseEvent) {
  console.log("mousemove触发，linkDrag.active=", this.linkDrag?.active, "tempEl存在=", !!this.renderer.getTempLineExists());
  const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });

  // 节点拖拽逻辑
  if (this.nodeDrag?.active) {
    const nodeId = this.nodeDrag.nodeId;
    const newX = canvasPos.x - this.nodeDrag.offset.x;
    const newY = canvasPos.y - this.nodeDrag.offset.y;
    this.store.updateNode(nodeId, { x: newX, y: newY });
  }

  // 【关键】linkDrag.active 存在才绘制临时虚线，打印调试信息
  console.log("linkDrag状态", this.linkDrag, "renderer是否存在", !!this.renderer);
  if (this.linkDrag?.active && this.renderer) {
    const lineData = {
      x1: this.linkDrag.startX,
      y1: this.linkDrag.startY,
      x2: canvasPos.x,
      y2: canvasPos.y
    };
    console.log("虚线绘制坐标", lineData);
    // 调用渲染临时虚线
    this.renderer.setTempLine(lineData);
  }
}

private onMouseUp(evt: MouseEvent) {
  // 拖拽结束强制恢复光标（jsPlumb规范）
  this.chart.getSvgRoot().style.cursor = "";
  // 清空节点拖拽
  this.nodeDrag = null;

  // 连线拖拽完整释放逻辑
  if (this.linkDrag?.active) {
    const hitAnchor = this.queryAnchorUnderMouse(evt);
    const sourceAnchor = this.store.getAnchorPoint(this.linkDrag.sourceAnchorId);
    if (hitAnchor && sourceAnchor) {
      const sourceNode = this.store.getNode(sourceAnchor.nodeId);
      const targetNode = this.store.getNode(hitAnchor.nodeId);
      // 禁止自连接点
      if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        // 查重避免重复连线
        const exist = this.store.getAllConnections().some(c =>
          c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id
        );
        if (!exist) {
          this.store.addConnection({
            id: crypto.randomUUID(),
            connectorType: "flowchart",
            sourceAnchorId: sourceAnchor.id,
            targetAnchorId: hitAnchor.id,
            stroke: "#444444",
            strokeWidth: 2
          });
        }
      }
    }
    // 销毁临时虚线，必须在linkDrag置空前执行
    if (this.renderer) {
      this.renderer.clearTempLine();
    }
    // 最后清空拖拽标记
    this.linkDrag = null;
  }
}

private onKeyDown(evt: KeyboardEvent) {
  // ESC 取消连线拖拽（对标jsPlumb拖拽中断逻辑）
  if (evt.key === "Escape") {
    if (this.linkDrag?.active && this.renderer) {
      this.renderer.clearTempLine();
    }
    this.linkDrag = null;
    // 恢复光标
    this.chart.getSvgRoot().style.cursor = "";
    return;
  }

  // Delete / Backspace 删除逻辑
  if (evt.key !== "Delete" && evt.key !== "Backspace") return;
  const sel = this.selection.getSelection();
  // 锚点、空选中直接拦截
  if (!sel.type || sel.type === "anchorPoint" || !sel.id) return;
  const confirmMsg = sel.type === "node"
    ? "确定删除节点（关联锚点、连线会一并清除）？"
    : "确定删除当前连线？";
  const ok = window.confirm(confirmMsg);
  if (!ok) return;
  if (sel.type === "node") {
    this.store.removeNode(sel.id);
  } else if (sel.type === "connection") {
    this.store.removeConnection(sel.id);
  }
  this.selection.clear();
}








  /**【工具方法】查询鼠标落点下方最近锚点 */
private queryAnchorUnderMouse(evt: MouseEvent): AnchorPoint | undefined {
  const screenPoint = { x: evt.clientX, y: evt.clientY };
  const canvasPoint = this.viewport.screenToCanvas(screenPoint);
  const allAnchors = this.store.getAllAnchorPoints();
  // 吸附半径放大，模拟jsPlumb磁吸
  const hitRadius = 22;
  let closest: AnchorPoint | undefined;
  let minDist = hitRadius;

  for (const ap of allAnchors) {
    const node = this.store.getNode(ap.nodeId);
    if (!node) continue;
    const pos = this.store.calcAnchorPos(node, ap);
    const distance = Math.hypot(canvasPoint.x - pos.x, canvasPoint.y - pos.y);
    if (distance < minDist) {
      minDist = distance;
      closest = ap;
    }
  }
  return closest;
}

  destroy() {
    const svg = this.chart.getSvgRoot();
    svg.removeEventListener("mousedown", this.onMouseDown.bind(this));
    window.removeEventListener("mousemove", this.onMouseMove.bind(this));
    window.removeEventListener("mouseup", this.onMouseUp.bind(this));
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
  }
}