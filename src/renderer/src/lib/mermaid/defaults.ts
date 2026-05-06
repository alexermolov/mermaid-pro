import type { DiagramDirection, DiagramType } from '../../../../shared/diagram'
import type { VisualEdge, VisualNode } from './types'

const initialNodes: VisualNode[] = [
  {
    id: 'start',
    type: 'editableNode',
    position: { x: 120, y: 140 },
    data: { label: 'Start' }
  },
  {
    id: 'process',
    type: 'editableNode',
    position: { x: 120, y: 280 },
    data: { label: 'Process' }
  },
  {
    id: 'finish',
    type: 'editableNode',
    position: { x: 120, y: 420 },
    data: { label: 'Finish' }
  }
]

const initialEdges: VisualEdge[] = [
  { id: 'start-process', source: 'start', target: 'process', animated: true },
  { id: 'process-finish', source: 'process', target: 'finish', animated: true }
]

export const defaultDiagram = {
  title: 'Untitled Mermaid Diagram',
  type: 'flowchart' as DiagramType,
  direction: 'TD' as DiagramDirection,
  nodes: initialNodes,
  edges: initialEdges
}
