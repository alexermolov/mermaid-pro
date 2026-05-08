/**
 * PlantUML import: converts PlantUML source to an equivalent Mermaid string,
 * which is then fed into the regular Mermaid parser. Supports the most common
 * diagram families: sequence, class/object, state, activity (→ flowchart) and
 * mindmap. Anything we can't recognise yields `undefined` so the caller can
 * fall back to other importers.
 */

const PLANT_UML_BLOCK = /@start(?:uml|mindmap|wbs|salt|json|yaml|gantt)\b[\s\S]*?@end(?:uml|mindmap|wbs|salt|json|yaml|gantt)\b/i
const PLANT_UML_HEADER = /@start(?:uml|mindmap|wbs|salt|json|yaml|gantt)\b/i

type PlantUmlDiagramKind =
  | 'sequence'
  | 'class'
  | 'state'
  | 'activity'
  | 'mindmap'
  | 'flowchart'

const sequenceParticipantKinds = new Set([
  'participant',
  'actor',
  'boundary',
  'control',
  'entity',
  'database',
  'collections',
  'queue'
])

const sequenceParticipantTypeMap: Record<string, string> = {
  boundary: 'boundary',
  control: 'control',
  entity: 'entity',
  database: 'database',
  collections: 'collections',
  queue: 'queue'
}

const classMemberVisibilityChars = new Set(['+', '-', '#', '~'])

export function isPlantUmlContent(content: string): boolean {
  return PLANT_UML_HEADER.test(content)
}

/**
 * Convert PlantUML source to a Mermaid equivalent. Returns `undefined` when
 * the content does not look like supported PlantUML.
 */
export function plantUmlToMermaid(content: string): string | undefined {
  if (!isPlantUmlContent(content)) {
    return undefined
  }

  const block = extractFirstPlantUmlBlock(content)
  if (!block) {
    return undefined
  }

  const lines = stripPlantUmlPreamble(block)
  if (lines.length === 0) {
    return undefined
  }

  const kind = detectPlantUmlKind(block, lines)
  switch (kind) {
    case 'sequence':
      return convertSequence(lines)
    case 'class':
      return convertClass(lines)
    case 'state':
      return convertState(lines)
    case 'activity':
      return convertActivity(lines)
    case 'mindmap':
      return convertMindmap(content)
    case 'flowchart':
      return convertGenericComponent(lines)
    default:
      return undefined
  }
}

function extractFirstPlantUmlBlock(content: string): string | undefined {
  const match = content.match(PLANT_UML_BLOCK)
  if (match) {
    return match[0]
  }

  if (PLANT_UML_HEADER.test(content)) {
    return content
  }

  return undefined
}

function stripPlantUmlPreamble(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        return false
      }
      if (/^@start/i.test(trimmed) || /^@end/i.test(trimmed)) {
        return false
      }
      if (trimmed.startsWith("'")) {
        return false
      }
      if (/^\/'.*'\/$/.test(trimmed)) {
        return false
      }
      if (/^!(include|define|undef|pragma|theme|import|startsub|endsub|if|elseif|else|endif|while|endwhile|procedure|endprocedure|function|endfunction|return|log|assert|unquoted|exit|dump_memory|definelong|enddefinelong)\b/i.test(trimmed)) {
        return false
      }
      if (/^skinparam\b/i.test(trimmed)) {
        return false
      }
      if (/^skinparam\s*\{/i.test(trimmed)) {
        return false
      }
      if (/^(title|caption|footer|header|hide|show|legend|endlegend|center|left|right|top|bottom|scale|page|allowmixing|left to right direction|top to bottom direction|autonumber)\b/i.test(trimmed)) {
        return false
      }
      return true
    })
    .map((line) => line.replace(/\t/g, '    '))
}

