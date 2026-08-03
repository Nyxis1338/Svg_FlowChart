// src/core/store/Store.ts

import type { Point, Rect } from "../../types/geometry";
import type { Anchor, Node, Connection } from "../../types/SvgModel";
import { NodeShape, AnchorType, ConnectorType, AnchorPosition } from "../../types/SvgModel";
import { getContinuousAnchorPair, getStaticAnchor, getPerimeterAnchor, generatePath, generatePathWithOptions } from "../../calc";
import { uuidv4 } from "../../utils/uuid";
import type { StaticAnchorType } from "../../calc/anchor";

type StoreChangeType = "node" | "anchor" | "connection";
type StoreChangeListener = (type: StoreChangeType) => void;
type SelectableType = "node" | "anchor" | "connection" | null;

/**
 * 数据仓库：管理所有节点、锚点、连线，并通知视图更新
 */
export class Store {
  private nodes = new Map<string, Node>();
  private anchors = new Map<string, Anchor>();
  private connections = new Map<string, Connection>();
  private listeners = new Set<StoreChangeListener>();

  subscribe(fn: StoreChangeListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(changeType: StoreChangeType) {
    this.listeners.forEach(fn => fn(changeType));
  }

  // ==================== Node 操作 ====================
  addNode(node: Node) {
    this.nodes.set(node.id, structuredClone(node));
    this.notify("node");
  }

  getNode(nodeId: string): Node | undefined {
    const raw = this.nodes.get(nodeId);
    return raw ? structuredClone(raw) : undefined;
  }

  updateNode(nodeId: string, patch: Partial<Node>) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    Object.assign(node, patch);
    this.notify("node");
  }

  removeNode(nodeId: string) {
    this.nodes.delete(nodeId);
    // 级联删除锚点
    [...this.anchors.values()]
      .filter(a => a.nodeId === nodeId)
      .forEach(a => this.anchors.delete(a.id));
    // 级联删除连线（节点直连模式）
    [...this.connections.values()]
      .filter(c => c.sourceNodeId === nodeId || c.targetNodeId === nodeId)
      .forEach(c => this.connections.delete(c.id));
    this.notify("node");
  }

  getAllNodes(): Node[] {
    return [...this.nodes.values()].map(n => structuredClone(n));
  }

  // ==================== Anchor 操作 ====================
  addAnchor(anchor: Anchor) {
    this.anchors.set(anchor.id, structuredClone(anchor));
    this.notify("anchor");
  }

  getAnchor(anchorId: string): Anchor | undefined {
    const raw = this.anchors.get(anchorId);
    return raw ? structuredClone(raw) : undefined;
  }

  updateAnchor(anchorId: string, patch: Partial<Anchor>) {
    const a = this.anchors.get(anchorId);
    if (!a) return;
    Object.assign(a, patch);
    this.notify("anchor");
  }

  removeAnchor(anchorId: string) {
    this.anchors.delete(anchorId);
    // 删除关联连线
    [...this.connections.values()]
      .filter(c => c.sourceAnchorId === anchorId || c.targetAnchorId === anchorId)
      .forEach(c => this.connections.delete(c.id));
    this.notify("anchor");
  }

  getNodeAnchors(nodeId: string): Anchor[] {
    return [...this.anchors.values()]
      .filter(a => a.nodeId === nodeId)
      .map(a => structuredClone(a));
  }

  getAllAnchors(): Anchor[] {
    return [...this.anchors.values()].map(a => structuredClone(a));
  }

  // 计算锚点坐标（通用）
  calcAnchorPos(nodeRect: Rect, anchor: Anchor): Point {
    if (anchor.type === AnchorType.STATIC && anchor.position) {
      return this.getStaticAnchorPosition(nodeRect, anchor.position, anchor.offset);
    }
    if (anchor.type === AnchorType.PERIMETER) {
      if (anchor.perimeterTotal !== undefined && anchor.perimeterIndex !== undefined) {
        let pt = getPerimeterAnchor(nodeRect, anchor.perimeterTotal, anchor.perimeterIndex);
        if (anchor.offset) {
          pt = { x: pt.x + anchor.offset.x, y: pt.y + anchor.offset.y };
        }
        return pt;
      }
      return { x: nodeRect.x + nodeRect.width / 2, y: nodeRect.y + nodeRect.height / 2 };
    }
    // fallback
    return { x: nodeRect.x + nodeRect.width / 2, y: nodeRect.y + nodeRect.height / 2 };
  }

