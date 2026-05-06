import { sanitizeId, toClassId } from '../ids'
import { escapeClassText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

export function toClassDiagram(nodes: VisualNode[], edges: VisualEdge[]): string {
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
