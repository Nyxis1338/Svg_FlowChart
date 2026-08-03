import type { SvgFlowChart } from "../SvgFlowChart";
import type { SvgStore } from "../store/SvgStore";
import type { ViewportManager } from "../viewport/ViewportManager";
import type { SvgRenderer } from "../renderer/SvgRenderer";
import type { SelectionManager } from "../selection/SelectionManager";
import type { AnchorPoint, FlowNode, FlowConnection } from "../../types/SvgModel";
import type { Point } from "../../types/geometry";
import { ConnectorType } from "../../types/SvgModel";

/** 拖拽类型 */
type DragType = 'node' | 'link' | 'reconnect';

/** 连线拖拽状态（含重连） */
interface LinkDragState {
  active: boolean;
  type: 'create' | 'reconnect';        // 新建连线 或 重连现有连线
  sourceAnchorId: string;              // 源锚点ID（始终有效）
  startX: number;                      // 起始画布X
  startY: number;                      // 起始画布Y
  connectionId?: string;               // 如果是重连模式，记录原连线ID
  oldTargetAnchorId?: string;          // 如果是重连模式，记录原目标锚点ID（便于取消时恢复）
}

export class DragManager {
  private readonly chart: SvgFlowChart;

  // 节点拖拽状态
  private nodeDrag: {
    active: boolean;
    nodeId: string;
    offset: Point;
  } | null = null;

  // 连线拖拽状态（新建或重连）
  private linkDrag: LinkDragState | null = null;

