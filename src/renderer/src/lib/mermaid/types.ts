import type { Edge, Node } from '@xyflow/react'
import type { DiagramDirection, DiagramType } from '../../../../shared/diagram'

export type FlowchartNodeShape =
  | 'rectangle'
  | 'rounded'
  | 'stadium'
  | 'subroutine'
  | 'cylinder'
  | 'circle'
  | 'smallCircle'
  | 'doubleCircle'
  | 'framedCircle'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'trapezoid'
  | 'inverseTrapezoid'
  | 'asymmetric'
  | 'fork'
  | 'hourglass'
  | 'comment'
  | 'commentRight'
  | 'commentBoth'
  | 'bolt'
  | 'document'
  | 'delay'
  | 'directAccessStorage'
  | 'linedCylinder'
  | 'display'
  | 'dividedRectangle'
  | 'triangle'
  | 'windowPane'
  | 'filledCircle'
  | 'linedDocument'
  | 'notchedPentagon'
  | 'flippedTriangle'
  | 'slopedRectangle'
  | 'stackedDocument'
  | 'stackedRectangle'
  | 'paperTape'
  | 'bowTieRectangle'
  | 'crossedCircle'
  | 'taggedDocument'
  | 'taggedRectangle'
  | 'notchedRectangle'
  | 'linedRectangle'
  | 'cloud'

export type FlowchartEdgeStyle =
  | 'arrow'
  | 'line'
  | 'dottedArrow'
  | 'dottedLine'
  | 'thickArrow'
  | 'thickLine'
  | 'circleEdge'
  | 'crossEdge'
  | 'bidirectionalArrow'
  | 'bidirectionalCircle'
  | 'bidirectionalCross'

export type FlowchartNodeStyle = {
  fillColor?: string
  strokeColor?: string
  textColor?: string
  borderWidth?: number
}

export type FlowchartClassStyleMap = Record<string, FlowchartNodeStyle>

export type FlowchartEdgeVisualStyle = {
  strokeColor?: string
  strokeWidth?: number
}

export type SequenceMessageType = 'sync' | 'async' | 'dashed' | 'dashedAsync'
export type SequenceParticipantKind = 'participant' | 'actor'
export type SequenceParticipantType = 'boundary' | 'control' | 'entity' | 'database' | 'collections' | 'queue'
export type SequenceParticipantPresentation = SequenceParticipantKind | SequenceParticipantType

export type ErCardinality = 'one' | 'zeroOrOne' | 'oneOrMore' | 'zeroOrMore'
export type ErRelationshipLineStyle = 'identifying' | 'nonIdentifying'

export type VisualNodeData = {
  label: string
  classAttributes?: string
  classMethods?: string
  classAnnotation?: string
  classNamespace?: string
  classNote?: string
  erAttributes?: string
  stateDescription?: string
  /** Start/end pseudo-state for state diagrams (`[*]` in Mermaid). */
  statePseudo?: 'start' | 'end'
  shape?: FlowchartNodeShape
  style?: FlowchartNodeStyle
  flowchartClassNames?: string[]
  flowchartClassStyles?: FlowchartClassStyleMap
  sequenceParticipantKind?: SequenceParticipantKind
  sequenceParticipantType?: SequenceParticipantType
  onLabelChange?: (id: string, label: string) => void
  onDataChange?: (id: string, data: Partial<EditableVisualNodeData>) => void
  diagramType?: DiagramType
  direction?: DiagramDirection
  sequenceLifelineHeight?: number
}

export type VisualNode = Node<VisualNodeData>

export type EditableVisualNodeData = Pick<
  VisualNodeData,
  'label' | 'classAttributes' | 'classMethods' | 'classAnnotation' | 'classNamespace' | 'classNote' | 'erAttributes' | 'stateDescription'
>

export type VisualEdgeData = {
  lineStyle?: FlowchartEdgeStyle
  visualStyle?: FlowchartEdgeVisualStyle
  sequenceMessageType?: SequenceMessageType
  sequenceArrowOperator?: string
  diagramType?: DiagramType
  sequenceOrder?: number
  erSourceCardinality?: ErCardinality
  erTargetCardinality?: ErCardinality
  erRelationshipLineStyle?: ErRelationshipLineStyle
  classRelationshipToken?: string
  classSourceMultiplicity?: string
  classTargetMultiplicity?: string
  /** `A -- B` concurrent transition in state diagrams. */
  stateConcurrency?: boolean
}

export type VisualEdge = Edge<VisualEdgeData>

export type ParsedMermaidDiagram = {
  diagramType: DiagramType
  direction: DiagramDirection
  nodes: VisualNode[]
  edges: VisualEdge[]
}

export type MermaidGraph = ParsedMermaidDiagram

export type MermaidGraphInput = {
  direction: DiagramDirection
  nodes: VisualNode[]
  edges: VisualEdge[]
} & ({ diagramType: DiagramType } | { type: DiagramType })
