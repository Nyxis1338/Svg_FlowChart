// src/core/store/Store.ts

import type { Point, Rect } from '../../types/geometry';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import { NodeShape, AnchorType, ConnectorType, AnchorPosition } from '../../types/SvgModel';
import { getContinuousAnchorPair } from '../../calc';
import { uuidv4 } from '../../utils/uuid';
import { Defaults } from '../../styles/defaults';

// ==================== 类型定义 ====================
type StoreChangeType = 'node' | 'anchor' | 'connection';
type StoreChangeListener = (type: StoreChangeType) => void;
type SelectableType = 'node' | 'anchor' | 'connection' | null;

export interface StoreData {
  nodes: Node[];
  anchors: Anchor[];
  connections: Connection[];
}

// ==================== Store 类 ====================
export class Store {
  private nodes = new Map<string, Node>();
  private anchors = new Map<string, Anchor>();
  private connections = new Map<string, Connection>();
  private listeners = new Set<StoreChangeListener>();

  // ---- 订阅 ----
  subscribe(fn: StoreChangeListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(changeType: StoreChangeType) {
    this.listeners.forEach(fn => fn(changeType));
  }

  // ---- Node 操作 ----
  addNode(node: Node): Node {
    this.nodes.set(node.id, structuredClone(node));
    this.notify('node');
    return node;
  }

  getNode(nodeId: string): Node | undefined {
    const raw = this.nodes.get(nodeId);
    return raw ? structuredClone(raw) : undefined;
  }

  updateNode(nodeId: string, patch: Partial<Node>): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    Object.assign(node, patch);
    this.notify('node');
  }

  removeNode(nodeId: string): void {
    // 1. 先删除所有锚点（同时删除关联连线）
    this.removeAllAnchors(nodeId);
    // 2. 删除节点本身
    this.nodes.delete(nodeId);
    // 3. 删除节点直连模式的连线（如果有）
    for (const [id, c] of this.connections) {
      if (c.sourceNodeId === nodeId || c.targetNodeId === nodeId) {
        this.connections.delete(id);
      }
    }
    this.notify('node');
  }

  getAllNodes(): Node[] {
    return [...this.nodes.values()].map(n => structuredClone(n));
  }

  // ---- Anchor 操作 ----
  addAnchor(anchor: Anchor): Anchor {
    this.anchors.set(anchor.id, structuredClone(anchor));
    this.notify('anchor');
    return anchor;
  }

  getAnchor(anchorId: string): Anchor | undefined {
    const raw = this.anchors.get(anchorId);
    return raw ? structuredClone(raw) : undefined;
  }

  updateAnchor(anchorId: string, patch: Partial<Anchor>): void {
    const a = this.anchors.get(anchorId);
    if (!a) return;
    Object.assign(a, patch);
    this.notify('anchor');
  }

  removeAnchor(anchorId: string): void {
    this.anchors.delete(anchorId);
    // 删除关联连线
    for (const [id, c] of this.connections) {
      if (c.sourceAnchorId === anchorId || c.targetAnchorId === anchorId) {
        this.connections.delete(id);
      }
    }
    this.notify('anchor');
  }
  /**
   * 删除节点的所有锚点（同时删除关联连线）
   */
  removeAllAnchors(nodeId: string): void {
    // 获取该节点的所有锚点
    const nodeAnchors = this.getNodeAnchors(nodeId);
    for (const anchor of nodeAnchors) {
      // removeAnchor 会删除关联连线
      this.removeAnchor(anchor.id);
    }
  }
  getNodeAnchors(nodeId: string): Anchor[] {
    return [...this.anchors.values()].filter(a => a.nodeId === nodeId).map(a => structuredClone(a));
  }

  getAllAnchors(): Anchor[] {
    return [...this.anchors.values()].map(a => structuredClone(a));
  }

  // ---- Connection 操作 ----
  addConnection(conn: Connection): Connection {
    // 校验锚点是否存在
    if (conn.sourceAnchorId && !this.getAnchor(conn.sourceAnchorId)) {
      console.error(`源锚点 ${conn.sourceAnchorId} 不存在，连线创建失败`);
      return conn; // 或者抛出错误
    }
    if (conn.targetAnchorId && !this.getAnchor(conn.targetAnchorId)) {
      console.error(`目标锚点 ${conn.targetAnchorId} 不存在，连线创建失败`);
      return conn;
    }
    if (!conn.connectorType) {
      conn.connectorType = ConnectorType.FLOWCHART;
    }
    this.connections.set(conn.id, structuredClone(conn));
    this.notify('connection');
    return conn;
  }

  getConnection(connId: string): Connection | undefined {
    const raw = this.connections.get(connId);
    return raw ? structuredClone(raw) : undefined;
  }

  removeConnection(connId: string): void {
    this.connections.delete(connId);
    this.notify('connection');
  }

  getAllConnections(): Connection[] {
    return [...this.connections.values()].map(c => structuredClone(c));
  }

