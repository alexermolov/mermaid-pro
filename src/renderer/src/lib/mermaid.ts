import type { Edge, Node } from '@xyflow/react'
import type { DiagramDirection, DiagramType } from '../../../shared/diagram'

export type FlowchartNodeShape =
  | 'rectangle'
  | 'rounded'
  | 'stadium'
  | 'subroutine'
  | 'cylinder'
  | 'circle'
  | 'doubleCircle'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'trapezoid'
  | 'inverseTrapezoid'
  | 'asymmetric'

export type FlowchartEdgeStyle = 'arrow' | 'line' | 'dottedArrow' | 'dottedLine' | 'thickArrow' | 'thickLine'

export type FlowchartNodeStyle = {
  fillColor?: string
  strokeColor?: string
  textColor?: string
  borderWidth?: number
}

export type FlowchartEdgeVisualStyle = {
  strokeColor?: string
  strokeWidth?: number
}

export type VisualNodeData = {
  label: string
  shape?: FlowchartNodeShape
  style?: FlowchartNodeStyle
  onLabelChange?: (id: string, label: string) => void
  direction?: DiagramDirection
}

export type VisualNode = Node<VisualNodeData>

export type VisualEdgeData = {
  lineStyle?: FlowchartEdgeStyle
  visualStyle?: FlowchartEdgeVisualStyle
}

export type VisualEdge = Edge<VisualEdgeData>

const initialNodes: VisualNode[] = [
  {
    id: 'start',
    type: 'editableNode',
    position: { x: 80, y: 120 },
    data: { label: 'Start' }
  },
  {
    id: 'process',
    type: 'editableNode',
    position: { x: 340, y: 120 },
    data: { label: 'Process' }
  },
  {
    id: 'finish',
    type: 'editableNode',
    position: { x: 600, y: 120 },
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
  direction: 'LR' as DiagramDirection,
  nodes: initialNodes,
  edges: initialEdges
}

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
      return toClassDiagram(nodes, edges)
    case 'state':
      return toStateDiagram(nodes, edges)
    case 'er':
      return toErDiagram(nodes, edges)
    case 'mindmap':
      return toMindmap(nodes, edges)
    case 'flowchart':
      return toFlowchart(nodes, edges, direction)
  }
}

function toFlowchart(nodes: VisualNode[], edges: VisualEdge[], direction: DiagramDirection): string {
  const nodeLines = nodes
    .map((node) => formatFlowchartNode(sanitizeId(node.id), escapeLabel(node.data.label || node.id), node.data.shape))
    .join('\n')

  const edgeLines = edges
    .map((edge) => {
      const label = edge.label ? escapeLabel(String(edge.label)) : ''
      return `  ${sanitizeId(edge.source)} ${formatFlowchartLink(edge.data?.lineStyle, label)} ${sanitizeId(edge.target)}`
    })
    .join('\n')

  const nodeStyleLines = nodes
    .map((node) => formatFlowchartNodeStyle(sanitizeId(node.id), node.data.style))
    .filter(Boolean)
    .join('\n')

  const edgeStyleLines = edges
    .map((edge, index) => formatFlowchartEdgeStyle(index, edge.data?.visualStyle))
    .filter(Boolean)
    .join('\n')

  return [`flowchart ${direction}`, nodeLines, edgeLines, nodeStyleLines, edgeStyleLines].filter(Boolean).join('\n')
}

function formatFlowchartNode(id: string, label: string, shape: FlowchartNodeShape = 'rectangle'): string {
  switch (shape) {
    case 'rounded':
      return `  ${id}("${label}")`
    case 'stadium':
      return `  ${id}(["${label}"])`
    case 'subroutine':
      return `  ${id}[["${label}"]]`
    case 'cylinder':
      return `  ${id}[("${label}")]`
    case 'circle':
      return `  ${id}(("${label}"))`
    case 'doubleCircle':
      return `  ${id}((("${label}")))`
    case 'diamond':
      return `  ${id}{"${label}"}`
    case 'hexagon':
      return `  ${id}{{"${label}"}}`
    case 'parallelogram':
      return `  ${id}[/"${label}"/]`
    case 'trapezoid':
      return `  ${id}[/"${label}"\\]`
    case 'inverseTrapezoid':
      return `  ${id}[\\"${label}"/]`
    case 'asymmetric':
      return `  ${id}>"${label}"]`
    case 'rectangle':
      return `  ${id}["${label}"]`
  }
}

function formatFlowchartLink(lineStyle: FlowchartEdgeStyle = 'arrow', label: string): string {
  switch (lineStyle) {
    case 'line':
      return label ? `---|${label}|` : '---'
    case 'dottedArrow':
      return label ? `-. ${label} .->` : '-.->'
    case 'dottedLine':
      return label ? `-. ${label} .-` : '-.-'
    case 'thickArrow':
      return label ? `== ${label} ==>` : '==>'
    case 'thickLine':
      return label ? `== ${label} ==` : '==='
    case 'arrow':
      return label ? `-->|${label}|` : '-->'
  }
}

function formatFlowchartNodeStyle(id: string, style: FlowchartNodeStyle | undefined): string {
  const declarations = [
    style?.fillColor ? `fill:${style.fillColor}` : '',
    style?.strokeColor ? `stroke:${style.strokeColor}` : '',
    style?.textColor ? `color:${style.textColor}` : '',
    style?.borderWidth ? `stroke-width:${style.borderWidth}px` : ''
  ].filter(Boolean)

  return declarations.length > 0 ? `  style ${id} ${declarations.join(',')}` : ''
}