  // 当前悬停的高亮锚点（用于取消高亮）
  private highlightedAnchor: AnchorPoint | null = null;

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
    // 鼠标离开窗口时自动取消拖拽
    window.addEventListener("blur", this.cancelDrag.bind(this));
  }

  // ==================== 鼠标事件 ====================

  private onMouseDown(evt: MouseEvent) {
    const target = evt.target as SVGElement;

    // 如果点击的是锚点（circle），由锚点自己的事件处理，这里不处理
    if (target.tagName === "circle" && target.hasAttribute("data-anchor-id")) {
      return;
    }

    // 尝试查找节点
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute("data-node-id") ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }

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
        y: canvasPos.y - node.y,
      },
    };
    // 不在此处选中，拖拽结束时再选中
  }

  /**
   * 对外暴露：从锚点启动连线拖拽（新建或重连）
   * @param anchor 起始锚点
   * @param evt 鼠标事件
   * @param existingConnection 如果是重连模式，传入现有连线对象
   */
  startLinkDrag(anchor: AnchorPoint, evt: MouseEvent, existingConnection?: FlowConnection) {
    // 空格平移时禁止拖拽
    if (this.viewport.isSpaceActive()) return;

    const node = this.store.getNode(anchor.nodeId);
    if (!node) return;
    const anchorPos = this.store.calcAnchorPosForNode(node, anchor);
    const isReconnect = !!existingConnection;

    // 如果是重连模式，进行必要校验
    if (isReconnect) {
      const conn = existingConnection!;
      const isSource = conn.sourceAnchorId === anchor.id;
      const isTarget = conn.targetAnchorId === anchor.id;
      if (!isSource && !isTarget) {
        console.warn("尝试重连的锚点不属于该连线");
        return;
      }
      // 目前只支持从目标端重连（更常用）
      if (!isTarget) {
        console.warn("目前只支持从目标端重连");
        return;
      }
    }

    // 初始化拖拽状态
    this.linkDrag = {
      active: true,
      type: isReconnect ? 'reconnect' : 'create',
      sourceAnchorId: anchor.id,
      startX: anchorPos.x,
      startY: anchorPos.y,
      connectionId: existingConnection?.id,
      oldTargetAnchorId: existingConnection?.targetAnchorId,
    };

    evt.preventDefault();
    this.chart.getSvgRoot().style.cursor = "grabbing";
    this.clearHighlight();
  }

  private onMouseMove(evt: MouseEvent) {
    const canvasPos = this.viewport.screenToCanvas({ x: evt.clientX, y: evt.clientY });

    // 节点拖拽逻辑
    if (this.nodeDrag?.active) {
      const nodeId = this.nodeDrag.nodeId;
      const newX = canvasPos.x - this.nodeDrag.offset.x;
      const newY = canvasPos.y - this.nodeDrag.offset.y;
      this.store.updateNode(nodeId, { x: newX, y: newY });
    }

    // 连线拖拽逻辑（新建或重连）
    if (this.linkDrag?.active) {
      // 更新临时虚线（从起始点画到鼠标当前位置）
      this.renderer.setTempLine({
        x1: this.linkDrag.startX,
        y1: this.linkDrag.startY,
        x2: canvasPos.x,
        y2: canvasPos.y,
      });

      // 检测鼠标下是否有可用的目标锚点（排除自身节点）
      const hitAnchor = this.queryAnchorUnderMouse(evt);
      const sourceAnchor = this.store.getAnchorPoint(this.linkDrag.sourceAnchorId);
      const sourceNode = sourceAnchor ? this.store.getNode(sourceAnchor.nodeId) : null;
      const isValidTarget = hitAnchor && sourceNode && this.store.getNode(hitAnchor.nodeId)?.id !== sourceNode.id;

      // 高亮处理
      if (isValidTarget && hitAnchor !== this.highlightedAnchor) {
        this.clearHighlight();
        this.highlightedAnchor = hitAnchor;
        this.renderer.highlightAnchor(hitAnchor.id, true);
      } else if (!isValidTarget && this.highlightedAnchor) {
        this.clearHighlight();
      }
    }
  }

  private onMouseUp(evt: MouseEvent) {
    // 恢复光标
    this.chart.getSvgRoot().style.cursor = "";

    // ---- 处理节点拖拽结束 ----
    if (this.nodeDrag) {
      const nodeId = this.nodeDrag.nodeId;   // 先保存
      this.selection.select("node", nodeId); // 选中节点
      this.nodeDrag = null;                  // 最后清空
    }

    // ---- 处理连线拖拽结束 ----
    if (this.linkDrag?.active) {
      const hitAnchor = this.queryAnchorUnderMouse(evt);
      const sourceAnchor = this.store.getAnchorPoint(this.linkDrag.sourceAnchorId);
      const isReconnect = this.linkDrag.type === 'reconnect';

      let success = false;
      if (hitAnchor && sourceAnchor) {
        const sourceNode = this.store.getNode(sourceAnchor.nodeId);
        const targetNode = this.store.getNode(hitAnchor.nodeId);
        // 禁止自连接
        if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
          if (isReconnect) {
            // 重连模式：更新现有连线
            const connId = this.linkDrag.connectionId;
            if (connId) {
              const conn = this.store.getConnection(connId);
              if (conn) {
                if (conn.targetAnchorId !== hitAnchor.id) {
                  // 查重
                  const exist = this.store.getAllConnections().some(c =>
                    c.id !== connId &&
                    c.sourceAnchorId === sourceAnchor.id &&
                    c.targetAnchorId === hitAnchor.id
                  );
                  if (!exist) {
                    this.store.updateConnection(connId, { targetAnchorId: hitAnchor.id });
                    success = true;
                  } else {
                    console.warn("连线已存在，重连取消");
                  }
                } else {
                  // 目标未变化，视为取消
                  success = false;
                }
              }
            }
          } else {
            // 新建连线
            const exist = this.store.getAllConnections().some(c =>
              c.sourceAnchorId === sourceAnchor.id && c.targetAnchorId === hitAnchor.id
            );
            if (!exist) {
              this.store.addConnection({
                id: crypto.randomUUID(),
                connectorType: ConnectorType.FLOWCHART,
                sourceAnchorId: sourceAnchor.id,
                targetAnchorId: hitAnchor.id,
                stroke: "#444444",
                strokeWidth: 2,
              });
              success = true;
            } else {
              console.warn("连线已存在，创建取消");
            }
          }
        }
      }

      // 如果操作失败，且是重连模式，恢复原目标锚点
      if (!success && isReconnect) {
        const connId = this.linkDrag.connectionId;
        const oldTargetId = this.linkDrag.oldTargetAnchorId;
        if (connId && oldTargetId) {
          this.store.updateConnection(connId, { targetAnchorId: oldTargetId });
        }
      }

      // 清除高亮和临时虚线
      this.clearHighlight();
      this.renderer.clearTempLine();

      // 清空拖拽状态
      this.linkDrag = null;
    }
  }

  // ==================== 键盘事件 ====================

  private onKeyDown(evt: KeyboardEvent) {
    // ESC 取消当前拖拽
    if (evt.key === "Escape") {
      this.cancelDrag();
      return;
    }

    // Delete / Backspace 删除选中的节点或连线
    if (evt.key !== "Delete" && evt.key !== "Backspace") return;
    const sel = this.selection.getSelection();
    if (!sel.type || sel.type === "anchorPoint" || !sel.id) return;

    const confirmMsg = sel.type === "node"
      ? "确定删除节点（关联锚点、连线会一并清除）？"
      : "确定删除当前连线？";
    if (!window.confirm(confirmMsg)) return;

    if (sel.type === "node") {
      this.store.removeNode(sel.id);
    } else if (sel.type === "connection") {
      this.store.removeConnection(sel.id);
    }
    this.selection.clear();
  }

  // ==================== 辅助方法 ====================

  /**
   * 取消当前所有拖拽操作（ESC 或窗口失焦）
   */
  private cancelDrag() {
    // 清除高亮
    this.clearHighlight();
    // 清除临时虚线
    if (this.renderer) {
      this.renderer.clearTempLine();
    }
    // 恢复光标
    this.chart.getSvgRoot().style.cursor = "";

    // 如果是重连模式，恢复原目标锚点
    if (this.linkDrag?.type === 'reconnect' && this.linkDrag.connectionId && this.linkDrag.oldTargetAnchorId) {
      this.store.updateConnection(this.linkDrag.connectionId, { targetAnchorId: this.linkDrag.oldTargetAnchorId });
    }

    // 清空拖拽状态
    this.nodeDrag = null;
    this.linkDrag = null;
  }

  /**
   * 清除当前高亮的锚点
   */
  private clearHighlight() {
    if (this.highlightedAnchor) {
      this.renderer.highlightAnchor(this.highlightedAnchor.id, false);
      this.highlightedAnchor = null;
    }
  }

  /**
   * 查询鼠标下方最近的锚点（磁吸）
   */
  private queryAnchorUnderMouse(evt: MouseEvent): AnchorPoint | undefined {
    const screenPoint = { x: evt.clientX, y: evt.clientY };
    const canvasPoint = this.viewport.screenToCanvas(screenPoint);
    const allAnchors = this.store.getAllAnchorPoints();
    const hitRadius = 22; // 磁吸半径

    let closest: AnchorPoint | undefined;
    let minDist = hitRadius;

    for (const ap of allAnchors) {
      const node = this.store.getNode(ap.nodeId);
      if (!node) continue;
      const pos = this.store.calcAnchorPosForNode(node, ap);
      const distance = Math.hypot(canvasPoint.x - pos.x, canvasPoint.y - pos.y);
      if (distance < minDist) {
        minDist = distance;
        closest = ap;
      }
    }
    return closest;
  }

  // ==================== 销毁清理 ====================

  destroy() {
    const svg = this.chart.getSvgRoot();
    svg.removeEventListener("mousedown", this.onMouseDown.bind(this));
    window.removeEventListener("mousemove", this.onMouseMove.bind(this));
    window.removeEventListener("mouseup", this.onMouseUp.bind(this));
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("blur", this.cancelDrag.bind(this));
    this.cancelDrag();
  }
}