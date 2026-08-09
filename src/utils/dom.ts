/** 创建SVG命名空间元素 */
export function createSvgElement(tagName: string): SVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', tagName);
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
