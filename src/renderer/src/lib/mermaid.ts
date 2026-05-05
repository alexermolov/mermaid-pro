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

export type ErCardinality = 'one' | 'zeroOrOne' | 'oneOrMore' | 'zeroOrMore'
export type ErRelationshipLineStyle = 'identifying' | 'nonIdentifying'

export type VisualNodeData = {
  label: string
  classAttributes?: string
  classMethods?: string
  erAttributes?: string
  stateDescription?: string
  shape?: FlowchartNodeShape
  style?: FlowchartNodeStyle
  onLabelChange?: (id: string, label: string) => void
  onDataChange?: (id: string, data: Partial<EditableVisualNodeData>) => void
  diagramType?: DiagramType
  direction?: DiagramDirection
}

export type VisualNode = Node<VisualNodeData>

export type EditableVisualNodeData = Pick<
  VisualNodeData,
  'label' | 'classAttributes' | 'classMethods' | 'erAttributes' | 'stateDescription'
>

export type VisualEdgeData = {
  lineStyle?: FlowchartEdgeStyle
  visualStyle?: FlowchartEdgeVisualStyle
  erSourceCardinality?: ErCardinality
  erTargetCardinality?: ErCardinality
  erRelationshipLineStyle?: ErRelationshipLineStyle
}

export type VisualEdge = Edge<VisualEdgeData>

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

export type ParsedMermaidDiagram = {
  diagramType: DiagramType
  direction: DiagramDirection
  nodes: VisualNode[]
  edges: VisualEdge[]
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
  const classIdByNodeId = new Map(nodes.map((node) => [node.id, toClassId(node)]))
  const classLines = nodes
    .map((node) => {
      const classId = classIdByNodeId.get(node.id) ?? sanitizeId(node.id)
      const classMembers = formatIndentedLines(node.data.classAttributes)
      const classMethods = formatIndentedLines(node.data.classMethods)
      const memberLines = [...classMembers, ...classMethods].map((line) => `    ${line}`).join('\n')

      return memberLines ? `  class ${classId} {\n${memberLines}\n  }` : `  class ${classId}`
    })
    .join('\n')

  const relationshipLines = edges
    .map((edge) => {
      const label = edge.label ? ` : ${escapeClassText(String(edge.label))}` : ''
      const sourceId = classIdByNodeId.get(edge.source) ?? sanitizeId(edge.source)
      const targetId = classIdByNodeId.get(edge.target) ?? sanitizeId(edge.target)
      return `  ${sourceId} --> ${targetId}${label}`
    })
    .join('\n')

  return ['classDiagram', classLines, relationshipLines].filter(Boolean).join('\n')
}

function toStateDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
  const stateLines = nodes
    .map((node) => {
      const stateId = sanitizeId(node.id)
      const labelLine = `  state "${escapeQuotedText(node.data.label || node.id)}" as ${stateId}`
      const descriptionLines = formatIndentedLines(node.data.stateDescription).map(
        (line) => `  ${stateId} : ${escapeStateText(line)}`
      )

      return [labelLine, ...descriptionLines].join('\n')
    })
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
  const entityIdByNodeId = new Map(nodes.map((node) => [node.id, toErId(node)]))
  const entityLines = nodes
    .map((node) => {
      const entityId = entityIdByNodeId.get(node.id) ?? sanitizeErId(node.id)
      const label = escapeErText(node.data.label || node.id)
      const attributeLines = formatErAttributeLines(node.data.erAttributes)
      const bodyLines = attributeLines.length > 0 ? attributeLines : [`string label "${label}"`]
      return `  ${entityId} {\n${bodyLines.map((line) => `    ${line}`).join('\n')}\n  }`
    })
    .join('\n')

  const relationshipLines = edges
    .map((edge) => {
      const label = edge.label ? sanitizeErRole(String(edge.label)) : 'relates_to'
      const sourceId = entityIdByNodeId.get(edge.source) ?? sanitizeErId(edge.source)
      const targetId = entityIdByNodeId.get(edge.target) ?? sanitizeErId(edge.target)
      return `  ${sourceId} ${formatErRelationship(edge)} ${targetId} : ${label}`
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

export function parseMermaid(code: string): ParsedMermaidDiagram {
  const lines = code
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmedLine = line.trim()
      return trimmedLine.length > 0 && !trimmedLine.startsWith('%%')
    })

  const header = lines[0]?.trim() ?? ''

  if (/^(flowchart|graph)\s+(TD|LR|BT|RL)$/.test(header)) {
    return parseFlowchart(lines)
  }

  if (header === 'sequenceDiagram') {
    return parseSequence(lines)
  }

  if (header === 'classDiagram') {
    return parseClass(lines)
  }

  if (header === 'stateDiagram-v2' || header === 'stateDiagram') {
    return parseState(lines)
  }

  if (header === 'erDiagram') {
    return parseEr(lines)
  }

  if (header === 'mindmap') {
    return parseMindmap(lines)
  }

  throw new Error('Unsupported Mermaid diagram type')
}

