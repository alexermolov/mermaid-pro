import type { DiagramDirection, DiagramType } from '../../../../../shared/diagram'
import type { MermaidGraphInput, VisualEdge, VisualNode } from '../types'
import { toClassDiagram } from './classDiagram'
import { toErDiagram } from './erDiagram'
import { toFlowchart } from './flowchart'
import { toMindmap } from './mindmap'
import { toSequenceDiagram } from './sequence'
import { toStateDiagram } from './stateDiagram'
import { toTimelineDiagram } from './timeline'

export function toMermaid(
  nodes: VisualNode[],
  edges: VisualEdge[],
  direction: DiagramDirection,
  type: DiagramType
): string {
  switch (type) {
    case 'sequence':
      return toSequenceDiagram(nodes, edges)
    case 'class':
      return toClassDiagram(nodes, edges, direction)
    case 'state':
      return toStateDiagram(nodes, edges, direction)
    case 'er':
      return toErDiagram(nodes, edges)
    case 'mindmap':
      return toMindmap(nodes, edges)
    case 'timeline':
      return toTimelineDiagram(direction)
    case 'flowchart':
      return toFlowchart(nodes, edges, direction)
  }
}

export function graphToMermaidText(graph: MermaidGraphInput): string {
  const diagramType = 'diagramType' in graph ? graph.diagramType : graph.type
  return toMermaid(graph.nodes, graph.edges, graph.direction, diagramType)
}
