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
export function connectorFlowchart(start: Point, end: Point, stub: number = 35): string {
  // 计算起点和终点方向（基于相对位置）
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // 决定主方向
  let startDir: 'h' | 'v' = absDx > absDy ? 'h' : 'v';
  let endDir: 'h' | 'v' = absDx > absDy ? 'h' : 'v';

  // 如果水平距离很小，起点先垂直延伸
  if (absDx < stub) startDir = 'v';
  if (absDy < stub) endDir = 'h';

  // 构造路径点
  const points: Point[] = [{ ...start }];
  // 起点延伸
  if (startDir === 'h') {
    const x = start.x + Math.sign(dx) * stub;
    points.push({ x, y: start.y });
  } else {
    const y = start.y + Math.sign(dy) * stub;
    points.push({ x: start.x, y });
  }

  // 中间拐点（如果水平和垂直方向都需要拐弯）
  const last = points[points.length - 1];
  if (startDir !== endDir) {
    // 需要一个中间拐点
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    if (startDir === 'h') {
      points.push({ x: midX, y: last.y });
      points.push({ x: midX, y: end.y });
    } else {
      points.push({ x: last.x, y: midY });
      points.push({ x: end.x, y: midY });
    }
  } else {
    // 同向，可以直接连接
    if (startDir === 'h') {
      points.push({ x: end.x, y: last.y });
    } else {
      points.push({ x: last.x, y: end.y });
    }
  }

  // 终点延伸反向
  const penultimate = points[points.length - 1];
  if (endDir === 'h') {
    const x = end.x - Math.sign(end.x - penultimate.x) * stub;
    points.push({ x, y: end.y });
  } else {
    const y = end.y - Math.sign(end.y - penultimate.y) * stub;
    points.push({ x: end.x, y });
  }
  points.push({ ...end });

  // 构建路径
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}