function sanitizeId(id: string): string {
  const sanitizedId = id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '')
  if (!sanitizedId) {
    return 'node'
  }

  return /^[a-zA-Z_]/.test(sanitizedId) ? sanitizedId : `node_${sanitizedId}`
}

function toClassId(node: VisualNode): string {
  return sanitizeId(node.data.label || node.id)
}

function toErId(node: VisualNode): string {
  return sanitizeErId(node.data.label || node.id)
}

function formatIndentedLines(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function formatErAttributeLines(text: string | undefined): string[] {
  return formatIndentedLines(text).map((line) => {
    const [type, ...nameParts] = line.split(/\s+/)

    if (!type || nameParts.length === 0) {
      return `string ${sanitizeErRole(line)}`
    }

    return `${sanitizeErRole(type)} ${sanitizeErRole(nameParts.join('_'))}`
  })
}

function formatErRelationship(edge: VisualEdge): string {
  const sourceCardinality = formatErCardinality(edge.data?.erSourceCardinality ?? 'one', 'source')
  const targetCardinality = formatErCardinality(edge.data?.erTargetCardinality ?? 'zeroOrMore', 'target')
  const lineStyle = edge.data?.erRelationshipLineStyle === 'nonIdentifying' ? '..' : '--'

  return `${sourceCardinality}${lineStyle}${targetCardinality}`
}

function formatErCardinality(cardinality: ErCardinality, side: 'source' | 'target'): string {
  const sourceMarkers: Record<ErCardinality, string> = {
    one: '||',
    zeroOrOne: 'o|',
    oneOrMore: '}|',
    zeroOrMore: '}o'
  }
  const targetMarkers: Record<ErCardinality, string> = {
    one: '||',
    zeroOrOne: '|o',
    oneOrMore: '|{',
    zeroOrMore: 'o{'
  }

  return side === 'source' ? sourceMarkers[cardinality] : targetMarkers[cardinality]
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

function parseFlowchart(lines: string[]): ParsedMermaidDiagram {
  const headerMatch = lines[0]?.match(/^(?:flowchart|graph)\s+(TD|LR|BT|RL)$/)
  const direction = (headerMatch?.[1] as DiagramDirection | undefined) ?? 'TD'
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []
  const edgeIndexById = new Map<number, string>()
  let linkIndex = 0

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (line === 'end' || line.startsWith('subgraph ') || line.startsWith('classDef ') || line.startsWith('class ')) {
      continue
    }

    if (line.startsWith('style ')) {
      applyFlowchartNodeStyle(line, nodes)
      continue
    }

    if (line.startsWith('linkStyle ')) {
      applyFlowchartEdgeStyle(line, edges, edgeIndexById)
      continue
    }

    if (tryParseFlowchartEdge(line, nodes, edges, edgeIndexById, linkIndex)) {
      linkIndex += 1
      continue
    }

    tryParseFlowchartNode(line, nodes)
  }

  return {
    diagramType: 'flowchart',
    direction,
    nodes: layoutParsedNodes(Array.from(nodes.values()), direction),
    edges
  }
}

function parseSequence(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const participantMatch = line.match(/^participant\s+(\S+)(?:\s+as\s+(.+))?$/)
    if (participantMatch) {
      const id = participantMatch[1]
      const label = normalizeEscapedText(participantMatch[2] ?? id)
      ensureNode(nodes, id, label)
      continue
    }

    const messageMatch = line.match(/^(\S+)->>(\S+):\s*(.+)$/)
    if (messageMatch) {
      const [, sourceId, targetId, label] = messageMatch
      ensureNode(nodes, sourceId)
      ensureNode(nodes, targetId)
      edges.push({ id: `${sourceId}-${targetId}-${edges.length + 1}`, source: sourceId, target: targetId, label: label.trim() })
    }
  }

  return {
    diagramType: 'sequence',
    direction: 'LR',
    nodes: layoutParsedNodes(Array.from(nodes.values()), 'LR'),
    edges
  }
}