function detectPlantUmlKind(block: string, lines: string[]): PlantUmlDiagramKind | undefined {
  if (/@startmindmap\b/i.test(block)) {
    return 'mindmap'
  }

  const text = lines.join('\n')
  const hasParticipantKeyword = /^\s*participant\s+/im.test(text)
  const hasComponentKeyword = /^\s*(component|usecase|node|cloud|frame|folder|package|artifact|rectangle|storage|agent)\s+/im.test(text)
  const hasClassKeyword = /^\s*(class|interface|abstract\s+class|abstract|enum|annotation|protocol|struct|exception|object)\s+/im.test(text)

  // Sequence diagrams can include `end` (e.g. `alt ... end`), so detect them
  // before activity heuristics to avoid false positives.
  if (
    hasParticipantKeyword ||
    /^\s*(actor|boundary|control|entity|database|collections|queue)\s+/im.test(text) ||
    /^\s*\S+\s*<?-{1,2}>{1,2}\s*\S+\s*:/m.test(text)
  ) {
    return 'sequence'
  }

  if (/^\s*(start|stop|end)\s*$/im.test(text) || /^\s*:[^;]*;\s*$/m.test(text) || /\bif\s*\([^)]*\)\s*then\b/i.test(text)) {
    return 'activity'
  }

  if (/\[\*\]\s*-{1,2}->|-{1,2}->\s*\[\*\]/.test(text)) {
    return 'state'
  }

  if (hasClassKeyword) {
    return 'class'
  }

  if (hasComponentKeyword) {
    return 'flowchart'
  }

  if (/^\s*state\s+/im.test(text)) {
    return 'state'
  }

  return undefined
}

function stripBalancedQuotes(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function sanitizeIdLocal(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '')
  if (!cleaned) {
    return 'node'
  }
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `node_${cleaned}`
}

