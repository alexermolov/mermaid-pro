import { formatErCardinality } from '../er-cardinality'
import { sanitizeErId, sanitizeErRole, toErId } from '../ids'
import { escapeErText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

export function toErDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
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
