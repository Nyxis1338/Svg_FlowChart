/** 创建SVG命名空间元素 */
export function createSvgElement(tagName: string): SVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

/** 设置元素dataset */
export function setDataAttr(el: SVGElement | HTMLElement, key: string, value: string): void {
  el.dataset[key] = value;
}

/** 清空子元素 */
export function clearChildren(el: Element): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/** 创建悬浮右键菜单 */
export function createContextMenu(): HTMLDivElement {
  const menu = document.createElement("div");
  menu.style.position = "fixed";
  menu.style.zIndex = "9999";
  menu.style.background = "#fff";
  menu.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
  menu.style.borderRadius = "6px";
  menu.style.padding = "4px 0";
  menu.style.minWidth = "120px";
  menu.style.display = "none";
  menu.style.userSelect = "none";
  return menu;
}

/** 创建菜单项 */
export function createMenuItem(text: string, onClick: () => void): HTMLDivElement {
  const item = document.createElement("div");
  item.textContent = text;
  item.style.padding = "6px 16px";
  item.style.cursor = "pointer";
  item.style.fontSize = "14px";
  item.style.color = "#333";
  item.addEventListener("mouseenter", () => item.style.background = "#eef5ff");
  item.addEventListener("mouseleave", () => item.style.background = "transparent");
  item.addEventListener("click", onClick);
  return item;
}