function escapeQuotedLabel(label: string): string {
  return label.replace(/"/g, "'")
}

function convertSequence(lines: string[]): string {
  const out: string[] = ['sequenceDiagram']
  const declared = new Map<string, string>()
  const aliasOf = new Map<string, string>()

  const declareParticipant = (
    rawKind: string,
    rawId: string,
    rawAlias?: string
  ): string => {
    const kindLower = rawKind.toLowerCase()
    const isActor = kindLower === 'actor'
    const mermaidKind = isActor ? 'actor' : 'participant'
    const participantType = !isActor && kindLower !== 'participant' ? sequenceParticipantTypeMap[kindLower] : undefined

    const labelSource = rawAlias ?? rawId
    const idSource = rawAlias ? rawId : rawId
    const id = sanitizeIdLocal(stripBalancedQuotes(idSource))
    const label = stripBalancedQuotes(labelSource)

    if (declared.has(id)) {
      return id
    }

    const config = participantType ? `@{ "type": "${participantType}" }` : ''
    if (label && label !== id) {
      out.push(`    ${mermaidKind} ${id}${config} as ${escapeQuotedLabel(label)}`)
    } else {
      out.push(`    ${mermaidKind} ${id}${config}`)
    }
    declared.set(id, mermaidKind)
    aliasOf.set(stripBalancedQuotes(idSource), id)
    aliasOf.set(label, id)
    return id
  }

  const resolveParticipantId = (raw: string): string => {
    const cleaned = stripBalancedQuotes(raw.trim())
    const aliased = aliasOf.get(cleaned)
    if (aliased) {
      return aliased
    }
    const id = sanitizeIdLocal(cleaned)
    if (!declared.has(id)) {
      out.push(`    participant ${id}${id === cleaned ? '' : ` as ${escapeQuotedLabel(cleaned)}`}`)
      declared.set(id, 'participant')
      aliasOf.set(cleaned, id)
    }
    return id
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const participantMatch = line.match(
      /^(participant|actor|boundary|control|entity|database|collections|queue)\s+(.+?)\s*(?:#[A-Za-z0-9]+)?\s*$/i
    )
    if (participantMatch && sequenceParticipantKinds.has(participantMatch[1].toLowerCase())) {
      const [, kind, body] = participantMatch
      const asMatch = body.match(/^(?:"((?:[^"\\]|\\.)*)"|(\S+))\s+as\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))$/)
      if (asMatch) {
        const [, q1, n1, q2, n2] = asMatch
        if (q1 && !q2) {
          declareParticipant(kind, n2!, q1)
        } else if (q2 && !q1) {
          declareParticipant(kind, n1!, q2)
        } else if (q1 && q2) {
          declareParticipant(kind, q2, q1)
        } else {
          declareParticipant(kind, n1!, n2!)
        }
        continue
      }

      const simpleMatch = body.match(/^(?:"((?:[^"\\]|\\.)*)"|(\S+))$/)
      if (simpleMatch) {
        const [, quoted, plain] = simpleMatch
        const ref = quoted ?? plain!
        declareParticipant(kind, ref)
        continue
      }
      continue
    }

    if (/^(activate|deactivate|destroy|create|return|autonumber|hnote|rnote|ref|delay|skinparam)\b/i.test(line)) {
      continue
    }

    if (/^\.\.\.\s*$/.test(line)) {
      continue
    }

    if (/^(group|loop|alt|else|opt|par|critical|break|box|end\s*box)\b/i.test(line) || line === 'end') {
      continue
    }

    if (/^note\b/i.test(line)) {
      continue
    }

    const messageMatch = line.match(
      /^([^\s<>-]+(?:\s*"[^"]*")?|"[^"]+")\s*([<>-]+\S*?[<>-]+|->>?|-->>?|<<-{1,2}|<-{1,2})\s*([^\s:]+(?:\s*"[^"]*")?|"[^"]+")\s*(?::\s*(.+))?$/
    )
    if (messageMatch) {
      const [, srcRaw, arrowRaw, dstRaw, label] = messageMatch
      const arrowInfo = mapSequenceArrow(arrowRaw)
      if (!arrowInfo) {
        continue
      }
      const srcId = resolveParticipantId(srcRaw)
      const dstId = resolveParticipantId(dstRaw)
      const fromId = arrowInfo.swap ? dstId : srcId
      const toId = arrowInfo.swap ? srcId : dstId
      const lbl = label?.trim()
      out.push(`    ${fromId}${arrowInfo.arrow}${toId}${lbl ? `: ${lbl}` : ''}`)
    }
  }

  return out.join('\n')
}

function mapSequenceArrow(arrow: string): { arrow: string; swap: boolean } | undefined {
  const cleaned = arrow.replace(/[ox/\\]/g, '')
  const isReverse = /^<{1,2}/.test(cleaned)
  const isDashed = /--/.test(cleaned)
  const hasArrow = /[<>]/.test(cleaned)

  if (!hasArrow) {
    return undefined
  }

  const mermaidArrow = isDashed ? '-->>' : '->>'
  return { arrow: mermaidArrow, swap: isReverse }
}

function convertClass(lines: string[]): string {
  const out: string[] = ['classDiagram']

  let index = 0
  while (index < lines.length) {
    const line = lines[index].trim()
    index += 1
    if (!line) continue

    const noteMatch = line.match(/^note\s+(?:left|right|top|bottom)?\s*(?:of\s+)?(\S+)?\s*:\s*(.+)$/i)
    if (noteMatch) {
      const [, target, text] = noteMatch
      if (target) {
        out.push(`    note for ${sanitizeIdLocal(target)} "${escapeQuotedLabel(text.trim())}"`)
      }
      continue
    }

    if (/^note\s+(?:left|right|top|bottom)?\s*(?:of\s+)?(\S+)?\s*$/i.test(line)) {
      const headerMatch = line.match(/^note\s+(?:left|right|top|bottom)?\s*(?:of\s+)?(\S+)?\s*$/i)
      const target = headerMatch?.[1]
      const noteLines: string[] = []
      while (index < lines.length && !/^end\s*note\s*$/i.test(lines[index].trim())) {
        noteLines.push(lines[index].trim())
        index += 1
      }
      if (index < lines.length) index += 1
      if (target && noteLines.length > 0) {
        out.push(`    note for ${sanitizeIdLocal(target)} "${escapeQuotedLabel(noteLines.join('\\n'))}"`)
      }
      continue
    }

    if (/^(hide|show)\b/i.test(line)) {
      continue
    }

    const blockMatch = line.match(
      /^(class|interface|abstract\s+class|abstract|enum|annotation|protocol|struct|exception|object)\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))(?:\s+as\s+(?:"((?:[^"\\]|\\.)*)"|(\S+)))?(?:\s+<<\s*([^>]+)\s*>>)?\s*(\{)?\s*$/i
    )
    if (blockMatch) {
      const [, kindRaw, q1, n1, q2, n2, stereo, openingBrace] = blockMatch
      const kind = kindRaw.toLowerCase().replace(/\s+/g, ' ')
      const labelLeft = q1 ?? n1!
      const aliasRight = q2 ?? n2
      const id = sanitizeIdLocal(aliasRight ?? labelLeft)
      const display = aliasRight ? labelLeft : labelLeft
      const stereotype = stereo?.trim() ?? mapClassKindToStereotype(kind)

      const headerSuffix = stereotype ? ` <<${stereotype}>>` : ''
      const labelSuffix = display && display !== id ? ` ["${escapeQuotedLabel(display)}"]` : ''

      if (openingBrace) {
        const members: string[] = []
        while (index < lines.length && lines[index].trim() !== '}') {
          const member = lines[index].trim()
          if (member) {
            members.push(convertClassMember(member))
          }
          index += 1
        }
        if (index < lines.length) index += 1

        if (labelSuffix) {
          out.push(`    class ${id}${labelSuffix}`)
        }
        if (stereotype) {
          out.push(`    <<${stereotype}>> ${id}`)
        }
        if (members.length > 0) {
          out.push(`    class ${id} {`)
          for (const member of members) {
            out.push(`        ${member}`)
          }
          out.push('    }')
        } else if (!labelSuffix && !stereotype) {
          out.push(`    class ${id}`)
        }
        continue
      }

      if (labelSuffix) {
        out.push(`    class ${id}${labelSuffix}`)
      } else if (stereotype) {
        out.push(`    class ${id}${headerSuffix}`)
      } else {
        out.push(`    class ${id}`)
      }
      continue
    }

    const relMatch = line.match(
      /^(?:"((?:[^"\\]|\\.)*)"|(\S+))\s*(?:"([^"]*)")?\s*(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|<\.\.|\.\.>|<--|-->|\.\.|--)\s*(?:"([^"]*)")?\s*(?:"((?:[^"\\]|\\.)*)"|(\S+))(?:\s*:\s*(.+))?$/
    )
    if (relMatch) {
      const [, q1, n1, srcMult, rawArrow, dstMult, q2, n2, label] = relMatch
      const sourceId = sanitizeIdLocal(stripBalancedQuotes(q1 ?? n1!))
      const targetId = sanitizeIdLocal(stripBalancedQuotes(q2 ?? n2!))
      const arrow = rawArrow
      const srcMultiplicity = srcMult ? `"${srcMult}" ` : ''
      const dstMultiplicity = dstMult ? `"${dstMult}" ` : ''
      const lbl = label?.trim() ? ` : ${label.trim()}` : ''
      out.push(`    ${sourceId} ${srcMultiplicity}${arrow} ${dstMultiplicity}${targetId}${lbl}`.replace(/\s+/g, ' ').replace(/\s+:\s+/, ' : '))
      continue
    }

    const memberMatch = line.match(/^(\S+)\s*::\s*(.+)$/)
    if (memberMatch) {
      const [, id, member] = memberMatch
      out.push(`    ${sanitizeIdLocal(id)} : ${convertClassMember(member.trim())}`)
      continue
    }
  }

  return out.join('\n')
}

