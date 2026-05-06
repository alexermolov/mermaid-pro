import { sanitizeId } from '../ids'
import { sequenceArrowByMessageType } from '../sequence-constants'
import { escapeSequenceText } from '../text-utils'
import type { SequenceMessageType, VisualEdge, VisualNode } from '../types'

export function toSequenceDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
  const orderedNodes = [...nodes].sort((firstNode, secondNode) => {
    const xDelta = firstNode.position.x - secondNode.position.x
    return xDelta === 0 ? firstNode.position.y - secondNode.position.y : xDelta
  })

  const participantLines = orderedNodes
    .map((node) => formatSequenceParticipantDeclaration(node))
    .join('\n')

  const messageLines = edges
    .map((edge, index) => ({ edge, index }))
    .sort((firstItem, secondItem) => compareSequenceEdges(firstItem.edge, secondItem.edge, firstItem.index, secondItem.index))
    .map(({ edge }) => {
      const label = edge.label ? String(edge.label) : `${edge.source} to ${edge.target}`
      const operator = edge.data?.sequenceArrowOperator ?? formatSequenceArrow(edge.data?.sequenceMessageType)
      return `  ${sanitizeId(edge.source)}${operator}${sanitizeId(edge.target)}: ${escapeSequenceText(label)}`
    })
    .join('\n')

  return ['sequenceDiagram', participantLines, messageLines].filter(Boolean).join('\n')
}

function formatSequenceArrow(messageType: SequenceMessageType = 'async'): string {
  return sequenceArrowByMessageType[messageType]
}

function formatSequenceParticipantDeclaration(node: VisualNode): string {
  const kind = node.data.sequenceParticipantKind ?? 'participant'
  const type = node.data.sequenceParticipantType
  const id = sanitizeId(node.id)
  const label = node.data.label || node.id
  const alias = label !== node.id ? ` as ${escapeSequenceText(label)}` : ''

  if (!type) {
    return `  ${kind} ${id}${alias}`
  }

  return `  ${kind} ${id}@${JSON.stringify({ type })}${alias}`
}

function compareSequenceEdges(
  firstEdge: VisualEdge,
  secondEdge: VisualEdge,
  firstIndex: number,
  secondIndex: number
): number {
  const firstOrder = firstEdge.data?.sequenceOrder
  const secondOrder = secondEdge.data?.sequenceOrder

  if (typeof firstOrder === 'number' && typeof secondOrder === 'number' && firstOrder !== secondOrder) {
    return firstOrder - secondOrder
  }

  if (typeof firstOrder === 'number') {
    return -1
  }

  if (typeof secondOrder === 'number') {
    return 1
  }

  return firstIndex - secondIndex
}
