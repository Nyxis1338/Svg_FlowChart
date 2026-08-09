// src/core/interaction/ContextMenu.ts

import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import { createSvgElement } from '../../utils/dom';

/**
 * 创建悬浮右键菜单（纯 DOM）
 */
function createContextMenu(): HTMLDivElement {
  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.zIndex = '9999';
  menu.style.background = '#fff';
  menu.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
  menu.style.borderRadius = '6px';
  menu.style.padding = '4px 0';
  menu.style.minWidth = '130px';
  menu.style.display = 'none';
  menu.style.userSelect = 'none';
  return menu;
}

function createMenuItem(text: string, onClick: () => void, danger: boolean = false): HTMLDivElement {
  const item = document.createElement('div');
  item.textContent = text;
  item.style.padding = '6px 16px';
  item.style.cursor = 'pointer';
  item.style.fontSize = '13px';
  item.style.color = danger ? '#c62828' : '#333';
  item.addEventListener('mouseenter', () => {
    item.style.background = danger ? '#ffebee' : '#eef5ff';
  });
  item.addEventListener('mouseleave', () => {
    item.style.background = 'transparent';
  });
  item.addEventListener('click', e => {
    e.stopPropagation();
    onClick();
  });
  return item;
}

function createSeparator(): HTMLDivElement {
  const sep = document.createElement('div');
  sep.style.height = '1px';
  sep.style.background = '#e0e0e0';
  sep.style.margin = '4px 8px';
  return sep;
}

export class ContextMenu {
  private menuEl: HTMLDivElement;
  private chart: SvgEngine;
  private store: Store;
  private selection: SelectionManager;

  constructor(chart: SvgEngine, store: Store, selection: SelectionManager) {
    this.chart = chart;
    this.store = store;
    this.selection = selection;
    this.menuEl = createContextMenu();
    this.menuEl.classList.add('context-menu');
    document.body.appendChild(this.menuEl);
  }

