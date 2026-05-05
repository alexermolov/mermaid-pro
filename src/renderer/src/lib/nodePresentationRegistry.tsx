import type { CSSProperties } from 'react'
import type { DiagramType } from '../../../shared/diagram'
import { getFlowchartShapeDefinition, type FlowchartShapeAppearance } from './flowchartShapeRegistry'
import type { VisualNodeData } from './mermaid'

export type NodePresentation = {
  classNames: string[]
  layout?: CSSProperties
  renderShape?: (appearance: FlowchartShapeAppearance) => JSX.Element
  usesSvgShape: boolean
}

type NodePresentationResolver = (data: VisualNodeData) => NodePresentation

const defaultDiagramType: DiagramType = 'flowchart'

const nodePresentationRegistry: Record<DiagramType, NodePresentationResolver> = {
  flowchart: (data) => {
    const definition = getFlowchartShapeDefinition(data.shape ?? 'rectangle')

    return {
      classNames: ['editable-node--flowchart'],
      layout: definition.layout,
      renderShape: definition.render,
      usesSvgShape: true
    }
  },
  sequence: (data) => {
    const sequencePresentation =
      data.sequenceParticipantType ?? (data.sequenceParticipantKind === 'actor' ? 'actor' : 'participant')

    return {
      classNames: ['editable-node--sequence', `editable-node--sequence-${sequencePresentation}`],
      usesSvgShape: false
    }
  },
  class: createStaticPresentation('editable-node--class'),
  state: createStaticPresentation('editable-node--state'),
  er: createStaticPresentation('editable-node--er'),
  mindmap: createStaticPresentation('editable-node--mindmap')
}

export function resolveNodePresentation(data: VisualNodeData): NodePresentation {
  return nodePresentationRegistry[data.diagramType ?? defaultDiagramType](data)
}

function createStaticPresentation(className: string): NodePresentationResolver {
  return () => ({
    classNames: [className],
    usesSvgShape: false
  })
}