function formatFlowchartEdgeStyle(index: number, style: FlowchartEdgeVisualStyle | undefined): string {
  const declarations = [
    style?.strokeColor ? `stroke:${style.strokeColor}` : '',
    style?.strokeWidth ? `stroke-width:${style.strokeWidth}px` : ''
  ].filter(Boolean)

  return declarations.length > 0 ? `  linkStyle ${index} ${declarations.join(',')}` : ''
}

function toSequenceDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
  const orderedNodes = [...nodes].sort((firstNode, secondNode) => {
    const xDelta = firstNode.position.x - secondNode.position.x
    return xDelta === 0 ? firstNode.position.y - secondNode.position.y : xDelta
  })

  const participantLines = orderedNodes
    .map((node) => `  participant ${sanitizeId(node.id)} as ${escapeSequenceText(node.data.label || node.id)}`)
    .join('\n')

  const messageLines = edges
    .map((edge) => {
      const label = edge.label ? String(edge.label) : `${edge.source} to ${edge.target}`
      return `  ${sanitizeId(edge.source)}->>${sanitizeId(edge.target)}: ${escapeSequenceText(label)}`
    })
    .join('\n')

  return ['sequenceDiagram', participantLines, messageLines].filter(Boolean).join('\n')
}

function toClassDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
  const classLines = nodes.map((node) => `  class ${sanitizeId(node.id)}`).join('\n')

  const relationshipLines = edges
    .map((edge) => {
      const label = edge.label ? ` : ${escapeClassText(String(edge.label))}` : ''
      return `  ${sanitizeId(edge.source)} --> ${sanitizeId(edge.target)}${label}`
    })
    .join('\n')

  return ['classDiagram', classLines, relationshipLines].filter(Boolean).join('\n')
}

function toStateDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
  const stateLines = nodes
    .map((node) => `  state "${escapeQuotedText(node.data.label || node.id)}" as ${sanitizeId(node.id)}`)
    .join('\n')

  const transitionLines = edges
    .map((edge) => {
      const label = edge.label ? ` : ${escapeStateText(String(edge.label))}` : ''
      return `  ${sanitizeId(edge.source)} --> ${sanitizeId(edge.target)}${label}`
    })
    .join('\n')

  return ['stateDiagram-v2', stateLines, transitionLines].filter(Boolean).join('\n')
}

function toErDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
  const entityLines = nodes
    .map((node) => {
      const entityId = sanitizeErId(node.id)
      const label = escapeErText(node.data.label || node.id)
      return `  ${entityId} {\n    string label "${label}"\n  }`
    })
    .join('\n')

  const relationshipLines = edges
    .map((edge) => {
      const label = edge.label ? sanitizeErRole(String(edge.label)) : 'relates_to'
      return `  ${sanitizeErId(edge.source)} ||--o{ ${sanitizeErId(edge.target)} : ${label}`
    })
    .join('\n')

  return ['erDiagram', entityLines, relationshipLines].filter(Boolean).join('\n')
}

function toMindmap(nodes: VisualNode[], edges: VisualEdge[]): string {
  const rootNode = findMindmapRoot(nodes, edges)
  if (!rootNode) {
    return 'mindmap'
  }

  const lines = ['mindmap', `  root((${escapeMindmapText(rootNode.data.label || rootNode.id)}))`]
  const visited = new Set<string>([rootNode.id])

  appendMindmapChildren(rootNode.id, edges, nodes, visited, lines, 4)

  const detachedNodes = nodes.filter((node) => !visited.has(node.id))
  detachedNodes.forEach((node) => {
    visited.add(node.id)
    lines.push(`${' '.repeat(4)}${escapeMindmapText(node.data.label || node.id)}`)
    appendMindmapChildren(node.id, edges, nodes, visited, lines, 6)
  })

  return lines.join('\n')
}

function findMindmapRoot(nodes: VisualNode[], edges: Edge[]): VisualNode | undefined {
  const targetedNodeIds = new Set(edges.map((edge) => edge.target))
  return nodes.find((node) => !targetedNodeIds.has(node.id)) ?? nodes[0]
}

function appendMindmapChildren(
  parentId: string,
  edges: VisualEdge[],
  nodes: VisualNode[],
  visited: Set<string>,
  lines: string[],
  indent: number
): void {
  edges
    .filter((edge) => edge.source === parentId)
    .forEach((edge) => {
      if (visited.has(edge.target)) {
        return
      }

      const childNode = nodes.find((node) => node.id === edge.target)
      if (!childNode) {
        return
      }

      visited.add(childNode.id)
      const edgeLabel = edge.label ? `${escapeMindmapText(String(edge.label))}: ` : ''
      lines.push(`${' '.repeat(indent)}${edgeLabel}${escapeMindmapText(childNode.data.label || childNode.id)}`)
      appendMindmapChildren(childNode.id, edges, nodes, visited, lines, indent + 2)
    })
}

export function nextNodeId(nodes: VisualNode[]): string {
  return `node_${nodes.length + 1}_${Date.now().toString(36)}`
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"')
}

function escapeSequenceText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function escapeQuotedText(text: string): string {
  return text.replace(/"/g, '\\"').replace(/\s+/g, ' ').trim()
}

function escapeClassText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function escapeStateText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function sanitizeErId(id: string): string {
  return sanitizeId(id).toUpperCase()
}

function escapeErText(text: string): string {
  return escapeQuotedText(text)
}

function sanitizeErRole(text: string): string {
  return text.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'relates_to'
}

function escapeMindmapText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