function parseClass(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const blockMatch = line.match(/^class\s+(\S+)\s*\{$/)
    if (blockMatch) {
      const id = blockMatch[1]
      const attributes: string[] = []
      const methods: string[] = []
      index += 1

      while (index < lines.length && lines[index].trim() !== '}') {
        const member = lines[index].trim()
        if (member.includes('(')) {
          methods.push(member)
        } else if (member) {
          attributes.push(member)
        }
        index += 1
      }

      ensureNode(nodes, id, id, {
        classAttributes: attributes.join('\n') || undefined,
        classMethods: methods.join('\n') || undefined
      })
      continue
    }

    const simpleClassMatch = line.match(/^class\s+(\S+)$/)
    if (simpleClassMatch) {
      ensureNode(nodes, simpleClassMatch[1], simpleClassMatch[1])
      continue
    }

    const relationshipMatch = line.match(/^(\S+)\s+-->\s+(\S+)(?:\s+:\s+(.+))?$/)
    if (relationshipMatch) {
      const [, sourceId, targetId, label] = relationshipMatch
      ensureNode(nodes, sourceId, sourceId)
      ensureNode(nodes, targetId, targetId)
      edges.push({ id: `${sourceId}-${targetId}-${edges.length + 1}`, source: sourceId, target: targetId, label: label?.trim() })
    }
  }

  return {
    diagramType: 'class',
    direction: 'LR',
    nodes: layoutParsedNodes(Array.from(nodes.values()), 'LR'),
    edges
  }
}

function parseState(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const stateMatch = line.match(/^state\s+"((?:\\.|[^"])*)"\s+as\s+(\S+)$/)
    if (stateMatch) {
      const [, label, id] = stateMatch
      ensureNode(nodes, id, normalizeEscapedText(label))
      continue
    }

    const descriptionMatch = line.match(/^(\S+)\s+:\s+(.+)$/)
    if (descriptionMatch) {
      const [, id, description] = descriptionMatch
      const node = ensureNode(nodes, id, id)
      node.data.stateDescription = [node.data.stateDescription, description.trim()].filter(Boolean).join('\n') || undefined
      continue
    }

    const transitionMatch = line.match(/^(\S+)\s+-->\s+(\S+)(?:\s+:\s+(.+))?$/)
    if (transitionMatch) {
      const [, sourceId, targetId, label] = transitionMatch
      ensureNode(nodes, sourceId, sourceId)
      ensureNode(nodes, targetId, targetId)
      edges.push({ id: `${sourceId}-${targetId}-${edges.length + 1}`, source: sourceId, target: targetId, label: label?.trim() })
    }
  }

  return {
    diagramType: 'state',
    direction: 'TD',
    nodes: layoutParsedNodes(Array.from(nodes.values()), 'TD'),
    edges
  }
}

