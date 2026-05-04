import type { AppTheme, DiagramDirection, DiagramType } from '../../../shared/diagram'
import type { FlowchartEdgeStyle, FlowchartNodeShape, VisualNode } from './mermaid'

export type { AppTheme }

export const directions: DiagramDirection[] = ['TD', 'LR', 'BT', 'RL']

const visualLayoutOrigin = { x: 120, y: 140 }
const visualLayoutGap = { x: 240, y: 140 }

export const diagramTypes: Array<{ value: DiagramType; label: string }> = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequence', label: 'Sequence diagram' },
  { value: 'class', label: 'Class diagram' },
  { value: 'state', label: 'State diagram' },
  { value: 'er', label: 'ER diagram' },
  { value: 'mindmap', label: 'Mindmap' }
]

export const flowchartNodeShapes: Array<{ value: FlowchartNodeShape; label: string }> = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'subroutine', label: 'Subroutine' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'circle', label: 'Circle' },
  { value: 'doubleCircle', label: 'Double circle' },
  { value: 'diamond', label: 'Decision diamond' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'parallelogram', label: 'Parallelogram' },
  { value: 'trapezoid', label: 'Trapezoid' },
  { value: 'inverseTrapezoid', label: 'Inverse trapezoid' },
  { value: 'asymmetric', label: 'Asymmetric' }
]

export const flowchartEdgeStyles: Array<{ value: FlowchartEdgeStyle; label: string }> = [
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line without arrow' },
  { value: 'dottedArrow', label: 'Dotted arrow' },
  { value: 'dottedLine', label: 'Dotted line' },
  { value: 'thickArrow', label: 'Thick arrow' },
  { value: 'thickLine', label: 'Thick line' }
]

export function toFileBaseName(title: string): string {
  const normalizedTitle = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()

  return normalizedTitle || 'diagram'
}

export function getAddNodeLabel(diagramType: DiagramType): string {
  switch (diagramType) {
    case 'sequence':
      return 'Add participant'
    case 'class':
      return 'Add class'
    case 'state':
      return 'Add state'
    case 'er':
      return 'Add entity'
    case 'mindmap':
      return 'Add topic'
    case 'flowchart':
      return 'Add node'
  }
}

export function getEdgePlaceholder(diagramType: DiagramType): string {
  switch (diagramType) {
    case 'sequence':
      return 'Select an edge to add a message'
    case 'class':
      return 'Select an edge to add a relationship label'
    case 'state':
      return 'Select an edge to add a transition label'
    case 'er':
      return 'Select an edge to add a relationship name'
    case 'mindmap':
      return 'Select an edge to add a branch label'
    case 'flowchart':
      return 'Select an edge to add a label'
  }
}

export function getWorkflowHint(diagramType: DiagramType): string {
  switch (diagramType) {
    case 'sequence':
      return 'Arrange participants left to right, connect them in message order, then label each message.'
    case 'class':
      return 'Create classes as nodes, connect relationships, then label edges with relationship notes.'
    case 'state':
      return 'Create states as nodes, connect transitions, then label edges with events or conditions.'
    case 'er':
      return 'Create entities as nodes, connect relationships, then label edges with relationship names.'
    case 'mindmap':
      return 'Use one root topic, connect child topics outward, and avoid cycles for the clearest mindmap.'
    case 'flowchart':
      return 'Drag nodes, connect handles, rename nodes inline, then export Mermaid, SVG or PNG.'
  }
}

export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}

export function layoutNodesForDirection(nodes: VisualNode[], direction: DiagramDirection): VisualNode[] {
  const lastIndex = nodes.length - 1

  return nodes.map((node, index) => {
    switch (direction) {
      case 'TD':
        return { ...node, position: { x: visualLayoutOrigin.x, y: visualLayoutOrigin.y + index * visualLayoutGap.y } }
      case 'BT':
        return { ...node, position: { x: visualLayoutOrigin.x, y: visualLayoutOrigin.y + (lastIndex - index) * visualLayoutGap.y } }
      case 'RL':
        return { ...node, position: { x: visualLayoutOrigin.x + (lastIndex - index) * visualLayoutGap.x, y: visualLayoutOrigin.y } }
      case 'LR':
        return { ...node, position: { x: visualLayoutOrigin.x + index * visualLayoutGap.x, y: visualLayoutOrigin.y } }
    }
  })
}
