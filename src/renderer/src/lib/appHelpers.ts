import type { AppTheme, DiagramDirection, DiagramType } from '../../../shared/diagram'
import { getEdgeLabelPlaceholder } from './edgePresentationRegistry'
export { flowchartNodeShapes } from './flowchartShapeRegistry'
import { diagramTypes, getDiagramTypeDefinition } from './diagramTypeRegistry'
import type {
  FlowchartEdgeStyle,
  SequenceMessageType,
  SequenceParticipantPresentation
} from './mermaid'

export type { AppTheme }

export const directions: DiagramDirection[] = ['TD', 'LR', 'BT', 'RL']

export { diagramTypes }

export const flowchartEdgeStyles: Array<{ value: FlowchartEdgeStyle; label: string }> = [
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line without arrow' },
  { value: 'dottedArrow', label: 'Dotted arrow' },
  { value: 'dottedLine', label: 'Dotted line' },
  { value: 'thickArrow', label: 'Thick arrow' },
  { value: 'thickLine', label: 'Thick line' },
  { value: 'circleEdge', label: 'Circle edge (--o)' },
  { value: 'crossEdge', label: 'Cross edge (--x)' },
  { value: 'bidirectionalArrow', label: 'Two-way arrow (<-->)' },
  { value: 'bidirectionalCircle', label: 'Two-way circle (o--o)' },
  { value: 'bidirectionalCross', label: 'Two-way cross (x--x)' }
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

export const classRelationshipTypes: Array<{ value: string; label: string }> = [
  { value: '-->', label: 'Association (-->)' },
  { value: '<--', label: 'Association reversed (<--)' },
  { value: '--', label: 'Solid link (--)' },
  { value: '..', label: 'Dashed link (..)' },
  { value: '<|--', label: 'Inheritance (<|--)' },
  { value: '--|>', label: 'Inheritance reversed (--|>)' },
  { value: '*--', label: 'Composition (*--)' },
  { value: '--*', label: 'Composition reversed (--*)' },
  { value: 'o--', label: 'Aggregation (o--)' },
  { value: '--o', label: 'Aggregation reversed (--o)' },
  { value: '..>', label: 'Dependency (..>)' },
  { value: '<..', label: 'Dependency reversed (<..)' },
  { value: '..|>', label: 'Realization (..|>)' },
  { value: '<|..', label: 'Realization reversed (<|..)' },
  { value: '()--', label: 'Lollipop (()--)' },
  { value: '--()', label: 'Lollipop reversed (--())' }
]

export const classMultiplicityOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'None' },
  { value: '1', label: '1' },
  { value: '0..1', label: '0..1' },
  { value: '1..*', label: '1..*' },
  { value: '*', label: '*' }
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
  return getDiagramTypeDefinition(diagramType).addNodeLabel
}

export function getEdgePlaceholder(diagramType: DiagramType): string {
  return getEdgeLabelPlaceholder(diagramType)
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