function mapClassKindToStereotype(kind: string): string | undefined {
  switch (kind) {
    case 'interface':
      return 'interface'
    case 'abstract':
    case 'abstract class':
      return 'abstract'
    case 'enum':
      return 'enumeration'
    case 'annotation':
      return 'annotation'
    case 'struct':
      return 'struct'
    case 'protocol':
      return 'protocol'
    case 'exception':
      return 'exception'
    default:
      return undefined
  }
}

function convertClassMember(member: string): string {
  const stripped = member.replace(/\{(static|abstract)\}\s*/gi, (_match, modifier: string) =>
    modifier.toLowerCase() === 'static' ? '' : ''
  )
  let core = stripped.trim()
  let suffix = ''
  if (/\{static\}/i.test(member)) suffix += '$'
  if (/\{abstract\}/i.test(member)) suffix += '*'

  if (core.length > 0 && classMemberVisibilityChars.has(core[0])) {
    return `${core}${suffix}`
  }

  return `+${core}${suffix}`
}

function convertState(lines: string[]): string {
  const out: string[] = ['stateDiagram-v2']

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (/^(hide|show)\b/i.test(line)) continue
    if (/^scale\b/i.test(line)) continue

    if (line === '}' || line === '{') {
      out.push(line)
      continue
    }

    if (/^direction\b/i.test(line)) {
      out.push(line)
      continue
    }

    const noteInline = line.match(/^note\s+(left|right)\s+of\s+(\S+)\s*:\s*(.+)$/i)
    if (noteInline) {
      const [, side, target, text] = noteInline
      out.push(`    note ${side.toLowerCase()} of ${sanitizeIdLocal(target)} : ${text.trim()}`)
      continue
    }

    const stateOpen = line.match(/^state\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))(?:\s+as\s+(\S+))?\s*\{\s*$/i)
    if (stateOpen) {
      const [, q, n, alias] = stateOpen
      const label = q ?? n!
      const id = sanitizeIdLocal(alias ?? label)
      if (alias && q) {
        out.push(`    state "${escapeQuotedLabel(label)}" as ${id} {`)
      } else if (label && label !== id) {
        out.push(`    state "${escapeQuotedLabel(label)}" as ${id} {`)
      } else {
        out.push(`    state ${id} {`)
      }
      continue
    }

    const stateLabeled = line.match(/^state\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))(?:\s+as\s+(\S+))?(?:\s+<<([^>]+)>>)?\s*$/i)
    if (stateLabeled) {
      const [, q, n, alias, stereo] = stateLabeled
      const label = q ?? n!
      const id = sanitizeIdLocal(alias ?? label)
      if (alias && q) {
        out.push(`    state "${escapeQuotedLabel(label)}" as ${id}`)
      } else if (label && label !== id) {
        out.push(`    state "${escapeQuotedLabel(label)}" as ${id}`)
      } else if (stereo) {
        out.push(`    state ${id} <<${stereo.trim()}>>`)
      } else {
        out.push(`    state ${id}`)
      }
      continue
    }

    const transition = line.match(/^(\[\*\]|\S+)\s*-{1,2}(?:\[#?\w*\])?-?>\s*(\[\*\]|\S+)\s*(?::\s*(.+))?$/)
    if (transition) {
      const [, src, dst, label] = transition
      const srcOut = src === '[*]' ? '[*]' : sanitizeIdLocal(src)
      const dstOut = dst === '[*]' ? '[*]' : sanitizeIdLocal(dst)
      out.push(`    ${srcOut} --> ${dstOut}${label ? ` : ${label.trim()}` : ''}`)
      continue
    }

    const description = line.match(/^(\S+)\s*:\s*(.+)$/)
    if (description) {
      const [, id, desc] = description
      out.push(`    ${sanitizeIdLocal(id)} : ${desc.trim()}`)
      continue
    }
  }

  return out.join('\n')
}

function convertActivity(lines: string[]): string {
  const out: string[] = ['flowchart TD']
  const stack: Array<{ kind: 'if' | 'while' | 'repeat' | 'fork'; lastIds: string[]; mergeIds: string[]; branchEntry?: string }> = []

  let prevId: string | undefined
  let nodeCounter = 0
  let edgeLabel: string | undefined

  const addNode = (label: string, shape: 'rect' | 'rounded' | 'diamond' = 'rect'): string => {
    nodeCounter += 1
    const id = `n${nodeCounter}`
    const safeLabel = label.replace(/[`"]/g, ' ').trim() || 'step'
    if (shape === 'rounded') {
      out.push(`    ${id}(["${escapeQuotedLabel(safeLabel)}"])`)
    } else if (shape === 'diamond') {
      out.push(`    ${id}{"${escapeQuotedLabel(safeLabel)}"}`)
    } else {
      out.push(`    ${id}["${escapeQuotedLabel(safeLabel)}"]`)
    }
    return id
  }

  const link = (from: string | undefined, to: string): void => {
    if (!from) return
    const labelPart = edgeLabel ? `|${edgeLabel.replace(/[|]/g, ' ').trim()}|` : ''
    out.push(`    ${from} -->${labelPart} ${to}`)
    edgeLabel = undefined
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (/^start\s*$/i.test(line)) {
      const id = addNode('Start', 'rounded')
      prevId = id
      continue
    }

    if (/^(stop|end)\s*$/i.test(line)) {
      const id = addNode(line.toLowerCase() === 'end' ? 'End' : 'Stop', 'rounded')
      link(prevId, id)
      prevId = id
      continue
    }

    const stepMatch = line.match(/^:([\s\S]*?);\s*$/)
    if (stepMatch) {
      const id = addNode(stepMatch[1])
      link(prevId, id)
      prevId = id
      continue
    }

    const ifMatch = line.match(/^if\s*\((.+)\)\s+then(?:\s*\(([^)]*)\))?\s*$/i)
    if (ifMatch) {
      const [, cond, branchLabel] = ifMatch
      const id = addNode(cond, 'diamond')
      link(prevId, id)
      stack.push({ kind: 'if', lastIds: [], mergeIds: [], branchEntry: id })
      prevId = id
      edgeLabel = branchLabel?.trim() || 'yes'
      continue
    }

    const elseifMatch = line.match(/^elseif\s*\((.+)\)\s+then(?:\s*\(([^)]*)\))?\s*$/i)
    if (elseifMatch) {
      const top = stack[stack.length - 1]
      if (top && top.kind === 'if') {
        if (prevId) top.mergeIds.push(prevId)
        const [, cond, branchLabel] = elseifMatch
        const id = addNode(cond, 'diamond')
        if (top.branchEntry) {
          edgeLabel = 'no'
          link(top.branchEntry, id)
        }
        top.branchEntry = id
        prevId = id
        edgeLabel = branchLabel?.trim() || 'yes'
      }
      continue
    }

    const elseMatch = line.match(/^else(?:\s*\(([^)]*)\))?\s*$/i)
    if (elseMatch) {
      const top = stack[stack.length - 1]
      if (top && top.kind === 'if') {
        if (prevId) top.mergeIds.push(prevId)
        const [, branchLabel] = elseMatch
        prevId = top.branchEntry
        edgeLabel = branchLabel?.trim() || 'no'
      }
      continue
    }

    if (/^endif\s*$/i.test(line)) {
      const top = stack.pop()
      if (top && top.kind === 'if') {
        if (prevId) top.mergeIds.push(prevId)
        const merge = addNode('merge', 'rounded')
        for (const id of top.mergeIds) {
          link(id, merge)
        }
        prevId = merge
      }
      continue
    }

    if (/^(repeat|while)\b/i.test(line)) {
      const cond = line.replace(/^(repeat|while)\s*\(?/i, '').replace(/\)?\s*(is\b.*)?$/i, '').trim() || 'while'
      const id = addNode(cond, 'diamond')
      link(prevId, id)
      stack.push({ kind: 'while', lastIds: [id], mergeIds: [] })
      prevId = id
      continue
    }

    if (/^(endwhile|repeatwhile|repeat\s+while)\b/i.test(line)) {
      const top = stack.pop()
      if (top && top.kind === 'while' && prevId) {
        link(prevId, top.lastIds[0])
        prevId = top.lastIds[0]
      }
      continue
    }

    const noteMatch = line.match(/^note\s+(?:left|right|top|bottom)?\s*:?\s*(.+)?$/i)
    if (noteMatch) {
      continue
    }
  }

  if (out.length === 1) {
    out.push('    n1["PlantUML diagram"]')
  }

  return out.join('\n')
}

function convertGenericComponent(lines: string[]): string {
  const out: string[] = ['flowchart TD']
  const declared = new Map<string, string>()
  const entityTokenPattern = /(?:\(([^)]*)\)|"((?:[^"\\]|\\.)*)"|\[([^\]]*)\]|([A-Za-z0-9_.$:-]+))/

  const declareNode = (raw: string, label?: string, shape: 'rect' | 'rounded' | 'diamond' = 'rect'): string => {
    const id = sanitizeIdLocal(raw)
    if (declared.has(id)) {
      return id
    }
    const lbl = (label ?? raw).trim()
    if (shape === 'rounded') {
      out.push(`    ${id}(["${escapeQuotedLabel(lbl)}"])`)
    } else if (shape === 'diamond') {
      out.push(`    ${id}{"${escapeQuotedLabel(lbl)}"}`)
    } else {
      out.push(`    ${id}["${escapeQuotedLabel(lbl)}"]`)
    }
    declared.set(id, lbl)
    return id
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const declMatch = line.match(
      /^(component|usecase|node|cloud|database|frame|folder|package|artifact|rectangle|storage|agent|interface|actor)\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))(?:\s+as\s+(\S+))?\s*\{?\s*$/i
    )
    if (declMatch) {
      const [, , q, n, alias] = declMatch
      const labelText = q ?? n!
      const id = alias ?? labelText
      declareNode(id, labelText)
      continue
    }

    if (line === '}') continue

    const arrowMatch = line.match(
      new RegExp(
        `^${entityTokenPattern.source}\\s*([^\\s]+)\\s*${entityTokenPattern.source}(?:\\s*:\\s*(.+))?$`
      )
    )
    if (arrowMatch) {
      const srcLabel = arrowMatch[1] ?? arrowMatch[2] ?? arrowMatch[3] ?? arrowMatch[4]!
      const arrow = arrowMatch[5].toLowerCase()
      const dstLabel = arrowMatch[6] ?? arrowMatch[7] ?? arrowMatch[8] ?? arrowMatch[9]!
      const label = arrowMatch[10]
      const isReverse = arrow.startsWith('<') || /-left-/.test(arrow)
      const isDashed = /\.\./.test(arrow)
      const lineToken = isDashed ? '-.->' : '-->'
      const fromId = declareNode(isReverse ? dstLabel : srcLabel)
      const toId = declareNode(isReverse ? srcLabel : dstLabel)
      const lbl = label?.trim() ? `|${label.trim()}|` : ''
      out.push(`    ${fromId} ${lineToken}${lbl} ${toId}`)
      continue
    }
  }

  if (out.length === 1) {
    out.push('    n1["PlantUML component diagram"]')
  }

  return out.join('\n')
}

function convertMindmap(content: string): string {
  const out: string[] = ['mindmap']
  const block = content.match(/@startmindmap\b([\s\S]*?)@endmindmap\b/i)?.[1] ?? content
  const rawLines = block.split(/\r?\n/)

  for (const raw of rawLines) {
    const line = raw.replace(/\r$/, '')
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^@start/i.test(trimmed) || /^@end/i.test(trimmed)) continue
    if (trimmed.startsWith("'")) continue
    if (/^skinparam\b|^title\b|^!/i.test(trimmed)) continue

    const bulletMatch = trimmed.match(/^([*+-]+)(_?)\s*(.+)$/)
    if (!bulletMatch) continue
    const [, bullets, , label] = bulletMatch
    const depth = bullets.length
    const cleanedLabel = label.replace(/^\[[^\]]*\]\s*/, '').replace(/\s*<<[^>]+>>\s*$/, '').replace(/^"(.*)"$/, '$1').trim()
    const indent = '  '.repeat(Math.max(0, depth - 1))
    out.push(`${indent}${cleanedLabel}`)
  }

  if (out.length === 1) {
    out.push('  PlantUML mindmap')
  }

  return out.join('\n')
}
