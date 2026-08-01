import type { Point, Rect } from "../../types/geometry";
export type StaticAnchorType = "Top" | "Right" | "Bottom" | "Left" | "Center";

export function computeStaticAnchor(rect: Rect, type: StaticAnchorType): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  switch (type) {
    case "Top":
      return { x: cx, y: rect.y };
    case "Right":
      return { x: rect.x + rect.width, y: cy };
    case "Bottom":
      return { x: cx, y: rect.y + rect.height };
    case "Left":
      return { x: rect.x, y: cy };
    case "Center":
      return { x: cx, y: cy };
  }
}