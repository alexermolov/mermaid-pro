import type { AppTheme, DiagramDirection, DiagramType } from '../../../shared/diagram'
export { flowchartNodeShapes } from './flowchartShapeRegistry'
import type {
  FlowchartEdgeStyle,
  SequenceMessageType,
  SequenceParticipantPresentation
} from './mermaid'

export type { AppTheme }

export const directions: DiagramDirection[] = ['TD', 'LR', 'BT', 'RL']

export const diagramTypes: Array<{ value: DiagramType; label: string }> = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequence', label: 'Sequence diagram' },
  { value: 'class', label: 'Class diagram' },
  { value: 'state', label: 'State diagram' },
  { value: 'er', label: 'ER diagram' },
  { value: 'mindmap', label: 'Mindmap' }
]

export const flowchartEdgeStyles: Array<{ value: FlowchartEdgeStyle; label: string }> = [
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line without arrow' },
  { value: 'dottedArrow', label: 'Dotted arrow' },
  { value: 'dottedLine', label: 'Dotted line' },
  { value: 'thickArrow', label: 'Thick arrow' },
  { value: 'thickLine', label: 'Thick line' }
]

export const sequenceMessageTypes: Array<{ value: SequenceMessageType; label: string }> = [
  { value: 'async', label: 'Async message (->>)' },
  { value: 'sync', label: 'Sync message (->)' },
  { value: 'dashedAsync', label: 'Async return (-->>)' },
  { value: 'dashed', label: 'Return (-->)' }
]

export const sequenceParticipantPresentations: Array<{ value: SequenceParticipantPresentation; label: string }> = [
  { value: 'participant', label: 'Participant' },
  { value: 'actor', label: 'Actor' },
  { value: 'boundary', label: 'Boundary' },
  { value: 'control', label: 'Control' },
  { value: 'entity', label: 'Entity' },
  { value: 'database', label: 'Database' },
  { value: 'collections', label: 'Collections' },
  { value: 'queue', label: 'Queue' }
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