  // 根据节点形状精确计算锚点位置
  calcAnchorPosForNode(node: Node, anchor: Anchor): Point {
    const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
    if (anchor.type === AnchorType.STATIC && anchor.position) {
      return this.getStaticAnchorPositionWithShape(rect, node.shape, anchor.position, anchor.offset);
    }
    if (anchor.type === AnchorType.PERIMETER) {
      if (anchor.perimeterTotal !== undefined && anchor.perimeterIndex !== undefined) {
        let pt = getPerimeterAnchor(rect, anchor.perimeterTotal, anchor.perimeterIndex);
        if (anchor.offset) {
          pt = { x: pt.x + anchor.offset.x, y: pt.y + anchor.offset.y };
        }
        return pt;
      }
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  // 辅助：根据形状计算静态锚点坐标（带偏移）
  private getStaticAnchorPositionWithShape(
    rect: Rect,
    shape: NodeShape | undefined,
    position: AnchorPosition,
    offset?: Point
  ): Point {
    let pt: Point;
    if (shape === NodeShape.CIRCLE) {
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const r = Math.min(rect.width, rect.height) / 2;
      const angle = this.getAngleForPosition(position);
      pt = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    } else if (shape === NodeShape.ELLIPSE) {
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const rx = rect.width / 2;
      const ry = rect.height / 2;
      const angle = this.getAngleForPosition(position);
      pt = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    } else if (shape === NodeShape.DIAMOND) {
          // 菱形特殊处理：映射到四个顶点和四条边的中点
    pt = this.getDiamondAnchorPosition(rect, position);
    } else {
      // 矩形/菱形：使用矩形边缘计算
      pt = this.getStaticAnchorPosition(rect, position);
    }
    if (offset) {
      pt = { x: pt.x + offset.x, y: pt.y + offset.y };
    }
    return pt;
  }

  // 基础静态锚点位置计算（矩形边缘，不含偏移）
  private getStaticAnchorPosition(rect: Rect, position: AnchorPosition, offset?: Point): Point {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    let pt: Point;
    switch (position) {
      case AnchorPosition.TOP_LEFT: pt = { x: rect.x, y: rect.y }; break;
      case AnchorPosition.TOP: pt = { x: cx, y: rect.y }; break;
      case AnchorPosition.TOP_RIGHT: pt = { x: rect.x + rect.width, y: rect.y }; break;
      case AnchorPosition.RIGHT: pt = { x: rect.x + rect.width, y: cy }; break;
      case AnchorPosition.BOTTOM_RIGHT: pt = { x: rect.x + rect.width, y: rect.y + rect.height }; break;
      case AnchorPosition.BOTTOM: pt = { x: cx, y: rect.y + rect.height }; break;
      case AnchorPosition.BOTTOM_LEFT: pt = { x: rect.x, y: rect.y + rect.height }; break;
      case AnchorPosition.LEFT: pt = { x: rect.x, y: cy }; break;
      default: pt = { x: cx, y: cy };
    }
    if (offset) {
      pt = { x: pt.x + offset.x, y: pt.y + offset.y };
    }
    return pt;
  }

  /**
 * 计算菱形锚点位置
 * 菱形顶点：上(cx, cy-hh), 右(cx+hw, cy), 下(cx, cy+hh), 左(cx-hw, cy)
 * 映射规则：
 *   TOP_LEFT     → 左上边（左-上）的中点
 *   TOP          → 上顶点
 *   TOP_RIGHT    → 右上边（上-右）的中点
 *   RIGHT        → 右顶点
 *   BOTTOM_RIGHT → 右下边（右-下）的中点
 *   BOTTOM       → 下顶点
 *   BOTTOM_LEFT  → 左下边（下-左）的中点
 *   LEFT         → 左顶点
 */
  private getDiamondAnchorPosition(rect: Rect, position: AnchorPosition): Point {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const hw = rect.width / 2;
    const hh = rect.height / 2;

    // 四个顶点
    const top = { x: cx, y: cy - hh };
    const right = { x: cx + hw, y: cy };
    const bottom = { x: cx, y: cy + hh };
    const left = { x: cx - hw, y: cy };

    // 中点函数
    const mid = (p1: Point, p2: Point): Point => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    });

    switch (position) {
      case AnchorPosition.TOP_LEFT:
        return mid(left, top);     // 左上边中点
      case AnchorPosition.TOP:
        return top;                // 上顶点
      case AnchorPosition.TOP_RIGHT:
        return mid(top, right);    // 右上边中点
      case AnchorPosition.RIGHT:
        return right;              // 右顶点
      case AnchorPosition.BOTTOM_RIGHT:
        return mid(right, bottom); // 右下边中点
      case AnchorPosition.BOTTOM:
        return bottom;             // 下顶点
      case AnchorPosition.BOTTOM_LEFT:
        return mid(bottom, left);  // 左下边中点
      case AnchorPosition.LEFT:
        return left;               // 左顶点
      default:
        return { x: cx, y: cy };
    }
  }


  private getAngleForPosition(position: AnchorPosition): number {
    switch (position) {
      case AnchorPosition.TOP_LEFT: return -Math.PI * 0.75;
      case AnchorPosition.TOP: return -Math.PI / 2;
      case AnchorPosition.TOP_RIGHT: return -Math.PI * 0.25;
      case AnchorPosition.RIGHT: return 0;
      case AnchorPosition.BOTTOM_RIGHT: return Math.PI * 0.25;
      case AnchorPosition.BOTTOM: return Math.PI / 2;
      case AnchorPosition.BOTTOM_LEFT: return Math.PI * 0.75;
      case AnchorPosition.LEFT: return Math.PI;
      default: return 0;
    }
  }