function parseEr(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const entityMatch = line.match(/^(\S+)\s+\{$/)
    if (entityMatch) {
      const id = entityMatch[1]
      const attributes: string[] = []
      index += 1

      while (index < lines.length && lines[index].trim() !== '}') {
        const attribute = lines[index].trim()
        if (attribute) {
          attributes.push(attribute)
        }
        index += 1
      }

      ensureNode(nodes, id, id, { erAttributes: attributes.join('\n') || undefined })
      continue
    }

    const relationshipMatch = line.match(/^(\S+)\s+([|}o]{2}(?:--|\.\.)(?:[|{o]{2}))\s+(\S+)\s+:\s+(.+)$/)
    if (relationshipMatch) {
      const [, sourceId, relationship, targetId, label] = relationshipMatch
      ensureNode(nodes, sourceId, sourceId)
      ensureNode(nodes, targetId, targetId)
      edges.push({
        id: `${sourceId}-${targetId}-${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: label.trim(),
        data: parseErRelationshipData(relationship)
      })
    }
  }

  return {
    diagramType: 'er',
    direction: 'LR',
    nodes: layoutParsedNodes(Array.from(nodes.values()), 'LR'),
    edges
  }
}

function parseMindmap(lines: string[]): ParsedMermaidDiagram {
  const nodes: VisualNode[] = []
  const edges: VisualEdge[] = []
  const stack: Array<{ id: string; indent: number }> = []

  for (const rawLine of lines.slice(1)) {
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0
    const content = rawLine.trim()

    if (!content) {
      continue
    }

    const label = normalizeMindmapLabel(content)
    const id = sanitizeId(label) || `topic_${nodes.length + 1}`
    const uniqueId = createUniqueNodeId(id, nodes.map((node) => node.id))
    nodes.push(createParsedNode(uniqueId, label))

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]
    if (parent) {
      edges.push({ id: `${parent.id}-${uniqueId}-${edges.length + 1}`, source: parent.id, target: uniqueId })
    }

    stack.push({ id: uniqueId, indent })
  }

  return {
    diagramType: 'mindmap',
    direction: 'LR',
    nodes: layoutParsedNodes(nodes, 'LR'),
    edges
  }
}

function tryParseFlowchartNode(line: string, nodes: Map<string, VisualNode>): boolean {
  const descriptor = parseFlowchartNodeDescriptor(line)
  if (!descriptor) {
    return false
  }

  ensureNode(nodes, descriptor.id, descriptor.label, {
    ...(descriptor.shape ? { shape: descriptor.shape } : {})
  })
  return true
}

function tryParseFlowchartEdge(
  line: string,
  nodes: Map<string, VisualNode>,
  edges: VisualEdge[],
  edgeIndexById: Map<number, string>,
  linkIndex: number
): boolean {
  const parsedEdge = parseFlowchartEdgeExpression(line)
  if (!parsedEdge) {
    return false
  }

  const sourceNode = ensureNodeFromFlowchartDescriptor(nodes, parsedEdge.source)
  const targetNode = ensureNodeFromFlowchartDescriptor(nodes, parsedEdge.target)
  const edgeId = `${sourceNode.id}-${targetNode.id}-${edges.length + 1}`
  edges.push({
    id: edgeId,
    source: sourceNode.id,
    target: targetNode.id,
    label: parsedEdge.label,
    data: { lineStyle: parsedEdge.lineStyle }
  })
  edgeIndexById.set(linkIndex, edgeId)
  return true
}

function applyFlowchartNodeStyle(line: string, nodes: Map<string, VisualNode>): void {
  const styleMatch = line.match(/^style\s+(\S+)\s+(.+)$/)
  if (!styleMatch) {
    return
  }

  const [, id, declarationText] = styleMatch
  const node = ensureNode(nodes, id)
  const declarations = parseStyleDeclarations(declarationText)
  node.data.style = {
    ...(node.data.style ?? {}),
    ...(declarations.fill ? { fillColor: declarations.fill } : {}),
    ...(declarations.stroke ? { strokeColor: declarations.stroke } : {}),
    ...(declarations.color ? { textColor: declarations.color } : {}),
    ...(declarations['stroke-width'] ? { borderWidth: parsePixelValue(declarations['stroke-width']) } : {})
  }
}

function applyFlowchartEdgeStyle(line: string, edges: VisualEdge[], edgeIndexById: Map<number, string>): void {
  const styleMatch = line.match(/^linkStyle\s+(\d+)\s+(.+)$/)
  if (!styleMatch) {
    return
  }

  const [, indexText, declarationText] = styleMatch
  const edgeId = edgeIndexById.get(Number(indexText))
  const edge = edges.find((item) => item.id === edgeId)

  if (!edge) {
    return
  }

  const declarations = parseStyleDeclarations(declarationText)
  edge.data = {
    ...(edge.data ?? {}),
    visualStyle: {
      ...(edge.data?.visualStyle ?? {}),
      ...(declarations.stroke ? { strokeColor: declarations.stroke } : {}),
      ...(declarations['stroke-width'] ? { strokeWidth: parsePixelValue(declarations['stroke-width']) } : {})
    }
  }
}

function parseStyleDeclarations(text: string): Record<string, string> {
  return text.split(',').reduce<Record<string, string>>((result, declaration) => {
    const [key, value] = declaration.split(':').map((item) => item.trim())
    if (key && value) {
      result[key] = value
    }
    return result
  }, {})
}

function parsePixelValue(value: string): number | undefined {
  const numericValue = Number.parseFloat(value.replace(/px$/i, ''))
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function parseFlowchartNodeDescriptor(
  descriptorText: string
): { id: string; label: string; shape?: FlowchartNodeShape } | undefined {
  const descriptor = descriptorText.trim()

  for (const [shape, pattern] of flowchartDescriptorPatterns) {
    const match = descriptor.match(pattern)
    if (match) {
      const [, id, label] = match
      return {
        id,
        label: normalizeFlowchartLabel(label),
        shape
      }
    }
  }

  const plainIdMatch = descriptor.match(/^([A-Za-z0-9_:.\-]+)$/)
  if (plainIdMatch) {
    return {
      id: plainIdMatch[1],
      label: plainIdMatch[1]
    }
  }

  return undefined
}

function parseFlowchartEdgeExpression(
  line: string
):
  | {
      source: { id: string; label: string; shape?: FlowchartNodeShape }
      target: { id: string; label: string; shape?: FlowchartNodeShape }
      label?: string
      lineStyle: FlowchartEdgeStyle
    }
  | undefined {
  const pipeLabelMatch = line.match(/^(.*?)\s+(-->|---|-\.->|-\.\-|==>|===)\|([^|]+)\|\s+(.*?)$/)
  if (pipeLabelMatch) {
    const [, sourceText, linkToken, label, targetText] = pipeLabelMatch
    return createFlowchartEdgeDescriptor(sourceText, targetText, parseFlowchartLineStyle(linkToken), normalizeEscapedText(label))
  }

  const spacedLabelMatch = line.match(/^(.*?)\s+(--|-\.|==)\s+(.+?)\s+(-->|---|\.->|\.\-|==>|==)\s+(.*?)$/)
  if (spacedLabelMatch) {
    const [, sourceText, startToken, label, endToken, targetText] = spacedLabelMatch
    const lineStyle = parseFlowchartLineStylePair(startToken, endToken)
    if (!lineStyle) {
      return undefined
    }

    return createFlowchartEdgeDescriptor(sourceText, targetText, lineStyle, normalizeEscapedText(label))
  }

  const simpleMatch = line.match(/^(.*?)\s+(-->|---|-\.->|-\.\-|==>|===)\s+(.*?)$/)
  if (!simpleMatch) {
    return undefined
  }

  const [, sourceText, linkToken, targetText] = simpleMatch
  return createFlowchartEdgeDescriptor(sourceText, targetText, parseFlowchartLineStyle(linkToken))
}

function createFlowchartEdgeDescriptor(
  sourceText: string,
  targetText: string,
  lineStyle: FlowchartEdgeStyle,
  label?: string
):
  | {
      source: { id: string; label: string; shape?: FlowchartNodeShape }
      target: { id: string; label: string; shape?: FlowchartNodeShape }
      label?: string
      lineStyle: FlowchartEdgeStyle
    }
  | undefined {
  const source = parseFlowchartNodeDescriptor(sourceText)
  const target = parseFlowchartNodeDescriptor(targetText)

  if (!source || !target) {
    return undefined
  }

  return {
    source,
    target,
    label,
    lineStyle
  }
}

function ensureNodeFromFlowchartDescriptor(
  nodes: Map<string, VisualNode>,
  descriptor: { id: string; label: string; shape?: FlowchartNodeShape }
): VisualNode {
  return ensureNode(nodes, descriptor.id, descriptor.label, {
    ...(descriptor.shape ? { shape: descriptor.shape } : {})
  })
}

function parseFlowchartShape(token: string): FlowchartNodeShape {
  switch (token) {
    case '((': return 'circle'
    case '(((': return 'doubleCircle'
    case '([': return 'stadium'
    case '[[': return 'subroutine'
    case '[/': return 'trapezoid'
    case '[\\': return 'inverseTrapezoid'
    case '("': return 'rounded'
    case '{"': return 'diamond'
    case '{{"': return 'hexagon'
    case '>"': return 'asymmetric'
    case '[':
    case '["':
    default:
      return 'rectangle'
  }
}

function parseFlowchartLineStylePair(startToken: string, endToken: string): FlowchartEdgeStyle | undefined {
  if (startToken === '--' && endToken === '-->') {
    return 'arrow'
  }

  if (startToken === '--' && endToken === '---') {
    return 'line'
  }

  if (startToken === '-.' && endToken === '.->') {
    return 'dottedArrow'
  }

  if (startToken === '-.' && endToken === '.-') {
    return 'dottedLine'
  }

  if (startToken === '==' && endToken === '==>') {
    return 'thickArrow'
  }

  if (startToken === '==' && endToken === '==') {
    return 'thickLine'
  }

  return undefined
}

function parseFlowchartLineStyle(token: string): FlowchartEdgeStyle {
  switch (token) {
    case '---':
      return 'line'
    case '-.->':
      return 'dottedArrow'
    case '-.-':
      return 'dottedLine'
    case '==>':
      return 'thickArrow'
    case '===':
      return 'thickLine'
    case '-->':
    default:
      return 'arrow'
  }
}

function parseErRelationshipData(relationship: string): VisualEdgeData {
  const sourceMarker = relationship.slice(0, 2)
  const lineToken = relationship.includes('..') ? '..' : '--'
  const targetMarker = relationship.slice(-2)

  return {
    erSourceCardinality: parseErCardinality(sourceMarker, 'source'),
    erTargetCardinality: parseErCardinality(targetMarker, 'target'),
    erRelationshipLineStyle: lineToken === '..' ? 'nonIdentifying' : 'identifying'
  }
}

function parseErCardinality(marker: string, side: 'source' | 'target'): ErCardinality {
  if (side === 'source') {
    switch (marker) {
      case '||': return 'one'
      case 'o|': return 'zeroOrOne'
      case '}|': return 'oneOrMore'
      case '}o': return 'zeroOrMore'
      default: return 'one'
    }
  }

  switch (marker) {
    case '||': return 'one'
    case '|o': return 'zeroOrOne'
    case '|{': return 'oneOrMore'
    case 'o{': return 'zeroOrMore'
    default: return 'zeroOrMore'
  }
}

function ensureNode(
  nodes: Map<string, VisualNode>,
  id: string,
  label?: string,
  data?: Partial<VisualNodeData>
): VisualNode {
  const existingNode = nodes.get(id)
  if (existingNode) {
    existingNode.data = {
      ...existingNode.data,
      ...(label ? { label } : {}),
      ...(data ?? {})
    }
    return existingNode
  }

  const nextNode = createParsedNode(id, label ?? id, data)
  nodes.set(id, nextNode)
  return nextNode
}

function createParsedNode(id: string, label: string, data?: Partial<VisualNodeData>): VisualNode {
  return {
    id,
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: {
      label,
      ...(data ?? {})
    }
  }
}

function layoutParsedNodes(nodes: VisualNode[], direction: DiagramDirection): VisualNode[] {
  const origin = { x: 120, y: 140 }
  const gap = { x: 240, y: 140 }
  const lastIndex = nodes.length - 1

  return nodes.map((node, index) => {
    switch (direction) {
      case 'BT':
        return { ...node, position: { x: origin.x, y: origin.y + (lastIndex - index) * gap.y } }
      case 'LR':
        return { ...node, position: { x: origin.x + index * gap.x, y: origin.y } }
      case 'RL':
        return { ...node, position: { x: origin.x + (lastIndex - index) * gap.x, y: origin.y } }
      case 'TD':
      default:
        return { ...node, position: { x: origin.x, y: origin.y + index * gap.y } }
    }
  })
}

function normalizeEscapedText(text: string): string {
  return text.replace(/\\"/g, '"').replace(/^['"]|['"]$/g, '').trim()
}

function normalizeFlowchartLabel(text: string): string {
  return normalizeEscapedText(text)
}

function normalizeMindmapLabel(content: string): string {
  return content
    .replace(/^root\(\(/, '')
    .replace(/\)\)$/, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/^[^:]+:\s+/, '')
    .trim()
}

function createUniqueNodeId(baseId: string, existingIds: string[]): string {
  if (!existingIds.includes(baseId)) {
    return baseId
  }

  let counter = 2
  while (existingIds.includes(`${baseId}_${counter}`)) {
    counter += 1
  }

  return `${baseId}_${counter}`
}

const flowchartDescriptorPatterns: Array<[FlowchartNodeShape, RegExp]> = [
  ['doubleCircle', /^([A-Za-z0-9_:.\-]+)\(\(\((.+?)\)\)\)$/],
  ['circle', /^([A-Za-z0-9_:.\-]+)\(\((.+?)\)\)$/],
  ['cylinder', /^([A-Za-z0-9_:.\-]+)\[\((.+?)\)\]$/],
  ['stadium', /^([A-Za-z0-9_:.\-]+)\(\[(.+?)\]\)$/],
  ['subroutine', /^([A-Za-z0-9_:.\-]+)\[\[(.+?)\]\]$/],
  ['hexagon', /^([A-Za-z0-9_:.\-]+)\{\{(.+?)\}\}$/],
  ['diamond', /^([A-Za-z0-9_:.\-]+)\{(.+?)\}$/],
  ['parallelogram', /^([A-Za-z0-9_:.\-]+)\[\/(.+?)\/\]$/],
  ['trapezoid', /^([A-Za-z0-9_:.\-]+)\[\/(.+?)\\\]$/],
  ['inverseTrapezoid', /^([A-Za-z0-9_:.\-]+)\[\\(.+?)\/\]$/],
  ['asymmetric', /^([A-Za-z0-9_:.\-]+)>(.+?)\]$/],
  ['rounded', /^([A-Za-z0-9_:.\-]+)\((.+?)\)$/],
  ['rectangle', /^([A-Za-z0-9_:.\-]+)\[(.+?)\]$/]
]
