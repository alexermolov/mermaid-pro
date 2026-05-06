import type { CSSProperties } from 'react'
import type { DiagramType } from '../../../shared/diagram'
import { getFlowchartShapeDefinition, type FlowchartShapeAppearance } from './flowchartShapeRegistry'
import type { SequenceParticipantPresentation, VisualNodeData } from './mermaid'

export type NodePresentation = {
  classNames: string[]
  layout?: CSSProperties
  renderShape?: (appearance: FlowchartShapeAppearance) => JSX.Element
  renderFields?: (id: string, data: VisualNodeData) => JSX.Element | null
  labelPlaceholder: string
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
      labelPlaceholder: 'Node label'
    }
  },
  sequence: (data) => {
    const sequencePresentation =
      data.sequenceParticipantType ?? (data.sequenceParticipantKind === 'actor' ? 'actor' : 'participant')
    const sequenceDefinition = getSequencePresentationDefinition(sequencePresentation)

    return {
      classNames: ['editable-node--sequence', `editable-node--sequence-${sequencePresentation}`],
      renderShape: sequenceDefinition.renderShape,
      layout: sequenceDefinition.layout,
      labelPlaceholder: 'Participant name'
    }
  },
  class: () => ({
    classNames: ['editable-node--class'],
    layout: { width: 220, minWidth: 220, minHeight: 132 },
    renderShape: renderClassShape,
    renderFields: (id, data) => (
      <>
        <textarea
          value={data.classAttributes ?? ''}
          onChange={(event) => data.onDataChange?.(id, { classAttributes: event.target.value })}
          placeholder="+String name"
          rows={3}
        />
        <textarea
          value={data.classMethods ?? ''}
          onChange={(event) => data.onDataChange?.(id, { classMethods: event.target.value })}
          placeholder="+method()"
          rows={3}
        />
      </>
    ),
    labelPlaceholder: 'Class name'
  }),
  state: () => ({
    classNames: ['editable-node--state'],
    layout: { width: 220, minWidth: 220, minHeight: 108 },
    renderShape: renderStateShape,
    renderFields: (id, data) => (
      <textarea
        value={data.stateDescription ?? ''}
        onChange={(event) => data.onDataChange?.(id, { stateDescription: event.target.value })}
        placeholder="entry action"
        rows={3}
      />
    ),
    labelPlaceholder: 'State name'
  }),
  er: () => ({
    classNames: ['editable-node--er'],
    layout: { width: 220, minWidth: 220, minHeight: 116 },
    renderShape: renderErShape,
    renderFields: (id, data) => (
      <textarea
        value={data.erAttributes ?? ''}
        onChange={(event) => data.onDataChange?.(id, { erAttributes: event.target.value })}
        placeholder="string name"
        rows={4}
      />
    ),
    labelPlaceholder: 'Entity name'
  }),
  mindmap: () => ({
    classNames: ['editable-node--mindmap'],
    layout: { minWidth: 176, minHeight: 84 },
    renderShape: renderMindmapShape,
    labelPlaceholder: 'Topic'
  })
}

export function resolveNodePresentation(data: VisualNodeData): NodePresentation {
  return nodePresentationRegistry[data.diagramType ?? defaultDiagramType](data)
}

export function getSequencePresentationDefinition(sequencePresentation: SequenceParticipantPresentation): {
  layout: CSSProperties
  renderShape: (appearance: FlowchartShapeAppearance) => JSX.Element
} {
  return {
    layout: getSequenceLayout(sequencePresentation),
    renderShape: (appearance) => renderSequenceShape(sequencePresentation, appearance)
  }
}

function renderClassShape(appearance: FlowchartShapeAppearance): JSX.Element {
  return (
    <>
      <rect x="1.5" y="1.5" width="97" height="97" rx="16" ry="16" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      <line x1="8" y1="30" x2="92" y2="30" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      <line x1="8" y1="62" x2="92" y2="62" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
    </>
  )
}

function renderStateShape(appearance: FlowchartShapeAppearance): JSX.Element {
  return <rect x="3" y="16" width="94" height="68" rx="34" ry="34" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
}

function renderErShape(appearance: FlowchartShapeAppearance): JSX.Element {
  return (
    <>
      <rect x="6" y="8" width="88" height="84" rx="8" ry="8" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      <line x1="14" y1="32" x2="86" y2="32" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
    </>
  )
}

function renderMindmapShape(appearance: FlowchartShapeAppearance): JSX.Element {
  return <rect x="1.5" y="10" width="97" height="80" rx="28" ry="28" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
}

function getSequenceLayout(sequencePresentation: string): CSSProperties {
  switch (sequencePresentation) {
    case 'control':
    case 'entity':
      return { minWidth: 188, minHeight: 84 }
    default:
      return { minWidth: 176, minHeight: 84 }
  }
}

function renderSequenceShape(sequencePresentation: string, appearance: FlowchartShapeAppearance): JSX.Element {
  switch (sequencePresentation) {
    case 'actor':
      return (
        <>
          <rect x="8" y="16" width="84" height="68" rx="14" ry="14" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} strokeDasharray="8 5" />
          <circle cx="50" cy="22" r="7" fill="none" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
          <path d="M 50 29 V 48 M 36 38 H 64 M 50 48 L 38 64 M 50 48 L 62 64" fill="none" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} strokeLinecap="round" />
        </>
      )
    case 'boundary':
      return (
        <>
          <rect x="4" y="10" width="92" height="80" rx="14" ry="14" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
          <line x1="16" y1="16" x2="16" y2="84" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth + 2} opacity="0.35" />
          <line x1="84" y1="16" x2="84" y2="84" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth + 2} opacity="0.35" />
        </>
      )
    case 'control':
      return (
        <>
          <rect x="6" y="10" width="88" height="80" rx="14" ry="14" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
          <rect x="12" y="16" width="76" height="68" rx="10" ry="10" fill="none" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth + 1.2} opacity="0.35" />
        </>
      )
    case 'entity':
      return <rect x="8" y="12" width="84" height="76" rx="8" ry="8" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth + 0.5} />
    case 'database':
      return (
        <path
          d="M 18 18 C 18 10, 82 10, 82 18 L 82 80 C 82 88, 18 88, 18 80 Z M 18 18 C 18 26, 82 26, 82 18 M 18 80 C 18 72, 82 72, 82 80"
          fill={appearance.fill}
          stroke={appearance.stroke}
          strokeWidth={appearance.strokeWidth}
        />
      )
    case 'collections':
      return (
        <>
          <rect x="18" y="18" width="64" height="56" rx="12" ry="12" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.58" />
          <rect x="11" y="11" width="64" height="56" rx="12" ry="12" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.76" />
          <rect x="4" y="4" width="64" height="56" rx="12" ry="12" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
        </>
      )
    case 'queue':
      return <rect x="8" y="14" width="84" height="72" rx="14" ry="14" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} strokeDasharray="2.5 5.5" />
    case 'participant':
    default:
      return <rect x="8" y="16" width="84" height="68" rx="14" ry="14" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
  }
}