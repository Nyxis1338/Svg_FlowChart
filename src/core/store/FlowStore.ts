import type { Point, Rect } from "../../types/geometry";
import type { AnchorPoint, FlowNode, FlowConnection } from "../../types/flow-model";
import { getContinuousAnchorPair, getStaticAnchor, getPerimeterAnchor, generatePath, ConnectorMode } from "../../calc";
import { uuidv4 } from "../../utils/uuid";
import type { StaticAnchorType } from "../../calc/anchor";


type StoreChangeType = "node" | "anchorPoint" | "connection";
type StoreChangeListener = (type: StoreChangeType) => void;
type SelectableType = "node" | "anchorPoint" | "connection" | null;

/**
 * 流程图状态仓库
 */
export class FlowStore {
  // 数据集
  private nodes = new Map<string, FlowNode>();
  private anchorPoints = new Map<string, AnchorPoint>();
  private connections = new Map<string, FlowConnection>();

  // 变更监听（渲染层订阅，数据变动自动刷新SVG）
  private listeners = new Set<StoreChangeListener>();

  // ===================== 订阅系统 =====================
  subscribe(fn: StoreChangeListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(changeType: StoreChangeType) {
    this.listeners.forEach(fn => fn(changeType));
  }

  // ===================== Node 节点操作 =====================
  addNode(node: FlowNode) {
    this.nodes.set(node.id, structuredClone(node));
    this.notify("node");
  }

  getNode(nodeId: string): FlowNode | undefined {
    const raw = this.nodes.get(nodeId);
    return raw ? structuredClone(raw) : undefined;
  }

  updateNode(nodeId: string, patch: Partial<FlowNode>) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    Object.assign(node, patch);
    this.notify("node");
  }

  removeNode(nodeId: string) {
    this.nodes.delete(nodeId);

    // 级联删除：节点所属锚点
    [...this.anchorPoints.values()]
      .filter(ap => ap.nodeId === nodeId)
      .forEach(ap => this.anchorPoints.delete(ap.id));

    // 级联删除：相关连线
    [...this.connections.values()]
      .filter(c => {
        const srcNode = c.sourceNodeId === nodeId;
        const tgtNode = c.targetNodeId === nodeId;
        return srcNode || tgtNode;
      })
      .forEach(c => this.connections.delete(c.id));

    this.notify("node");
  }

  getAllNodes(): FlowNode[] {
    return [...this.nodes.values()].map(n => structuredClone(n));
  }

  // ===================== AnchorPoint（端点+锚点合并实体） =====================
  addAnchorPoint(ap: AnchorPoint) {
    this.anchorPoints.set(ap.id, structuredClone(ap));
    this.notify("anchorPoint");
  }

  getAnchorPoint(apId: string): AnchorPoint | undefined {
    const raw = this.anchorPoints.get(apId);
    return raw ? structuredClone(raw) : undefined;
  }

  updateAnchorPoint(apId: string, patch: Partial<AnchorPoint>) {
    const ap = this.anchorPoints.get(apId);
    if (!ap) return;
    Object.assign(ap, patch);
    this.notify("anchorPoint");
  }

  removeAnchorPoint(apId: string) {
    this.anchorPoints.delete(apId);
    // 删除所有关联此锚点的连线
    [...this.connections.values()]
      .filter(c => c.sourceAnchorId === apId || c.targetAnchorId === apId)
      .forEach(c => this.connections.delete(c.id));
    this.notify("anchorPoint");
  }

  getNodeAnchorPoints(nodeId: string): AnchorPoint[] {
    return [...this.anchorPoints.values()]
      .filter(ap => ap.nodeId === nodeId)
      .map(ap => structuredClone(ap));
  }

  getAllAnchorPoints(): AnchorPoint[] {
    return [...this.anchorPoints.values()].map(ap => structuredClone(ap));
  }

