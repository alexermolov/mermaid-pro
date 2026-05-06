import { sanitizeId } from '../ids'
import { escapeQuotedText, escapeStateText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

export function toStateDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
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
