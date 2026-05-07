import type { DiagramDirection } from '../../../../../shared/diagram'
import { sanitizeId } from '../ids'
import { STATE_SCOPE_SEP, STATE_STAR_END_ID, STATE_STAR_START_ID } from '../stateDiagramIds'
import { deepestContainingComposite, isNodeInsideComposite, stateCompositeHasRenderableBody } from '../stateDiagramComposite'
import { escapeQuotedText, escapeStateText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

function mermaidLocalId(nodeId: string): string {
  if (!nodeId.includes(STATE_SCOPE_SEP)) {
    return nodeId
  }

  return nodeId.slice(nodeId.lastIndexOf(STATE_SCOPE_SEP) + STATE_SCOPE_SEP.length)
}

function toMermaidEndpoint(id: string, nodeById: Map<string, VisualNode>): string {
  if (id === STATE_STAR_START_ID || id === STATE_STAR_END_ID) {
    return '[*]'
  }

  const node = nodeById.get(id)
  if (node?.data.statePseudo) {
    return '[*]'
  }

  return sanitizeId(mermaidLocalId(id))
}

function isDirectChildOfComposite(nodeById: Map<string, VisualNode>, compositeId: string, node: VisualNode): boolean {
  if (node.parentId === compositeId) {
    return true
  }
  const ownerId = node.data.stateCompositeOwnerId
  if (!ownerId || ownerId !== compositeId) {
    return false
  }
  const ownerNode = nodeById.get(ownerId)
  return Boolean(ownerNode?.data.stateIsComposite)
}

function emitStateDeclaration(node: VisualNode, indent: string): string {
  const localId = sanitizeId(mermaidLocalId(node.id))
  const label = node.data.label || mermaidLocalId(node.id)
  const stereotype = node.data.stateStereotype?.trim()

  if (stereotype) {
    const normalized = stereotype.replace(/^<<\s*/, '').replace(/\s*>>$/, '')
    return `${indent}state ${localId} <<${normalized}>>`
  }

  return `${indent}state "${escapeQuotedText(label)}" as ${localId}`
}

function emitStateNote(lines: string[], node: VisualNode, indent: string): void {
  const note = node.data.stateNote?.trim()
  if (!note) {
    return
  }

  const side = node.data.stateNotePosition === 'left' ? 'left' : 'right'
  const localId = sanitizeId(mermaidLocalId(node.id))
  const noteLines = formatIndentedLines(note)

  if (noteLines.length <= 1) {
    lines.push(`${indent}note ${side} of ${localId} : ${escapeStateText(noteLines[0] ?? note)}`)
    return
  }

  lines.push(`${indent}note ${side} of ${localId}`)
  for (const line of noteLines) {
    lines.push(`${indent}  ${escapeStateText(line)}`)
  }
  lines.push(`${indent}end note`)
}

function emitCompositeBlock(
  composite: VisualNode,
  nodes: VisualNode[],
  edges: VisualEdge[],
  lines: string[],
  indent: string,
  emittedEdgeIds: Set<string>,
  nodeById: Map<string, VisualNode>
): void {
  const children = nodes.filter((n) => isDirectChildOfComposite(nodeById, composite.id, n)).sort((a, b) => a.id.localeCompare(b.id))
  const localComposite = mermaidLocalId(composite.id)

  if (!stateCompositeHasRenderableBody(composite, nodes, edges)) {
    lines.push(`${indent}state "${escapeQuotedText(composite.data.label || localComposite)}" as ${sanitizeId(localComposite)}`)
    return
  }

  lines.push(`${indent}state "${escapeQuotedText(composite.data.label || localComposite)}" as ${sanitizeId(localComposite)} {`)

  const deeper = `${indent}  `
  for (const child of children) {
    if (child.data.stateIsComposite) {
      emitCompositeBlock(child, nodes, edges, lines, deeper, emittedEdgeIds, nodeById)
    } else if (!child.data.statePseudo) {
      const lid = mermaidLocalId(child.id)
      lines.push(emitStateDeclaration(child, deeper))
      for (const descriptionLine of formatIndentedLines(child.data.stateDescription)) {
        lines.push(`${deeper}${sanitizeId(lid)} : ${escapeStateText(descriptionLine)}`)
      }
      emitStateNote(lines, child, deeper)
    }
  }

  for (const edge of edges) {
    if (deepestContainingComposite(edge, nodes) !== composite.id) {
      continue
    }

    if (emittedEdgeIds.has(edge.id)) {
      continue
    }

    emittedEdgeIds.add(edge.id)
    const source = toMermaidEndpoint(edge.source, nodeById)
    const target = toMermaidEndpoint(edge.target, nodeById)
    const label = edge.label ? ` : ${escapeStateText(String(edge.label))}` : ''
    const isConcurrency = edge.data?.stateConcurrency === true
    const connector = isConcurrency ? ' -- ' : ' --> '
    lines.push(`${deeper}${source}${connector}${target}${label}`)
  }

  lines.push(`${indent}}`)
}

export function toStateDiagram(nodes: VisualNode[], edges: VisualEdge[], direction: DiagramDirection): string {
  const lines: string[] = ['stateDiagram-v2']
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  if (direction !== 'TD') {
    lines.push(`  direction ${direction}`)
  }

  const pseudoIds = new Set([STATE_STAR_START_ID, STATE_STAR_END_ID])
  const emittedEdgeIds = new Set<string>()

  const roots = nodes
    .filter((n) => {
      if (n.parentId) {
        return false
      }
      const ownerId = n.data.stateCompositeOwnerId
      if (!ownerId) {
        return true
      }
      return !isNodeInsideComposite(nodeById, ownerId, n.id)
    })
    .sort((a, b) => a.id.localeCompare(b.id))

  for (const root of roots) {
    if (pseudoIds.has(root.id)) {
      continue
    }

    if (root.data.stateIsComposite) {
      emitCompositeBlock(root, nodes, edges, lines, '  ', emittedEdgeIds, nodeById)
      continue
    }

    const stateId = sanitizeId(mermaidLocalId(root.id))
    lines.push(emitStateDeclaration(root, '  '))
    for (const descriptionLine of formatIndentedLines(root.data.stateDescription)) {
      lines.push(`  ${stateId} : ${escapeStateText(descriptionLine)}`)
    }
    emitStateNote(lines, root, '  ')
  }

  for (const edge of edges) {
    if (emittedEdgeIds.has(edge.id)) {
      continue
    }

    if (deepestContainingComposite(edge, nodes) !== null) {
      continue
    }

    const source = toMermaidEndpoint(edge.source, nodeById)
    const target = toMermaidEndpoint(edge.target, nodeById)
    const label = edge.label ? ` : ${escapeStateText(String(edge.label))}` : ''
    const isConcurrency = edge.data?.stateConcurrency === true
    const connector = isConcurrency ? ' -- ' : ' --> '
    lines.push(`  ${source}${connector}${target}${label}`)
  }

  return lines.join('\n')
}
