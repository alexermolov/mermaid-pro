import type { DiagramDirection } from '../../../../../shared/diagram'
import { ensureNode } from '../graph-model'
import { autoLayoutNodes } from '../layout'
import { normalizeEscapedText } from '../text-utils'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'

export function parseClass(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []
  let direction: DiagramDirection = 'LR'
  const namespaceStack: string[] = []

  const appendNodeNote = (nodeId: string, noteText: string): void => {
    const node = ensureNode(nodes, nodeId, nodeId)
    node.data.classNote = [node.data.classNote, noteText].filter(Boolean).join('\n') || undefined
  }

  const setNodeAnnotation = (nodeId: string, annotation: string): void => {
    const node = ensureNode(nodes, nodeId, nodeId)
    node.data.classAnnotation = annotation
  }

  const ensureClassNode = (id: string, label?: string): VisualNode => {
    return ensureNode(
      nodes,
      id,
      label ?? id,
      namespaceStack.length > 0 ? { classNamespace: namespaceStack.join('.') } : undefined
    )
  }

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const directionMatch = line.match(/^direction\s+(TB|TD|LR|BT|RL)$/)
    if (directionMatch) {
      direction = directionMatch[1] === 'TB' ? 'TD' : (directionMatch[1] as DiagramDirection)
      continue
    }

    const namespaceMatch = line.match(/^namespace\s+(\S+)\s*\{$/)
    if (namespaceMatch) {
      namespaceStack.push(namespaceMatch[1])
      continue
    }

    if (line === '}') {
      if (namespaceStack.length > 0) {
        namespaceStack.pop()
      }
      continue
    }

    const noteMatch = line.match(/^note\s+for\s+(\S+)\s+"((?:\\.|[^"])*)"$/)
    if (noteMatch) {
      const [, id, noteText] = noteMatch
      appendNodeNote(id, normalizeEscapedText(noteText))
      continue
    }

    const annotationReferenceMatch = line.match(/^<<([^>]+)>>\s+(\S+)$/)
    if (annotationReferenceMatch) {
      const [, annotation, id] = annotationReferenceMatch
      setNodeAnnotation(id, annotation.trim())
      continue
    }

    const blockMatch = line.match(/^class\s+(\S+)(?:\s+<<([^>]+)>>)?\s*\{$/)
    if (blockMatch) {
      const id = blockMatch[1]
      const classAnnotation = blockMatch[2]?.trim()
      const attributes: string[] = []
      const methods: string[] = []
      index += 1

      while (index < lines.length && lines[index].trim() !== '}') {
        const member = lines[index].trim()
        const memberAnnotationMatch = member.match(/^<<([^>]+)>>$/)
        if (memberAnnotationMatch) {
          setNodeAnnotation(id, memberAnnotationMatch[1].trim())
        } else if (member.includes('(')) {
          methods.push(member)
        } else if (member) {
          attributes.push(member)
        }
        index += 1
      }

      const node = ensureClassNode(id, id)
      node.data = {
        ...node.data,
        classAttributes: attributes.join('\n') || undefined,
        classMethods: methods.join('\n') || undefined,
        ...(classAnnotation ? { classAnnotation } : {})
      }
      continue
    }

    const labeledClassMatch = line.match(/^class\s+(\S+)\s+\["((?:\\.|[^"])*)"\]$/)
    if (labeledClassMatch) {
      const [, id, label] = labeledClassMatch
      ensureClassNode(id, normalizeEscapedText(label))
      continue
    }

    const annotatedClassMatch = line.match(/^class\s+(\S+)\s+<<([^>]+)>>$/)
    if (annotatedClassMatch) {
      const [, id, annotation] = annotatedClassMatch
      const node = ensureClassNode(id, id)
      node.data.classAnnotation = annotation.trim()
      continue
    }

    const simpleClassMatch = line.match(/^class\s+(\S+)$/)
    if (simpleClassMatch) {
      ensureClassNode(simpleClassMatch[1], simpleClassMatch[1])
      continue
    }

    const relationshipMatch = line.match(
      /^(\S+)\s*(?:"([^"]+)")?\s*(<\|--|--\|>|-->|<--|\*--|--\*|o--|--o|--|\.\.>|<\.\.|\.\.\|>|<\|\.\.|\.\.|\(\)--|--\(\))\s*(?:"([^"]+)")?\s*(\S+)(?:\s*:\s*(.+))?$/
    )
    if (relationshipMatch) {
      const [, sourceId, sourceMultiplicity, relationshipToken, targetMultiplicity, targetId, label] = relationshipMatch
      ensureClassNode(sourceId, sourceId)
      ensureClassNode(targetId, targetId)
      edges.push({
        id: `${sourceId}-${targetId}-${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: label?.trim(),
        data: {
          classRelationshipToken: relationshipToken,
          classSourceMultiplicity: sourceMultiplicity?.trim(),
          classTargetMultiplicity: targetMultiplicity?.trim()
        }
      })
    }
  }

  return {
    diagramType: 'class',
    direction,
    nodes: autoLayoutNodes(Array.from(nodes.values()), edges, direction, 'class'),
    edges
  }
}
