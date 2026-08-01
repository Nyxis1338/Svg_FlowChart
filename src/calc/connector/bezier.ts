import type { Point } from "../../types/geometry";

export function connectorBezier(start: Point, end: Point): string {
  const dx = end.x - start.x;
  const controlOffset = Math.max(Math.abs(dx) * 0.5, 40);
  const cp1: Point = { x: start.x + controlOffset, y: start.y };
  const cp2: Point = { x: end.x - controlOffset, y: end.y };
  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
}