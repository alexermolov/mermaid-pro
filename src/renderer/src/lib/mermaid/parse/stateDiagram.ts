import type { DiagramDirection } from '../../../../../shared/diagram'
import { autoLayoutNodes } from '../layout'
import { ensureNode } from '../graph-model'
import { STATE_STAR_END_ID, STATE_STAR_START_ID } from '../stateDiagramIds'
import { normalizeEscapedText } from '../text-utils'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'
import { sanitizeId } from '../ids'

function countChar(line: string, character: string): number {
  return (line.match(new RegExp(`\\${character}`, 'g')) ?? []).length
}

function netBraceDepth(line: string): number {
  return countChar(line, '{') - countChar(line, '}')
}

function inferStarNodeId(endpoint: string, side: 'source' | 'target'): string {
  if (endpoint !== '[*]') {
    return endpoint
  }

  return side === 'source' ? STATE_STAR_START_ID : STATE_STAR_END_ID
}

function appendNoteToState(nodes: Map<string, VisualNode>, stateId: string, noteText: string): void {
  const node = ensureNode(nodes, stateId, stateId)
  const next = [node.data.stateDescription, noteText.trim()].filter(Boolean).join('\n')
  node.data.stateDescription = next || undefined
}

function slugIdFromDescription(label: string): string {
  return sanitizeId(label.replace(/\s+/g, '_'))
}

export function parseState(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []
  let direction: DiagramDirection = 'TD'
  let compositeDepth = 0

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (compositeDepth > 0) {
      compositeDepth += netBraceDepth(rawLine)
      if (compositeDepth < 0) {
        compositeDepth = 0
      }
      continue
    }

    if (/^state\s+.+\{\s*$/.test(line)) {
      compositeDepth = Math.max(0, compositeDepth + netBraceDepth(rawLine))
      continue
    }

    const directionMatch = line.match(/^direction\s+(TB|TD|LR|RL|BT)\s*$/)
    if (directionMatch) {
      const raw = directionMatch[1]
      direction = (raw === 'TB' ? 'TD' : raw) as DiagramDirection
      continue
    }

    if (line.startsWith('classDef ') || /^class\s+/.test(line)) {
      continue
    }

    const noteMatch = line.match(/^note\s+(left|right)\s+of\s+(\S+)\s+:\s+(.+)$/)
    if (noteMatch) {
      const [, , stateId, text] = noteMatch
      appendNoteToState(nodes, stateId, text)
      continue
    }

    const stateQuotedAsMatch = line.match(/^state\s+"((?:\\.|[^"])*)"\s+as\s+(\S+)\s*$/)
    if (stateQuotedAsMatch) {
      const [, label, id] = stateQuotedAsMatch
      ensureNode(nodes, id, normalizeEscapedText(label))
      continue
    }

    const stateIdAsQuotedMatch = line.match(/^state\s+(\S+)\s+as\s+"((?:\\.|[^"])*)"\s*$/)
    if (stateIdAsQuotedMatch) {
      const [, id, label] = stateIdAsQuotedMatch
      ensureNode(nodes, id, normalizeEscapedText(label))
      continue
    }

    const stateStereotypeMatch = line.match(/^state\s+(\S+)\s+(<<[^>]+>>)\s*$/)
    if (stateStereotypeMatch) {
      const [, id, stereo] = stateStereotypeMatch
      ensureNode(nodes, id, `${id} ${stereo}`)
      continue
    }

    const stateQuotedOnlyMatch = line.match(/^state\s+"((?:\\.|[^"])*)"\s*$/)
    if (stateQuotedOnlyMatch) {
      const label = normalizeEscapedText(stateQuotedOnlyMatch[1])
      const id = slugIdFromDescription(label)
      ensureNode(nodes, id, label)
      continue
    }

    const stateIdOnlyMatch = line.match(/^state\s+([a-zA-Z_][\w]*)\s*$/)
    if (stateIdOnlyMatch) {
      const id = stateIdOnlyMatch[1]
      ensureNode(nodes, id, id)
      continue
    }

    const transitionArrowMatch = line.match(
      /^(\[\*\]|\S+?)(?:::\w+)?\s+-->\s+(\[\*\]|\S+?)(?:::\w+)?(?:\s+:\s+(.+))?$/
    )
    if (transitionArrowMatch) {
      const [, rawSource, rawTarget, label] = transitionArrowMatch
      const sourceId = inferStarNodeId(rawSource, 'source')
      const targetId = inferStarNodeId(rawTarget, 'target')

      if (sourceId === STATE_STAR_START_ID) {
        ensureNode(nodes, sourceId, '[*]', { statePseudo: 'start' })
      } else {
        ensureNode(nodes, sourceId, sourceId)
      }

      if (targetId === STATE_STAR_END_ID) {
        ensureNode(nodes, targetId, '[*]', { statePseudo: 'end' })
      } else {
        ensureNode(nodes, targetId, targetId)
      }

      edges.push({
        id: `${sourceId}-${targetId}-${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: label?.trim()
      })
      continue
    }

    const transitionConcurrencyMatch = line.match(/^(\[\*\]|\S+)\s+--\s+(\[\*\]|\S+)$/)
    if (transitionConcurrencyMatch) {
      const [, rawA, rawB] = transitionConcurrencyMatch
      const sourceId = inferStarNodeId(rawA, 'source')
      const targetId = inferStarNodeId(rawB, 'target')

      if (sourceId === STATE_STAR_START_ID) {
        ensureNode(nodes, sourceId, '[*]', { statePseudo: 'start' })
      } else {
        ensureNode(nodes, sourceId, sourceId)
      }

      if (targetId === STATE_STAR_END_ID) {
        ensureNode(nodes, targetId, '[*]', { statePseudo: 'end' })
      } else {
        ensureNode(nodes, targetId, targetId)
      }

      edges.push({
        id: `${sourceId}-${targetId}-c${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        data: { stateConcurrency: true }
      })
      continue
    }

    const descriptionMatch = line.match(/^(\S+)\s+:\s+(.+)$/)
    if (descriptionMatch) {
      const [, id, description] = descriptionMatch
      const node = ensureNode(nodes, id, id)
      node.data.stateDescription = [node.data.stateDescription, description.trim()].filter(Boolean).join('\n') || undefined
    }
  }

  return {
    diagramType: 'state',
    direction,
    nodes: autoLayoutNodes(Array.from(nodes.values()), edges, direction, 'state'),
    edges
  }
}