  // 【核心计算】根据节点包围盒，求解AnchorPoint实时坐标
  calcAnchorPos(nodeRect: Rect, ap: AnchorPoint): Point {
    if (ap.anchorMode === "static") {
      const pt = getStaticAnchor(nodeRect, ap.staticType!, ap.offset);
      return pt;
    }
    if (ap.anchorMode === "perimeter") {
      let pt = getPerimeterAnchor(nodeRect, ap.perimeterTotal!, ap.perimeterIndex!);
      if (ap.offset) {
        pt = { x: pt.x + ap.offset.x, y: pt.y + ap.offset.y };
      }
      return pt;
    }
    return { x: 0, y: 0 };
  }

  // ===================== Connection 连线 =====================
  addConnection(conn: FlowConnection) {
    this.connections.set(conn.id, structuredClone(conn));
    this.notify("connection");
  }

  getConnection(connId: string): FlowConnection | undefined {
    const raw = this.connections.get(connId);
    return raw ? structuredClone(raw) : undefined;
  }

  removeConnection(connId: string) {
    this.connections.delete(connId);
    this.notify("connection");
  }

  getAllConnections(): FlowConnection[] {
    return [...this.connections.values()].map(c => structuredClone(c));
  }


  updateConnection(connId: string, patch: Partial<FlowConnection>) {
    const conn = this.connections.get(connId);
    if (!conn) return;
    Object.assign(conn, patch);
    this.notify("connection");
  }

  // ===================== 最重要方法：求解一条连线的起止坐标 + SVG Path字符串 =====================
  /**
   * 输入一条连线，自动识别两种模式，计算起点、终点、pathD
   */
  computeConnectionPath(conn: FlowConnection): {
    start: Point;
    end: Point;
    pathD: string;
  } | null {
    // 模式1：锚点之间连线 sourceAnchorId / targetAnchorId
    if (conn.sourceAnchorId && conn.targetAnchorId) {
      const sourceAp = this.getAnchorPoint(conn.sourceAnchorId);
      const targetAp = this.getAnchorPoint(conn.targetAnchorId);
      if (!sourceAp || !targetAp) return null;

      const sourceNode = this.getNode(sourceAp.nodeId);
      const targetNode = this.getNode(targetAp.nodeId);
      if (!sourceNode || !targetNode) return null;

      const start = this.calcAnchorPos(sourceNode, sourceAp);
      const end = this.calcAnchorPos(targetNode, targetAp);
      const pathD = generatePath(conn.connectorType, start, end);
      return { start, end, pathD };
    }

    // 模式2：节点直连 Continuous 动态锚点
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

  // ===================== 序列化/导入导出（持久化） =====================
  exportData() {
    return {
      nodes: this.getAllNodes(),
      anchorPoints: this.getAllAnchorPoints(),
      connections: this.getAllConnections(),
    };
  }

  importData(data: ReturnType<typeof this.exportData>) {
    this.nodes.clear();
    this.anchorPoints.clear();
    this.connections.clear();

    data.nodes.forEach(n => this.addNode(n));
    data.anchorPoints.forEach(ap => this.addAnchorPoint(ap));
    data.connections.forEach(c => this.addConnection(c));
    this.notify("node");
  }

    /**
   根据选中类型删除元素，自动级联清理
   */
  deleteSelected(type: SelectableType, id: string) {
    if (type === "node") {
      this.removeNode(id);
    } else if (type === "anchorPoint") {
      this.removeAnchorPoint(id);
    } else if (type === "connection") {
      this.removeConnection(id);
    }
  }

  /** 创建节点并自动生成上下左右4个锚点 */
  addNodeWithAnchors(nodeData: Omit<FlowNode, "id">) {
    const nodeId = uuidv4();
    // 修复：先构造完整对象再传
    const node: FlowNode = Object.assign({}, nodeData, { id: nodeId });
    this.addNode(node);

    // 自动生成4向锚点
    const anchorTypes: StaticAnchorType[] = ["Top", "Right", "Bottom", "Left"];
    anchorTypes.forEach(dir => {
      const anchor: AnchorPoint = {
        id: uuidv4(),
        nodeId,
        anchorMode: "static",
        staticType: dir,
        direction: dir === "Left" || dir === "Right" ? "input" : "output",
        radius: 6
      };
      this.addAnchorPoint(anchor);
    });

    this.notify("node");
    return node;
  }

}