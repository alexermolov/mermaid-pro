import type { DiagramDirection } from '../../../../../shared/diagram'
import { autoLayoutNodes, layoutStateCompositeNodes } from '../layout'
import { ensureNode } from '../graph-model'
import {
  STATE_INNER_STAR_END_SUFFIX,
  STATE_INNER_STAR_START_SUFFIX,
  STATE_SCOPE_SEP,
  STATE_STAR_END_ID,
  STATE_STAR_START_ID
} from '../stateDiagramIds'
import { sanitizeId } from '../ids'
import { stateCompositeHasRenderableBody } from '../stateDiagramComposite'
import { normalizeEscapedText } from '../text-utils'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'

type CompositeFrame = { graphId: string; localId: string }

function qualifyLocal(stack: CompositeFrame[], localId: string): string {
  if (stack.length === 0) {
    return localId
  }

  return `${stack[stack.length - 1].graphId}${STATE_SCOPE_SEP}${localId}`
}

function shortLabelFromGraphId(graphId: string): string {
  if (!graphId.includes(STATE_SCOPE_SEP)) {
    return graphId
  }

  return graphId.slice(graphId.lastIndexOf(STATE_SCOPE_SEP) + STATE_SCOPE_SEP.length)
}

function resolveStateEndpoint(raw: string, role: 'source' | 'target', stack: CompositeFrame[]): string {
  if (raw === '[*]') {
    if (stack.length === 0) {
      return role === 'source' ? STATE_STAR_START_ID : STATE_STAR_END_ID
    }

    const scope = stack[stack.length - 1].graphId
    return role === 'source' ? `${scope}${STATE_INNER_STAR_START_SUFFIX}` : `${scope}${STATE_INNER_STAR_END_SUFFIX}`
  }

  return stack.length ? qualifyLocal(stack, raw) : raw
}

function ensureStateEndpoint(
  nodes: Map<string, VisualNode>,
  graphId: string,
  stack: CompositeFrame[]
): void {
  if (graphId === STATE_STAR_START_ID) {
    ensureNode(nodes, graphId, '[*]', { statePseudo: 'start' })
    return
  }

  if (graphId === STATE_STAR_END_ID) {
    ensureNode(nodes, graphId, '[*]', { statePseudo: 'end' })
    return
  }

  if (graphId.endsWith(STATE_INNER_STAR_START_SUFFIX)) {
    const scope = graphId.slice(0, -STATE_INNER_STAR_START_SUFFIX.length)
    ensureNode(nodes, graphId, '[*]', { statePseudo: 'start' }, { parentId: scope })
    return
  }

  if (graphId.endsWith(STATE_INNER_STAR_END_SUFFIX)) {
    const scope = graphId.slice(0, -STATE_INNER_STAR_END_SUFFIX.length)
    ensureNode(nodes, graphId, '[*]', { statePseudo: 'end' }, { parentId: scope })
    return
  }

  const parentId = stack.length ? stack[stack.length - 1].graphId : undefined
  ensureNode(nodes, graphId, shortLabelFromGraphId(graphId), {}, { parentId })
}

function appendStateNoteToNode(
  nodes: Map<string, VisualNode>,
  stateId: string,
  side: 'left' | 'right',
  noteText: string,
  stack: CompositeFrame[]
): void {
  const qualified = stack.length ? qualifyLocal(stack, stateId) : stateId
  const node = ensureNode(nodes, qualified, shortLabelFromGraphId(qualified), {}, { parentId: stack.length ? stack[stack.length - 1].graphId : undefined })
  const next = [node.data.stateNote, noteText.trim()].filter(Boolean).join('\n')
  node.data.stateNote = next || undefined
  node.data.stateNotePosition = side
}

function slugIdFromDescription(label: string): string {
  return sanitizeId(label.replace(/\s+/g, '_'))
}