  /**
   * 查找使用指定锚点的连线（双向查找）
   * @param anchorId 锚点ID
   * @returns 如果找到则返回连线对象，否则返回 undefined
   */
  findConnectionByAnchor(anchorId: string): Connection | undefined {
    for (const conn of this.connections.values()) {
      if (conn.sourceAnchorId === anchorId || conn.targetAnchorId === anchorId) {
        return structuredClone(conn);
      }
    }
    return undefined;
  }

  updateConnection(connId: string, patch: Partial<Connection>): void {
    const conn = this.connections.get(connId);
    if (!conn) return;
    Object.assign(conn, patch);
    this.notify('connection');
  }

  // ---- 连线路径计算（委托给 calc 模块） ----
  computeConnectionPath(conn: Connection): {
    start: Point;
    end: Point;
    pathD: string;
  } | null {
    // 模式1：锚点相连
    if (conn.sourceAnchorId && conn.targetAnchorId) {
      const sourceAnchor = this.getAnchor(conn.sourceAnchorId);
      const targetAnchor = this.getAnchor(conn.targetAnchorId);
      if (!sourceAnchor || !targetAnchor) return null;
      const sourceNode = this.getNode(sourceAnchor.nodeId);
      const targetNode = this.getNode(targetAnchor.nodeId);
      if (!sourceNode || !targetNode) return null;

      const start = calcAnchorPosForNode(sourceNode, sourceAnchor);
      const end = calcAnchorPosForNode(targetNode, targetAnchor);
      const result = computePath(start, end, conn.connectorType, {
        stub: conn.stub ?? Defaults.connection.stub, // 默认 5
        gap: conn.gap ?? Defaults.connection.gap, // 默认 0
      });
      return { start, end, pathD: result.pathD }; // ✅ 提取 pathD
    }

    // 模式2：节点直连（连续锚点）
    if (conn.sourceNodeId && conn.targetNodeId) {
      const sourceNode = this.getNode(conn.sourceNodeId);
      const targetNode = this.getNode(conn.targetNodeId);
      if (!sourceNode || !targetNode) return null;
      const { source, target } = getContinuousAnchorPair(sourceNode, targetNode);
      const result = computePath(source, target, conn.connectorType);
      return { start: source, end: target, pathD: result.pathD }; // ✅ 提取 pathD
    }
    return null;
  }

  // ---- 锚点位置计算（委托给 calc 模块） ----
  calcAnchorPosForNode(node: Node, anchor: Anchor): Point {
    return calcAnchorPosForNode(node, anchor);
  }

  // ---- 删除选中 ----
  deleteSelected(type: SelectableType, id: string): void {
    if (type === 'node') this.removeNode(id);
    else if (type === 'anchor') this.removeAnchor(id);
    else if (type === 'connection') this.removeConnection(id);
  }

  // ---- 导入 / 导出 ----
  exportData(): StoreData {
    return {
      nodes: this.getAllNodes(),
      anchors: this.getAllAnchors(),
      connections: this.getAllConnections(),
    };
  }

  importData(data: StoreData): void {
    this.nodes.clear();
    this.anchors.clear();
    this.connections.clear();
    data.nodes.forEach(n => this.addNode(n));
    data.anchors.forEach(a => this.addAnchor(a));
    data.connections.forEach(c => this.addConnection(c));
    this.notify('node');
  }

  /**
   * 更新连线的源锚点（用于重连）
   * @returns 是否更新成功（如果目标相同或重复则返回 false）
   */
  updateConnectionSource(connId: string, newSourceAnchorId: string): boolean {
    const conn = this.connections.get(connId);
    if (!conn) return false;
    if (conn.sourceAnchorId === newSourceAnchorId) return false;
    const exist = this.getAllConnections().some(
      c => c.id !== connId && c.sourceAnchorId === newSourceAnchorId && c.targetAnchorId === conn.targetAnchorId
    );
    if (exist) return false;
    conn.sourceAnchorId = newSourceAnchorId;
    this.notify('connection');
    return true;
  }

  /**
   * 更新连线的目标锚点（用于重连）
   * @returns 是否更新成功（如果目标相同或重复则返回 false）
   */
  updateConnectionTarget(connId: string, newTargetAnchorId: string): boolean {
    const conn = this.connections.get(connId);
    if (!conn) return false;
    if (conn.targetAnchorId === newTargetAnchorId) return false;
    const exist = this.getAllConnections().some(
      c => c.id !== connId && c.sourceAnchorId === conn.sourceAnchorId && c.targetAnchorId === newTargetAnchorId
    );
    if (exist) return false;
    conn.targetAnchorId = newTargetAnchorId;
    this.notify('connection');
    return true;
  }
}

// 导入 calc 模块的函数（放在文件底部避免循环依赖）
import { calcAnchorPosForNode } from '../../calc/anchor/position';
import { computePath } from '../../calc/connector/path';
