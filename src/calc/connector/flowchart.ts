import type { Point } from "../../types/geometry";

/**
 * 流程图（折线）连接器
 * 生成类似流程图的直角折线路径，适合在节点间绘制带有正交风格的连线
 * 
 * @param start 起点坐标
 * @param end 终点坐标
 * @param stub 折线拐点距离端点延伸的固定长度（默认 35），可调整
 * @returns SVG 路径字符串
 */
export function connectorFlowchart(
  start: Point,
  end: Point,
  stub: number = 35
): string {
  const dx = Math.abs(start.x - end.x);
  const dy = Math.abs(start.y - end.y);

  // 如果水平或垂直距离很小，直接画直线
  if (dx < 0.1 && dy < 0.1) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const path: Point[] = [{ ...start }];

  // 根据起点终点的相对位置，决定折线路径
  if (dx < stub) {
    // 水平距离很小，垂直方向取中点折线
    const midY = (start.y + end.y) / 2;
    path.push({ x: start.x, y: midY });
    path.push({ x: end.x, y: midY });
  } else if (dy < stub) {
    // 垂直距离很小，水平方向取中点折线
    const midX = (start.x + end.x) / 2;
    path.push({ x: midX, y: start.y });
    path.push({ x: midX, y: end.y });
  } else {
    // 一般情况：先水平走到中点，再垂直走到终点
    const midX = (start.x + end.x) / 2;
    path.push({ x: midX, y: start.y });
    path.push({ x: midX, y: end.y });
  }

  path.push({ ...end });

  // 构建路径字符串
  let d = `M ${path[0].x} ${path[0].y}`;
  for (let i = 1; i < path.length; i++) {
    d += ` L ${path[i].x} ${path[i].y}`;
  }
  return d;
}