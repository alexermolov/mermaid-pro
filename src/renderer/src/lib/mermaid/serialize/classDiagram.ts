import type { DiagramDirection } from '../../../../../shared/diagram'
import { sanitizeId, toClassId } from '../ids'
import { escapeClassText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

export function toClassDiagram(nodes: VisualNode[], edges: VisualEdge[], direction: DiagramDirection): string {
  const classIdByNodeId = new Map(nodes.map((node) => [node.id, toClassId(node)]))
  const classLineByNodeId = new Map<string, string>()
  const noteLines: string[] = []

  for (const node of nodes) {
    const classId = classIdByNodeId.get(node.id) ?? sanitizeId(node.id)
    const classMembers = formatIndentedLines(node.data.classAttributes)
    const classMethods = formatIndentedLines(node.data.classMethods)
    const memberLines = [...classMembers, ...classMethods].map((line) => `    ${line}`).join('\n')
    const annotationLine = node.data.classAnnotation ? `    <<${escapeClassText(node.data.classAnnotation)}>>\n` : ''
    const classLine = memberLines
      ? `  class ${classId} {\n${annotationLine}${memberLines}\n  }`
      : `  class ${classId}${node.data.classAnnotation ? ` <<${escapeClassText(node.data.classAnnotation)}>>` : ''}`

    classLineByNodeId.set(node.id, classLine)

    if (node.data.classNote) {
      const normalizedNote = node.data.classNote
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\\n')

      if (normalizedNote) {
        noteLines.push(`  note for ${classId} "${escapeClassText(normalizedNote)}"`)
      }
    }
  }

  const namespaceNodes = nodes.filter((node) => Boolean(node.data.classNamespace))
  const plainNodes = nodes.filter((node) => !node.data.classNamespace)
  const classLines: string[] = []

  for (const node of plainNodes) {
    const classLine = classLineByNodeId.get(node.id)
    if (classLine) {
      classLines.push(classLine)
    }
  }

  const namespaceNames = Array.from(
    new Set(
      namespaceNodes
        .map((node) => node.data.classNamespace?.trim())
        .filter((namespace): namespace is string => Boolean(namespace))
    )
  ).sort((a, b) => a.localeCompare(b))

  for (const namespaceName of namespaceNames) {
    classLines.push(`  namespace ${namespaceName} {`)
    for (const node of namespaceNodes) {
      if (node.data.classNamespace !== namespaceName) {
        continue
      }
      const classLine = classLineByNodeId.get(node.id)
      if (classLine) {
        classLines.push(`    ${classLine.trimStart()}`)
      }
    }
    classLines.push('  }')
  }

  const relationshipLines = edges
    .map((edge) => {
      const label = edge.label ? ` : ${escapeClassText(String(edge.label))}` : ''
      const relationshipToken = edge.data?.classRelationshipToken ?? '-->'
      const isLollipop = relationshipToken === '()--' || relationshipToken === '--()'
      const sourceMultiplicity =
        !isLollipop && edge.data?.classSourceMultiplicity
          ? ` "${escapeClassText(edge.data.classSourceMultiplicity)}"`
          : ''
      const targetMultiplicity =
        !isLollipop && edge.data?.classTargetMultiplicity
          ? ` "${escapeClassText(edge.data.classTargetMultiplicity)}"`
          : ''
      const sourceId = classIdByNodeId.get(edge.source) ?? sanitizeId(edge.source)
      const targetId = classIdByNodeId.get(edge.target) ?? sanitizeId(edge.target)
      return `  ${sourceId}${sourceMultiplicity} ${relationshipToken}${targetMultiplicity} ${targetId}${label}`
    })
    .join('\n')

  const directionLine = direction === 'LR' ? '' : `  direction ${direction}`

  return ['classDiagram', directionLine, classLines.join('\n'), relationshipLines, noteLines.join('\n')].filter(Boolean).join('\n')
}
