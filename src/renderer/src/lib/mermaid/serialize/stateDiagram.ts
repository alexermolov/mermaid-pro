import type { DiagramDirection } from '../../../../../shared/diagram'
import { sanitizeId } from '../ids'
import { STATE_SCOPE_SEP, STATE_STAR_END_ID, STATE_STAR_START_ID } from '../stateDiagramIds'
import { escapeQuotedText, escapeStateText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'
import { formatIndentedLines } from './common'

function scopeSegmentCount(id: string): number {
  if (!id.includes(STATE_SCOPE_SEP)) {
    return 0
  }

  return id.split(STATE_SCOPE_SEP).length - 1
}

function subtreeContains(compositeId: string, nodeId: string): boolean {
  return nodeId === compositeId || nodeId.startsWith(`${compositeId}${STATE_SCOPE_SEP}`)
}

function deepestContainingComposite(edge: VisualEdge, nodes: VisualNode[]): string | null {
  const composites = nodes
    .filter((n) => n.data.stateIsComposite)
    .sort((a, b) => scopeSegmentCount(b.id) - scopeSegmentCount(a.id))

  for (const composite of composites) {
    if (subtreeContains(composite.id, edge.source) && subtreeContains(composite.id, edge.target)) {
      return composite.id
    }
  }

  return null
}

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

function emitCompositeBlock(
  composite: VisualNode,
  nodes: VisualNode[],
  edges: VisualEdge[],
  lines: string[],
  indent: string,
  emittedEdgeIds: Set<string>,
  nodeById: Map<string, VisualNode>
): void {
  const children = nodes.filter((n) => n.parentId === composite.id).sort((a, b) => a.id.localeCompare(b.id))
  const localComposite = mermaidLocalId(composite.id)

  lines.push(`${indent}state "${escapeQuotedText(composite.data.label || localComposite)}" as ${sanitizeId(localComposite)} {`)

  const deeper = `${indent}  `
  for (const child of children) {
    if (child.data.stateIsComposite) {
      emitCompositeBlock(child, nodes, edges, lines, deeper, emittedEdgeIds, nodeById)
    } else if (!child.data.statePseudo) {
      const lid = mermaidLocalId(child.id)
      lines.push(`${deeper}state "${escapeQuotedText(child.data.label || lid)}" as ${sanitizeId(lid)}`)
      for (const descriptionLine of formatIndentedLines(child.data.stateDescription)) {
        lines.push(`${deeper}${sanitizeId(lid)} : ${escapeStateText(descriptionLine)}`)
      }
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

  const roots = nodes.filter((n) => !n.parentId).sort((a, b) => a.id.localeCompare(b.id))

  for (const root of roots) {
    if (pseudoIds.has(root.id)) {
      continue
    }

    if (root.data.stateIsComposite) {
      emitCompositeBlock(root, nodes, edges, lines, '  ', emittedEdgeIds, nodeById)
      continue
    }

    const stateId = sanitizeId(mermaidLocalId(root.id))
    lines.push(`  state "${escapeQuotedText(root.data.label || root.id)}" as ${stateId}`)
    for (const descriptionLine of formatIndentedLines(root.data.stateDescription)) {
      lines.push(`  ${stateId} : ${escapeStateText(descriptionLine)}`)
    }
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
