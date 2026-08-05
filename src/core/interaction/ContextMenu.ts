// src/core/interaction/ContextMenu.ts

import type { SvgEngine } from '../SvgEngine';
import type { Store } from '../store/Store';
import type { SelectionManager } from '../selection/SelectionManager';
import type { ViewportManager } from '../viewport/ViewportManager';
import { createContextMenu, createMenuItem } from '../../utils/dom';

export class ContextMenu {
  private menuEl: HTMLDivElement;

  constructor(
    private chart: SvgEngine,
    private store: Store,
    private selection: SelectionManager,
    private viewport: ViewportManager
  ) {
    this.menuEl = createContextMenu();
    this.menuEl.classList.add('context-menu');
    document.body.appendChild(this.menuEl);
  }

  show(evt: MouseEvent): void {
    evt.preventDefault();
    const target = evt.target as SVGElement;
    const mouseX = evt.clientX;
    const mouseY = evt.clientY;

    this.menuEl.innerHTML = '';

    // 向上查找节点ID
    let nodeId: string | undefined;
    let el: SVGElement | null = target;
    while (el && !nodeId) {
      nodeId = el.getAttribute('data-node-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }

    // 向上查找连线ID
    let connId: string | undefined;
    el = target;
    while (el && !connId) {
      connId = el.getAttribute('data-connection-id') ?? undefined;
      const parent = el.parentElement;
      if (!parent) break;
      el = parent as unknown as SVGElement;
    }

    if (nodeId) {
      // 节点菜单：图层控制
      const upItem = createMenuItem('⬆ 上移一层', () => {
        this.moveNode(nodeId, 'up');
        this.hide();
      });
      const downItem = createMenuItem('⬇ 下移一层', () => {
        this.moveNode(nodeId, 'down');
        this.hide();
      });
      const topItem = createMenuItem('⬆⬆ 置顶', () => {
        this.moveNode(nodeId, 'top');
        this.hide();
      });
      const bottomItem = createMenuItem('⬇⬇ 置底', () => {
        this.moveNode(nodeId, 'bottom');
        this.hide();
      });
      this.menuEl.appendChild(upItem);
      this.menuEl.appendChild(downItem);
      this.menuEl.appendChild(topItem);
      this.menuEl.appendChild(bottomItem);
    } else if (connId) {
      // 连线菜单：删除
      const delItem = createMenuItem('🗑 删除连线', () => {
        this.store.deleteSelected('connection', connId);
        this.selection.clear();
        this.hide();
      });
      this.menuEl.appendChild(delItem);
    }
    // 空白区域：无菜单项

    // 定位菜单
    const menuW = 130,
      menuH = 120;
    let left = mouseX,
      top = mouseY;
    if (mouseX + menuW > window.innerWidth) left = mouseX - menuW;
    if (mouseY + menuH > window.innerHeight) top = mouseY - menuH;
    this.menuEl.style.left = left + 'px';
    this.menuEl.style.top = top + 'px';
    this.menuEl.style.display = 'block';
  }

  private moveNode(nodeId: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
    const nodeElement = this.chart.renderer['nodeRenderer']['nodeLayer'].querySelector(
      `[data-node-id="${nodeId}"]`
    ) as SVGGElement;
    if (!nodeElement) return;
    const parent = nodeElement.parentNode;
    if (!parent) return;
    const children = parent.children;
    const idx = Array.from(children).indexOf(nodeElement);
    if (idx === -1) return;

    if (direction === 'up') {
      if (idx < children.length - 1) {
        parent.insertBefore(nodeElement, children[idx + 1]);
      }
    } else if (direction === 'down') {
      if (idx > 0) {
        parent.insertBefore(nodeElement, children[idx - 1]);
      }
    } else if (direction === 'top') {
      parent.appendChild(nodeElement);
    } else if (direction === 'bottom') {
      parent.insertBefore(nodeElement, children[0]);
    }
  }

  hide(): void {
    this.menuEl.style.display = 'none';
  }

  destroy(): void {
    this.menuEl.remove();
  }
}
