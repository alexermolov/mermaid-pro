import type { DiagramDirection } from '../../../../../shared/diagram'
import { sanitizeId } from '../ids'
import { STATE_STAR_END_ID, STATE_STAR_START_ID } from '../stateDiagramIds'
import { escapeQuotedText, escapeStateText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

function toMermaidEndpoint(nodeId: string): string {
  if (nodeId === STATE_STAR_START_ID || nodeId === STATE_STAR_END_ID) {
    return '[*]'
  }

  return sanitizeId(nodeId)
}

export function toStateDiagram(nodes: VisualNode[], edges: VisualEdge[], direction: DiagramDirection): string {
  const lines: string[] = ['stateDiagram-v2']

  if (direction !== 'TD') {
    lines.push(`  direction ${direction}`)
  }

  const pseudoIds = new Set([STATE_STAR_START_ID, STATE_STAR_END_ID])

  const stateLines = nodes
    .filter((node) => !pseudoIds.has(node.id))
    .map((node) => {
      const stateId = sanitizeId(node.id)
      const labelLine = `  state "${escapeQuotedText(node.data.label || node.id)}" as ${stateId}`
      const descriptionLines = formatIndentedLines(node.data.stateDescription).map(
        (descriptionLine) => `  ${stateId} : ${escapeStateText(descriptionLine)}`
      )

      return [labelLine, ...descriptionLines].join('\n')
    })
    .filter(Boolean)
    .join('\n')

  if (stateLines.length > 0) {
    lines.push(stateLines)
  }

  const transitionLines = edges
    .map((edge) => {
      const source = toMermaidEndpoint(edge.source)
      const target = toMermaidEndpoint(edge.target)
      const label = edge.label ? ` : ${escapeStateText(String(edge.label))}` : ''
      const isConcurrency = edge.data?.stateConcurrency === true
      const connector = isConcurrency ? ' -- ' : ' --> '
      return `  ${source}${connector}${target}${label}`
    })
    .join('\n')

  if (transitionLines.length > 0) {
    lines.push(transitionLines)
  }

  return lines.join('\n')
}
