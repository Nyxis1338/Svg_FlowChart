import type { Point } from "../../types/geometry";

export function connectorStraight(start: Point, end: Point): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}