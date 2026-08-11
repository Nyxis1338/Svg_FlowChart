// src/core/store/Store.ts

import type { Point } from '../../types/geometry';
import type { Anchor, Node, Connection } from '../../types/SvgModel';
import { ConnectorType } from '../../types/SvgModel';
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
    const newNode = { ...node, zIndex: node.zIndex ?? this.getNextZIndex() };
    this.nodes.set(node.id, structuredClone(newNode));
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

  updateAnchor(anchorId: string, updates: Partial<Anchor>): void {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return;
    Object.assign(anchor, updates);
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

  removeAllAnchors(nodeId: string): void {
    // 获取该节点的所有锚点
    const nodeAnchors = this.getNodeAnchors(nodeId);
    for (const anchor of nodeAnchors) {
      // removeAnchor 会删除关联连线
      this.removeAnchor(anchor.id);
    }
  }

  getNodeAnchors(nodeId: string): Anchor[] {
    // 获取节点下的所有锚点
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
      // 从 defaults 取字符串，然后转为枚举
      const defaultType = Defaults.connection.connectorType;
      // 假设 defaultType 是 'straight' | 'bezier' | 'flowchart' 之一
      conn.connectorType = defaultType as ConnectorType;
    }
    const newConn = { ...conn, zIndex: conn.zIndex ?? this.getNextZIndex() };
    this.connections.set(newConn.id, structuredClone(newConn));
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

  //查找使用指定锚点的连线（双向查找）
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
    rawStart: Point;
    rawEnd: Point;
    pathD: string;
    startDirection: Point;
    endDirection: Point;
  } | null {
    // 直接调用 generateConnectionPath（不再经过 computeConnectionPath）
    return generateConnectionPath(conn, this.getNode.bind(this), this.getAnchor.bind(this));
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

  // ---- 重连辅助 ----
  // 更新连线的源锚点（用于重连）
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

  // 更新连线的目标锚点（用于重连）
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

  // ---- 容量检查 ----
  // 检查锚点是否已达到最大连线数量
  isAnchorFull(anchorId: string): boolean {
    const max = Defaults.connection.maxConnections;
    // 如果 max <= 0，视为无限制
    if (max <= 0) return false;
    const count = Array.from(this.connections.values()).filter(
      c => c.sourceAnchorId === anchorId || c.targetAnchorId === anchorId
    ).length;
    return count >= max;
  }

  // ---- 批量更新 ----
  updateAllNodes(updates: Partial<Node>): void {
    for (const [id, node] of this.nodes) {
      Object.assign(node, updates);
    }
    this.notify('node');
  }

  updateAllConnections(updates: Partial<Connection>): void {
    for (const [id, conn] of this.connections) {
      Object.assign(conn, updates);
    }
    this.notify('connection');
  }

  updateAllAnchors(updates: Partial<Anchor>): void {
    for (const [id, anchor] of this.anchors) {
      Object.assign(anchor, updates);
    }
    this.notify('anchor');
  }

  // ---- z-index ----
  private getMaxZIndex(): number {
    let max = 99; // 初始值
    for (const node of this.nodes.values()) {
      if (node.zIndex !== undefined && node.zIndex > max) max = node.zIndex;
    }
    for (const conn of this.connections.values()) {
      if (conn.zIndex !== undefined && conn.zIndex > max) max = conn.zIndex;
    }
    return max;
  }

  private getNextZIndex(): number {
    return this.getMaxZIndex() + 1;
  }

  // 新增：更新节点 zIndex
  updateNodeZIndex(nodeId: string, newZIndex: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.zIndex = newZIndex;
    this.notify('node');
  }

  // 新增：更新连线 zIndex
  updateConnectionZIndex(connId: string, newZIndex: number): void {
    const conn = this.connections.get(connId);
    if (!conn) return;
    conn.zIndex = newZIndex;
    this.notify('connection');
  }

  // 新增：批量调整 zIndex（用于置顶/置底）
  getCurrentMaxZIndex(): number {
    return this.getMaxZIndex();
  }

  getCurrentMinZIndex(): number {
    let min = Infinity;
    for (const node of this.nodes.values()) {
      if (node.zIndex !== undefined && node.zIndex < min) min = node.zIndex;
    }
    for (const conn of this.connections.values()) {
      if (conn.zIndex !== undefined && conn.zIndex < min) min = conn.zIndex;
    }
    return min === Infinity ? 100 : min;
  }
}

// 导入 calc 模块的函数（放在文件底部避免循环依赖）
import { calcAnchorPosForNode } from '../../calc/anchor/position';
import { generateConnectionPath } from '../../calc/connector/generator';
