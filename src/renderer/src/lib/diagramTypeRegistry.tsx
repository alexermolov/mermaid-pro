import type { JSX } from 'react'
import type { DiagramType } from '../../../shared/diagram'
import type { EditableVisualNodeData } from './mermaid'

type DiagramTypeDefinition = {
  label: string
  addNodeLabel: string
  nodeLabelPlaceholder: string
  supportsDirection: boolean
  createNodeData: (index: number) => EditableVisualNodeData
  renderIcon: () => JSX.Element
}

export const diagramTypeRegistry = {
  flowchart: {
    label: 'Flowchart',
    addNodeLabel: 'Add node',
    nodeLabelPlaceholder: 'Node label',
    supportsDirection: true,
    createNodeData: (index) => ({ label: `Node ${index}` }),
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="8" height="6" rx="2" />
        <rect x="13" y="14" width="8" height="6" rx="2" />
        <path d="M 11 7 H 15 V 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  sequence: {
    label: 'Sequence diagram',
    addNodeLabel: 'Add participant',
    nodeLabelPlaceholder: 'Participant name',
    supportsDirection: false,
    createNodeData: (index) => ({ label: `Participant ${index}` }),
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="6" height="4" rx="1.5" />
        <rect x="15" y="3" width="6" height="4" rx="1.5" />
        <path d="M 6 7 V 21 M 18 7 V 21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeDasharray="2.5 2.5" strokeLinecap="round" />
        <path d="M 7 12 H 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M 14.5 9.8 L 18 12 L 14.5 14.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  class: {
    label: 'Class diagram',
    addNodeLabel: 'Add class',
    nodeLabelPlaceholder: 'Class name',
    supportsDirection: false,
    createNodeData: (index) => ({
      label: `Class${index}`,
      classAttributes: '+String name',
      classMethods: '+method()'
    }),
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M 4 8 H 20 M 4 13 H 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  state: {
    label: 'State diagram',
    addNodeLabel: 'Add state',
    nodeLabelPlaceholder: 'State name',
    supportsDirection: false,
    createNodeData: (index) => ({
      label: `State ${index}`,
      stateDescription: 'entry action'
    }),
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="12" rx="6" />
        <path d="M 8 17 V 20 M 16 17 V 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  er: {
    label: 'ER diagram',
    addNodeLabel: 'Add entity',
    nodeLabelPlaceholder: 'Entity name',
    supportsDirection: false,
    createNodeData: (index) => ({
      label: `Entity ${index}`,
      erAttributes: 'string name'
    }),
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="8" height="6" rx="1.5" />
        <rect x="13" y="14" width="8" height="6" rx="1.5" />
        <path d="M 11 7 L 15 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M 9.5 6.4 L 13 5.1 M 13.7 15.8 L 17.2 14.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  mindmap: {
    label: 'Mindmap',
    addNodeLabel: 'Add topic',
    nodeLabelPlaceholder: 'Topic',
    supportsDirection: false,
    createNodeData: (index) => ({ label: `Topic ${index}` }),
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M 12 8 V 4 M 8 12 H 4 M 16 12 H 20 M 9.2 14.8 L 6 18 M 14.8 14.8 L 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }
} satisfies Record<DiagramType, DiagramTypeDefinition>

export const diagramTypes = Object.entries(diagramTypeRegistry).map(([value, definition]) => ({
  value: value as DiagramType,
  label: definition.label,
  supportsDirection: definition.supportsDirection
}))

export function getDiagramTypeDefinition(diagramType: DiagramType): DiagramTypeDefinition {
  return diagramTypeRegistry[diagramType]
}