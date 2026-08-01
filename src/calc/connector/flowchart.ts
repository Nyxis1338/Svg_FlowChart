import type { Point } from "../../types/geometry";

const STUB = 35;

export function connectorFlowchart(start: Point, end: Point): string {
  const path: Point[] = [{ ...start }];
  const dx = Math.abs(start.x - end.x);
  const dy = Math.abs(start.y - end.y);

  if (dx < STUB) {
    path.push({ x: start.x, y: (start.y + end.y) / 2 });
    path.push({ x: end.x, y: (start.y + end.y) / 2 });
  } else if (dy < STUB) {
    path.push({ x: (start.x + end.x) / 2, y: start.y });
    path.push({ x: (start.x + end.x) / 2, y: end.y });
  } else {
    const midX = (start.x + end.x) / 2;
    path.push({ x: midX, y: start.y });
    path.push({ x: midX, y: end.y });
  }
  path.push({ ...end });

  let d = `M ${path[0].x} ${path[0].y}`;
  for (let i = 1; i < path.length; i++) {
    d += ` L ${path[i].x} ${path[i].y}`;
  }
  return d;
}