function parseCompositeOpen(line: string): { localId: string; label: string } | null {
  const quotedAs = line.match(/^state\s+"((?:\\.|[^"])*)"\s+as\s+(\S+)\s*\{\s*$/)
  if (quotedAs) {
    return { localId: quotedAs[2], label: normalizeEscapedText(quotedAs[1]) }
  }

  const idAsQuoted = line.match(/^state\s+(\S+)\s+as\s+"((?:\\.|[^"])*)"\s*\{\s*$/)
  if (idAsQuoted) {
    return { localId: idAsQuoted[1], label: normalizeEscapedText(idAsQuoted[2]) }
  }

  const idOnly = line.match(/^state\s+([a-zA-Z_][\w]*)\s*\{\s*$/)
  if (idOnly) {
    const localId = idOnly[1]
    return { localId, label: localId }
  }

  const stereotype = line.match(/^state\s+(\S+)\s+(<<[^>]+>>)\s*\{\s*$/)
  if (stereotype) {
    const localId = stereotype[1]
    return { localId, label: `${localId} ${stereotype[2]}` }
  }

  return null
}

function normalizeStateStereotype(raw: string): string {
  return raw.trim().replace(/^<<\s*/, '').replace(/\s*>>$/, '')
}

function needsCompositeLayout(nodes: Iterable<VisualNode>): boolean {
  for (const node of nodes) {
    if (node.parentId || node.data.stateIsComposite) {
      return true
    }
  }

  return false
}

function stripEmptyCompositeFlags(nodes: Map<string, VisualNode>, edges: VisualEdge[]): void {
  const list = Array.from(nodes.values())
  for (const node of list) {
    if (!node.data.stateIsComposite) {
      continue
    }

    if (!stateCompositeHasRenderableBody(node, list, edges)) {
      const stored = nodes.get(node.id)
      if (stored) {
        stored.data.stateIsComposite = undefined
      }
    }
  }
}

export function parseState(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []
  let direction: DiagramDirection = 'TD'
  const stack: CompositeFrame[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line) {
      continue
    }

    if (stack.length > 0 && /^\}\s*$/.test(line)) {
      stack.pop()
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

    const compositeOpen = parseCompositeOpen(line)
    if (compositeOpen) {
      const parentId = stack.length ? stack[stack.length - 1].graphId : undefined
      const graphId = stack.length ? `${stack[stack.length - 1].graphId}${STATE_SCOPE_SEP}${compositeOpen.localId}` : compositeOpen.localId

      ensureNode(nodes, graphId, compositeOpen.label, { stateIsComposite: true }, { parentId })
      stack.push({ graphId, localId: compositeOpen.localId })
      continue
    }

    const noteInlineMatch = line.match(/^note\s+(left|right)\s+of\s+(\S+)\s+:\s+(.+)$/)
    if (noteInlineMatch) {
      const [, side, stateId, text] = noteInlineMatch
      appendStateNoteToNode(nodes, stateId, side as 'left' | 'right', text, stack)
      continue
    }

    const noteBlockStartMatch = line.match(/^note\s+(left|right)\s+of\s+(\S+)\s*$/)
    if (noteBlockStartMatch) {
      const [, side, stateId] = noteBlockStartMatch
      const noteLines: string[] = []
      let cursor = i + 1
      while (cursor < lines.length && !/^end\s+note\s*$/i.test(lines[cursor].trim())) {
        noteLines.push(lines[cursor].trim())
        cursor += 1
      }
      i = cursor
      const noteText = noteLines.join('\n').trim()
      if (noteText) {
        appendStateNoteToNode(nodes, stateId, side as 'left' | 'right', noteText, stack)
      }
      continue
    }

    const stateQuotedAsMatch = line.match(/^state\s+"((?:\\.|[^"])*)"\s+as\s+(\S+)\s*$/)
    if (stateQuotedAsMatch) {
      const [, label, id] = stateQuotedAsMatch
      const qid = qualifyLocal(stack, id)
      ensureNode(
        nodes,
        qid,
        normalizeEscapedText(label),
        {},
        { parentId: stack.length ? stack[stack.length - 1].graphId : undefined }
      )
      continue
    }

    const stateIdAsQuotedMatch = line.match(/^state\s+(\S+)\s+as\s+"((?:\\.|[^"])*)"\s*$/)
    if (stateIdAsQuotedMatch) {
      const [, id, label] = stateIdAsQuotedMatch
      const qid = qualifyLocal(stack, id)
      ensureNode(
        nodes,
        qid,
        normalizeEscapedText(label),
        {},
        { parentId: stack.length ? stack[stack.length - 1].graphId : undefined }
      )
      continue
    }

    const stateStereotypeMatch = line.match(/^state\s+(\S+)\s+(<<[^>]+>>)\s*$/)
    if (stateStereotypeMatch) {
      const [, id, stereo] = stateStereotypeMatch
      const qid = qualifyLocal(stack, id)
      ensureNode(
        nodes,
        qid,
        id,
        { stateStereotype: normalizeStateStereotype(stereo) },
        { parentId: stack.length ? stack[stack.length - 1].graphId : undefined }
      )
      continue
    }

    const stateQuotedOnlyMatch = line.match(/^state\s+"((?:\\.|[^"])*)"\s*$/)
    if (stateQuotedOnlyMatch) {
      const label = normalizeEscapedText(stateQuotedOnlyMatch[1])
      const id = slugIdFromDescription(label)
      const qid = qualifyLocal(stack, id)
      ensureNode(nodes, qid, label, {}, { parentId: stack.length ? stack[stack.length - 1].graphId : undefined })
      continue
    }

    const stateIdOnlyMatch = line.match(/^state\s+([a-zA-Z_][\w]*)\s*$/)
    if (stateIdOnlyMatch) {
      const id = stateIdOnlyMatch[1]
      const qid = qualifyLocal(stack, id)
      ensureNode(nodes, qid, id, {}, { parentId: stack.length ? stack[stack.length - 1].graphId : undefined })
      continue
    }

    const transitionArrowMatch = line.match(
      /^(\[\*\]|\S+?)(?:::\w+)?\s+-->\s+(\[\*\]|\S+?)(?:::\w+)?(?:\s+:\s+(.+))?$/
    )
    if (transitionArrowMatch) {
      const [, rawSource, rawTarget, label] = transitionArrowMatch
      const sourceId = resolveStateEndpoint(rawSource, 'source', stack)
      const targetId = resolveStateEndpoint(rawTarget, 'target', stack)

      ensureStateEndpoint(nodes, sourceId, stack)
      ensureStateEndpoint(nodes, targetId, stack)

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
      const sourceId = resolveStateEndpoint(rawA, 'source', stack)
      const targetId = resolveStateEndpoint(rawB, 'target', stack)

      ensureStateEndpoint(nodes, sourceId, stack)
      ensureStateEndpoint(nodes, targetId, stack)

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
      const qid = qualifyLocal(stack, id)
      const node = ensureNode(nodes, qid, shortLabelFromGraphId(qid), {}, { parentId: stack.length ? stack[stack.length - 1].graphId : undefined })
      node.data.stateDescription = [node.data.stateDescription, description.trim()].filter(Boolean).join('\n') || undefined
    }
  }

  stripEmptyCompositeFlags(nodes, edges)

  const nodeList = Array.from(nodes.values())
  const laidOut = needsCompositeLayout(nodeList)
    ? layoutStateCompositeNodes(nodeList, edges, direction)
    : autoLayoutNodes(nodeList, edges, direction, 'state')

  return {
    diagramType: 'state',
    direction,
    nodes: laidOut,
    edges
  }
}
