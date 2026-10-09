import type { DiagramDirection, DiagramType } from '../../../../shared/diagram'
import type { VisualEdge, VisualNode } from './types'

// DEBUG: auto-layout is disabled completely for the debugging phase.
// `autoLayoutNodes` returns the input nodes unchanged so no diagram is ever
// repositioned by the app without explicit user action.
// To restore normal behavior, revert this function to the original implementation
// (dagre + tree fallback) found in git history.
export function autoLayoutNodes(
  nodes: VisualNode[],
  _edges: VisualEdge[],
  _direction: DiagramDirection,
  _diagramType?: DiagramType
): VisualNode[] {
  return nodes
}

export function setSkipDagre(_value: boolean): void {
  // no-op: auto-layout stays disabled
}

/**
 * Hierarchical layout for state diagrams with composite `state X { … }` groups (React Flow `parentId`).
 */
export function layoutStateCompositeNodes(nodes: VisualNode[], _edges: VisualEdge[], _direction: DiagramDirection): VisualNode[] {
  return nodes
}

export function getSequenceLifelineHeight(messageCount: number): number {
  return Math.max(180, 96 + messageCount * 56)
}

export function layoutSequenceNodes(nodes: VisualNode[]): VisualNode[] {
  return nodes
}

/**
 * Hierarchical layout for flowcharts with subgraph boundary nodes (React Flow `parentId`).
 * Positions subgraph containers first, then arranges child nodes inside each container.
 */
export function layoutFlowchartSubgraphNodes(
  nodes: VisualNode[],
  _edges: VisualEdge[],
  _direction: DiagramDirection,
  _diagramType?: DiagramType
): VisualNode[] {
  return nodes
}
