import type { Point } from "../../types/geometry";
import { connectorStraight } from "./straight";
import { connectorBezier } from "./bezier";
import { connectorFlowchart } from "./flowchart";

export type ConnectorMode = "straight" | "bezier" | "flowchart";

export function generatePath(mode: ConnectorMode, start: Point, end: Point): string {
  switch (mode) {
    case "straight":
      return connectorStraight(start, end);
    case "bezier":
      return connectorBezier(start, end);
    case "flowchart":
      return connectorFlowchart(start, end);
  }
}