  show(evt: MouseEvent): void {
    evt.preventDefault();
    const target = evt.target as SVGElement;
    const mouseX = evt.clientX;
    const mouseY = evt.clientY;

    // 清空菜单
    this.menuEl.innerHTML = '';

    // ---- 1. 查找点击的实体 ----
    let nodeId: string | undefined;
    let connId: string | undefined;
    let anchorId: string | undefined;

    let el: SVGElement | null = target;
    while (el) {
      if (!anchorId) anchorId = el.getAttribute('data-anchor-id') ?? undefined;
      if (!nodeId) nodeId = el.getAttribute('data-node-id') ?? undefined;
      if (!connId) connId = el.getAttribute('data-connection-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }

    // ---- 2. 如果点击的是锚点（只提供删除） ----
    if (anchorId) {
      const anchor = this.store.getAnchor(anchorId);
      if (anchor) {
        if (!this.selection.isSelected('anchor', anchorId)) {
          this.selection.select('anchor', anchorId);
        }
        const delItem = createMenuItem(
          '🗑 删除锚点及关联连线',
          () => {
            this.store.removeAnchor(anchorId);
            this.selection.clear();
            this.hide();
          },
          true
        );
        this.menuEl.appendChild(delItem);
      }
    }
    // ---- 3. 如果点击的是节点 ----
    else if (nodeId) {
      const node = this.store.getNode(nodeId);
      if (node) {
        if (!this.selection.isSelected('node', nodeId)) {
          this.selection.select('node', nodeId);
        }

        this.addLayerMenuItems(
          () => this.moveNode(nodeId, 'up'),
          () => this.moveNode(nodeId, 'down'),
          () => this.moveNode(nodeId, 'top'),
          () => this.moveNode(nodeId, 'bottom')
        );

        this.menuEl.appendChild(createSeparator());

        const delItem = createMenuItem(
          '🗑 删除节点及关联锚点/连线',
          () => {
            this.store.removeNode(nodeId);
            this.selection.clear();
            this.hide();
          },
          true
        );
        this.menuEl.appendChild(delItem);
      }
    }
    // ---- 4. 如果点击的是连线 ----
    else if (connId) {
      const conn = this.store.getConnection(connId);
      if (conn) {
        if (!this.selection.isSelected('connection', connId)) {
          this.selection.select('connection', connId);
        }

        this.addLayerMenuItems(
          () => this.moveConnection(connId, 'up'),
          () => this.moveConnection(connId, 'down'),
          () => this.moveConnection(connId, 'top'),
          () => this.moveConnection(connId, 'bottom')
        );

        this.menuEl.appendChild(createSeparator());

        const delItem = createMenuItem(
          '🗑 删除连线',
          () => {
            this.store.removeConnection(connId);
            this.selection.clear();
            this.hide();
          },
          true
        );
        this.menuEl.appendChild(delItem);
      }
    }
    // ---- 5. 点击空白区域 ----
    else {
      this.hide();
      return;
    }

    // ---- 6. 定位菜单 ----
    const menuW = 150;
    const menuH = this.menuEl.children.length * 36 + 16;
    let left = mouseX;
    let top = mouseY;
    if (mouseX + menuW > window.innerWidth) left = mouseX - menuW;
    if (mouseY + menuH > window.innerHeight) top = mouseY - menuH;
    this.menuEl.style.left = left + 'px';
    this.menuEl.style.top = top + 'px';
    this.menuEl.style.display = 'block';
  }

  /**
   * 添加四个层级菜单项
   */
  private addLayerMenuItems(up: () => void, down: () => void, top: () => void, bottom: () => void): void {
    const upItem = createMenuItem('⬆ 上移一层', () => {
      up();
      this.hide();
    });
    const downItem = createMenuItem('⬇ 下移一层', () => {
      down();
      this.hide();
    });
    const topItem = createMenuItem('⬆⬆ 置顶', () => {
      top();
      this.hide();
    });
    const bottomItem = createMenuItem('⬇⬇ 置底', () => {
      bottom();
      this.hide();
    });
    this.menuEl.appendChild(upItem);
    this.menuEl.appendChild(downItem);
    this.menuEl.appendChild(topItem);
    this.menuEl.appendChild(bottomItem);
  }

  /**
   * 移动节点在 elementLayer 中的顺序（通过修改 zIndex 并重排）
   */
  private moveNode(nodeId: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
    const node = this.store.getNode(nodeId);
    if (!node) return;
    const currentZ = node.zIndex ?? 100;
    const allNodes = this.store.getAllNodes();
    // 获取所有节点的 zIndex（排除自身）
    const others = allNodes.filter(n => n.id !== nodeId);
    const zValues = others.map(n => n.zIndex ?? 100);

    let newZ = currentZ;
    switch (direction) {
      case 'up': {
        // 找比 currentZ 大的最小 zIndex
        const bigger = zValues.filter(z => z > currentZ).sort((a, b) => a - b);
        if (bigger.length > 0) {
          const targetZ = bigger[0];
          // 找到拥有 targetZ 的节点，交换
          const targetNode = others.find(n => (n.zIndex ?? 100) === targetZ);
          if (targetNode) {
            this.store.updateNodeZIndex(nodeId, targetZ);
            this.store.updateNodeZIndex(targetNode.id, currentZ);
          }
        }
        break;
      }
      case 'down': {
        const smaller = zValues.filter(z => z < currentZ).sort((a, b) => b - a);
        if (smaller.length > 0) {
          const targetZ = smaller[0];
          const targetNode = others.find(n => (n.zIndex ?? 100) === targetZ);
          if (targetNode) {
            this.store.updateNodeZIndex(nodeId, targetZ);
            this.store.updateNodeZIndex(targetNode.id, currentZ);
          }
        }
        break;
      }
      case 'top': {
        const maxZ = Math.max(...zValues, currentZ);
        this.store.updateNodeZIndex(nodeId, maxZ + 1);
        break;
      }
      case 'bottom': {
        const minZ = Math.min(...zValues, currentZ);
        this.store.updateNodeZIndex(nodeId, minZ - 1);
        break;
      }
    }
  }

  /**
   * 移动连线在 elementLayer 中的顺序（通过修改 zIndex 并重排）
   */
  private moveConnection(connId: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
    const conn = this.store.getConnection(connId);
    if (!conn) return;
    const currentZ = conn.zIndex ?? 100;
    const allConns = this.store.getAllConnections();
    const others = allConns.filter(c => c.id !== connId);
    const zValues = others.map(c => c.zIndex ?? 100);

    let newZ = currentZ;
    switch (direction) {
      case 'up': {
        const bigger = zValues.filter(z => z > currentZ).sort((a, b) => a - b);
        if (bigger.length > 0) {
          const targetZ = bigger[0];
          const targetConn = others.find(c => (c.zIndex ?? 100) === targetZ);
          if (targetConn) {
            this.store.updateConnectionZIndex(connId, targetZ);
            this.store.updateConnectionZIndex(targetConn.id, currentZ);
          }
        }
        break;
      }
      case 'down': {
        const smaller = zValues.filter(z => z < currentZ).sort((a, b) => b - a);
        if (smaller.length > 0) {
          const targetZ = smaller[0];
          const targetConn = others.find(c => (c.zIndex ?? 100) === targetZ);
          if (targetConn) {
            this.store.updateConnectionZIndex(connId, targetZ);
            this.store.updateConnectionZIndex(targetConn.id, currentZ);
          }
        }
        break;
      }
      case 'top': {
        const maxZ = Math.max(...zValues, currentZ);
        this.store.updateConnectionZIndex(connId, maxZ + 1);
        break;
      }
      case 'bottom': {
        const minZ = Math.min(...zValues, currentZ);
        this.store.updateConnectionZIndex(connId, minZ - 1);
        break;
      }
    }
  }

  hide(): void {
    this.menuEl.style.display = 'none';
  }

  destroy(): void {
    this.menuEl.remove();
  }
}