  // ==================== Connection 操作 ====================
  addConnection(conn: Connection) {
    if (!conn.connectorType) {
      conn.connectorType = ConnectorType.FLOWCHART;
    }
    this.connections.set(conn.id, structuredClone(conn));
    this.notify("connection");
  }

  getConnection(connId: string): Connection | undefined {
    const raw = this.connections.get(connId);
    return raw ? structuredClone(raw) : undefined;
  }

  removeConnection(connId: string) {
    this.connections.delete(connId);
    this.notify("connection");
  }

  getAllConnections(): Connection[] {
    return [...this.connections.values()].map(c => structuredClone(c));
  }

  updateConnection(connId: string, patch: Partial<Connection>) {
    const conn = this.connections.get(connId);
    if (!conn) return;
    Object.assign(conn, patch);
    this.notify("connection");
  }

  // ==================== 连线路径计算 ====================
  computeConnectionPath(conn: Connection): { start: Point; end: Point; pathD: string } | null {
    if (conn.sourceAnchorId && conn.targetAnchorId) {
      const sourceAnchor = this.getAnchor(conn.sourceAnchorId);
      const targetAnchor = this.getAnchor(conn.targetAnchorId);
      if (!sourceAnchor || !targetAnchor) return null;
      const sourceNode = this.getNode(sourceAnchor.nodeId);
      const targetNode = this.getNode(targetAnchor.nodeId);
      if (!sourceNode || !targetNode) return null;

      const start = this.calcAnchorPosForNode(sourceNode, sourceAnchor);
      const end = this.calcAnchorPosForNode(targetNode, targetAnchor);
      const pathD = generatePathWithOptions(conn.connectorType, start, end, { stub: 45 });
      return { start, end, pathD };
    }

    if (conn.sourceNodeId && conn.targetNodeId) {
      const sourceNode = this.getNode(conn.sourceNodeId);
      const targetNode = this.getNode(conn.targetNodeId);
      if (!sourceNode || !targetNode) return null;
      const { source, target } = getContinuousAnchorPair(sourceNode, targetNode);
      const pathD = generatePath(conn.connectorType, source, target);
      return { start: source, end: target, pathD };
    }
    return null;
  }

  // ==================== 导入/导出 ====================
  exportData() {
    return {
      nodes: this.getAllNodes(),
      anchors: this.getAllAnchors(),
      connections: this.getAllConnections(),
    };
  }

  importData(data: ReturnType<typeof this.exportData>) {
    this.nodes.clear();
    this.anchors.clear();
    this.connections.clear();
    data.nodes.forEach(n => this.addNode(n));
    data.anchors.forEach(a => this.addAnchor(a));
    data.connections.forEach(c => this.addConnection(c));
    this.notify("node");
  }

  deleteSelected(type: SelectableType, id: string) {
    if (type === "node") this.removeNode(id);
    else if (type === "anchor") this.removeAnchor(id);
    else if (type === "connection") this.removeConnection(id);
  }

  // 创建节点并自动生成8个静态锚点（TopLeft, Top, TopRight, Right, BottomRight, Bottom, BottomLeft, Left）
  addNodeWithAnchors(nodeData: Omit<Node, "id">): Node {
    const nodeId = uuidv4();
    const node: Node = {
      ...nodeData,
      id: nodeId,
      shape: nodeData.shape || NodeShape.RECTANGLE,
      fill: nodeData.fill || "#ffffff",
      stroke: nodeData.stroke || "#5588dd",
      strokeWidth: nodeData.strokeWidth || 2,
    };
    this.addNode(node);

    const positions: AnchorPosition[] = [
      AnchorPosition.TOP_LEFT,
      AnchorPosition.TOP,
      AnchorPosition.TOP_RIGHT,
      AnchorPosition.RIGHT,
      AnchorPosition.BOTTOM_RIGHT,
      AnchorPosition.BOTTOM,
      AnchorPosition.BOTTOM_LEFT,
      AnchorPosition.LEFT,
    ];
    // 方向分布：上排 output，右排 output，下排 input，左排 input
    const directions: ('input' | 'output')[] = [
      'output', 'output', 'output',
      'output',
      'input', 'input', 'input',
      'input'
    ];
    positions.forEach((pos, idx) => {
      const anchor: Anchor = {
        id: uuidv4(),
        nodeId,
        type: AnchorType.STATIC,
        position: pos,
        direction: directions[idx % directions.length],
        radius: 7,
        fill: "#4285f4",
        stroke: "#ffffff",
        offset: { x: 0, y: 0 },
      };
      this.addAnchor(anchor);
    });

    this.notify("node");
    return node;
  }
}