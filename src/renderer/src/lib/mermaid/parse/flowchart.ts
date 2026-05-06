import type { DiagramDirection } from '../../../../../shared/diagram'
import { flowchartShapeAliases } from '../flowchart-shape-aliases'
import { ensureNode } from '../graph-model'
import { autoLayoutNodes } from '../layout'
import { normalizeEscapedText, normalizeFlowchartLabel } from '../text-utils'
import type {
  FlowchartClassStyleMap,
  FlowchartEdgeStyle,
  FlowchartNodeShape,
  FlowchartNodeStyle,
  ParsedMermaidDiagram,
  VisualEdge,
  VisualNode
} from '../types'

type ParsedFlowchartNodeDescriptor = {
  id: string
  label: string
  shape?: FlowchartNodeShape
  classNames?: string[]
}


export function parseFlowchart(lines: string[]): ParsedMermaidDiagram {
  const headerMatch = lines[0]?.match(/^(?:flowchart|graph)\s+(TB|TD|LR|BT|RL)$/)
  const rawDirection = headerMatch?.[1]
  const direction = (rawDirection === 'TB' ? 'TD' : rawDirection) as DiagramDirection | undefined ?? 'TD'
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []
  const edgeIndexById = new Map<number, string>()
  const classStyles = new Map<string, FlowchartNodeStyle>()
  const nodeClassAssignments = new Map<string, string[]>()
  let linkIndex = 0

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (line.startsWith('classDef ')) {
      applyFlowchartClassDefinition(line, classStyles)
      continue
    }

    if (line.startsWith('class ')) {
      applyFlowchartClassAssignment(line, nodeClassAssignments)
      continue
    }

    if (
      line === 'end' ||
      line.startsWith('subgraph ') ||
      line.startsWith('click ')
    ) {
      continue
    }

    if (line.startsWith('style ')) {
      applyFlowchartNodeStyle(line, nodes)
      continue
    }

    if (line.startsWith('linkStyle ')) {
      applyFlowchartEdgeStyle(line, edges, edgeIndexById)
      continue
    }

    if (tryParseFlowchartEdge(line, nodes, edges, edgeIndexById, nodeClassAssignments, linkIndex)) {
      linkIndex += 1
      continue
    }

    tryParseFlowchartNode(line, nodes, nodeClassAssignments)
  }

  for (const node of nodes.values()) {
    const classNames = nodeClassAssignments.get(node.id)
    if (classNames && classNames.length > 0) {
      node.data.flowchartClassNames = [...classNames]

      const assignedClassStyles = classNames.reduce<FlowchartClassStyleMap>((result, className) => {
        const classStyle = classStyles.get(className)
        if (classStyle && Object.keys(classStyle).length > 0) {
          result[className] = { ...classStyle }
        }
        return result
      }, {})

      if (Object.keys(assignedClassStyles).length > 0) {
        node.data.flowchartClassStyles = assignedClassStyles
      }
    }

    const classStyle = mergeAssignedFlowchartClassStyles(node.id, nodeClassAssignments, classStyles)
    if (!classStyle) {
      continue
    }

    node.data.style = {
      ...classStyle,
      ...(node.data.style ?? {})
    }
  }

  return {
    diagramType: 'flowchart',
    direction,
    nodes: autoLayoutNodes(Array.from(nodes.values()), edges, direction),
    edges
  }
}
function tryParseFlowchartNode(
  line: string,
  nodes: Map<string, VisualNode>,
  nodeClassAssignments: Map<string, string[]>
): boolean {
  const descriptor = parseFlowchartNodeDescriptor(line)
  if (!descriptor) {
    return false
  }

  recordFlowchartNodeClasses(nodeClassAssignments, descriptor.id, descriptor.classNames)
  ensureNode(nodes, descriptor.id, descriptor.label, {
    ...(descriptor.shape ? { shape: descriptor.shape } : {})
  })
  return true
}

function tryParseFlowchartEdge(
  line: string,
  nodes: Map<string, VisualNode>,
  edges: VisualEdge[],
  edgeIndexById: Map<number, string>,
  nodeClassAssignments: Map<string, string[]>,
  linkIndex: number
): boolean {
  const parsedEdges = parseFlowchartEdgeExpressions(line)
  if (!parsedEdges || parsedEdges.length === 0) {
    return false
  }

  parsedEdges.forEach((parsedEdge, offset) => {
    const sourceNode = ensureNodeFromFlowchartDescriptor(nodes, parsedEdge.source, nodeClassAssignments)
    const targetNode = ensureNodeFromFlowchartDescriptor(nodes, parsedEdge.target, nodeClassAssignments)
    const edgeId = `${sourceNode.id}-${targetNode.id}-${edges.length + 1}`

    edges.push({
      id: edgeId,
      source: sourceNode.id,
      target: targetNode.id,
      label: parsedEdge.label,
      data: { lineStyle: parsedEdge.lineStyle }
    })
    edgeIndexById.set(linkIndex + offset, edgeId)
  })

  return true
}

function applyFlowchartNodeStyle(line: string, nodes: Map<string, VisualNode>): void {
  const styleMatch = line.match(/^style\s+(\S+)\s+(.+)$/)
  if (!styleMatch) {
    return
  }

  const [, id, declarationText] = styleMatch
  const node = ensureNode(nodes, id)
  node.data.style = {
    ...(node.data.style ?? {}),
    ...parseFlowchartNodeStyleDeclarationText(declarationText)
  }
}

function applyFlowchartClassDefinition(line: string, classStyles: Map<string, FlowchartNodeStyle>): void {
  const definitionMatch = line.match(/^classDef\s+([^\s]+)\s+(.+?);?$/)
  if (!definitionMatch) {
    return
  }

  const [, classNamesText, declarationText] = definitionMatch
  const style = parseFlowchartNodeStyleDeclarationText(declarationText)
  const classNames = classNamesText.split(',').map((className) => className.trim()).filter(Boolean)

  for (const className of classNames) {
    classStyles.set(className, {
      ...(classStyles.get(className) ?? {}),
      ...style
    })
  }
}

function applyFlowchartClassAssignment(line: string, nodeClassAssignments: Map<string, string[]>): void {
  const assignmentMatch = line.match(/^class\s+([^\s]+)\s+([^;]+?);?$/)
  if (!assignmentMatch) {
    return
  }

  const [, nodeIdsText, classNamesText] = assignmentMatch
  const nodeIds = nodeIdsText.split(',').map((nodeId) => nodeId.trim()).filter(Boolean)
  const classNames = classNamesText.split(',').map((className) => className.trim()).filter(Boolean)

  for (const nodeId of nodeIds) {
    recordFlowchartNodeClasses(nodeClassAssignments, nodeId, classNames)
  }
}

function applyFlowchartEdgeStyle(line: string, edges: VisualEdge[], edgeIndexById: Map<number, string>): void {
  const styleMatch = line.match(/^linkStyle\s+([^\s]+)\s+(.+)$/)
  if (!styleMatch) {
    return
  }

  const [, selectorText, declarationText] = styleMatch
  const targetEdgeIds = selectorText.toLowerCase() === 'default'
    ? edges.map((edge) => edge.id)
    : selectorText
        .split(',')
        .map((item) => edgeIndexById.get(Number(item.trim())))
        .filter((edgeId): edgeId is string => Boolean(edgeId))

  if (targetEdgeIds.length === 0) {
    return
  }

  const declarations = parseStyleDeclarations(declarationText)

  for (const edgeId of targetEdgeIds) {
    const edge = edges.find((item) => item.id === edgeId)
    if (!edge) {
      continue
    }

    edge.data = {
      ...(edge.data ?? {}),
      visualStyle: {
        ...(edge.data?.visualStyle ?? {}),
        ...(declarations.stroke ? { strokeColor: declarations.stroke } : {}),
        ...(declarations['stroke-width'] ? { strokeWidth: parsePixelValue(declarations['stroke-width']) } : {})
      }
    }
  }
}

function parseStyleDeclarations(text: string): Record<string, string> {
  return text.split(',').reduce<Record<string, string>>((result, declaration) => {
    const [key, value] = declaration.split(':').map((item) => item.trim())
    if (key && value) {
      result[key] = value
    }
    return result
  }, {})
}

function parseFlowchartNodeStyleDeclarationText(text: string): FlowchartNodeStyle {
  const declarations = parseStyleDeclarations(text)
  return {
    ...(declarations.fill ? { fillColor: declarations.fill } : {}),
    ...(declarations.stroke ? { strokeColor: declarations.stroke } : {}),
    ...(declarations.color ? { textColor: declarations.color } : {}),
    ...(declarations['stroke-width'] ? { borderWidth: parsePixelValue(declarations['stroke-width']) } : {})
  }
}

function parsePixelValue(value: string): number | undefined {
  const numericValue = Number.parseFloat(value.replace(/px$/i, ''))
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function parseFlowchartNodeDescriptor(
  descriptorText: string
): ParsedFlowchartNodeDescriptor | undefined {
  const { descriptor, classNames } = splitFlowchartDescriptorClasses(descriptorText.trim())
  const expandedDescriptor = parseExpandedFlowchartNodeDescriptor(descriptor)

  if (expandedDescriptor) {
    return {
      ...expandedDescriptor,
      ...(classNames.length > 0 ? { classNames } : {})
    }
  }

  for (const [shape, pattern] of flowchartDescriptorPatterns) {
    const match = descriptor.match(pattern)
    if (match) {
      const [, id, label] = match
      return {
        id,
        label: normalizeFlowchartLabel(label),
        shape,
        ...(classNames.length > 0 ? { classNames } : {})
      }
    }
  }

  const plainIdMatch = descriptor.match(/^([A-Za-z0-9_:.\-]+)$/)
  if (plainIdMatch) {
    return {
      id: plainIdMatch[1],
      label: plainIdMatch[1],
      ...(classNames.length > 0 ? { classNames } : {})
    }
  }

  return undefined
}

function splitFlowchartDescriptorClasses(descriptor: string): { descriptor: string; classNames: string[] } {
  const match = descriptor.match(/^(.*?)(:::[A-Za-z0-9_:-]+(?:\s*:::[A-Za-z0-9_:-]+)*)\s*$/)
  if (!match) {
    return { descriptor, classNames: [] }
  }

  const [, baseDescriptor, suffix] = match
  const classNames = Array.from(suffix.matchAll(/:::([A-Za-z0-9_:-]+)/g)).map((item) => item[1]).filter(Boolean)
  return {
    descriptor: baseDescriptor.trim(),
    classNames
  }
}

function parseFlowchartEdgeExpression(
  line: string
):
  | {
      source: ParsedFlowchartNodeDescriptor
      target: ParsedFlowchartNodeDescriptor
      label?: string
      lineStyle: FlowchartEdgeStyle
    }
  | undefined {
  const pipeLabelMatch = line.match(/^(.*?)\s+(<-->|o--o|x--x|-->|---|-\.->|-\.\-|==>|===|--o|--x)\|([^|]+)\|\s+(.*?)$/)
  if (pipeLabelMatch) {
    const [, sourceText, linkToken, label, targetText] = pipeLabelMatch
    return createFlowchartEdgeDescriptor(sourceText, targetText, parseFlowchartLineStyle(linkToken), normalizeEscapedText(label))
  }

  const quotedLabelMatch = line.match(/^(.*?)\s+(--|-\.|==)\s+"((?:\\.|[^"])*)"\s+(-->|---|\.->|\.\-|==>|==)\s+(.*?)$/)
  if (quotedLabelMatch) {
    const [, sourceText, startToken, label, endToken, targetText] = quotedLabelMatch
    const lineStyle = parseFlowchartLineStylePair(startToken, endToken)
    if (!lineStyle) {
      return undefined
    }

    return createFlowchartEdgeDescriptor(sourceText, targetText, lineStyle, normalizeEscapedText(label))
  }

  const spacedLabelMatch = line.match(/^(.*?)\s+(--|-\.|==)\s+(.+?)\s+(-->|---|\.->|\.\-|==>|==)\s+(.*?)$/)
  if (spacedLabelMatch) {
    const [, sourceText, startToken, label, endToken, targetText] = spacedLabelMatch
    const lineStyle = parseFlowchartLineStylePair(startToken, endToken)
    if (!lineStyle) {
      return undefined
    }

    return createFlowchartEdgeDescriptor(sourceText, targetText, lineStyle, normalizeEscapedText(label))
  }

  const simpleMatch = line.match(/^(.*?)\s+(<-->|o--o|x--x|-->|---|-\.->|-\.\-|==>|===|--o|--x)\s+(.*?)$/)
  if (!simpleMatch) {
    return undefined
  }

  const [, sourceText, linkToken, targetText] = simpleMatch
  return createFlowchartEdgeDescriptor(sourceText, targetText, parseFlowchartLineStyle(linkToken))
}

function parseFlowchartEdgeExpressions(
  line: string
):
  | Array<{
      source: ParsedFlowchartNodeDescriptor
      target: ParsedFlowchartNodeDescriptor
      label?: string
      lineStyle: FlowchartEdgeStyle
    }>
  | undefined {
  const chainedEdges = parseChainedFlowchartEdgeExpressions(line)
  if (chainedEdges && chainedEdges.length > 0) {
    return chainedEdges
  }

  const singleEdge = parseFlowchartEdgeExpression(line)
  return singleEdge ? [singleEdge] : undefined
}

function parseChainedFlowchartEdgeExpressions(
  line: string
):
  | Array<{
      source: ParsedFlowchartNodeDescriptor
      target: ParsedFlowchartNodeDescriptor
      label?: string
      lineStyle: FlowchartEdgeStyle
    }>
  | undefined {
  const links = Array.from(line.matchAll(flowchartLinkPattern)).map((match) => ({
    index: match.index ?? -1,
    raw: match[0],
    token: match[1],
    label: match[2]
  }))

  if (links.length === 0) {
    return undefined
  }

  const firstSourceText = line.slice(0, links[0].index).trim()
  let currentSources = parseFlowchartNodeGroup(firstSourceText)
  if (!currentSources || currentSources.length === 0) {
    return undefined
  }

  const parsedEdges: Array<{
    source: { id: string; label: string; shape?: FlowchartNodeShape }
    target: { id: string; label: string; shape?: FlowchartNodeShape }
    label?: string
    lineStyle: FlowchartEdgeStyle
  }> = []

  for (let index = 0; index < links.length; index += 1) {
    const currentLink = links[index]
    const nextLink = links[index + 1]
    const targetText = line
      .slice(currentLink.index + currentLink.raw.length, nextLink?.index ?? line.length)
      .trim()
    const currentTargets = parseFlowchartNodeGroup(targetText)

    if (!currentTargets || currentTargets.length === 0) {
      return undefined
    }

    for (const source of currentSources) {
      for (const target of currentTargets) {
        parsedEdges.push({
          source,
          target,
          ...(currentLink.label ? { label: normalizeEscapedText(currentLink.label) } : {}),
          lineStyle: parseFlowchartLineStyle(currentLink.token)
        })
      }
    }

    currentSources = currentTargets
  }

  return parsedEdges
}

function createFlowchartEdgeDescriptor(
  sourceText: string,
  targetText: string,
  lineStyle: FlowchartEdgeStyle,
  label?: string
):
  | {
      source: ParsedFlowchartNodeDescriptor
      target: ParsedFlowchartNodeDescriptor
      label?: string
      lineStyle: FlowchartEdgeStyle
    }
  | undefined {
  const source = parseFlowchartNodeDescriptor(sourceText)
  const target = parseFlowchartNodeDescriptor(targetText)

  if (!source || !target) {
    return undefined
  }

  return {
    source,
    target,
    label,
    lineStyle
  }
}

function ensureNodeFromFlowchartDescriptor(
  nodes: Map<string, VisualNode>,
  descriptor: ParsedFlowchartNodeDescriptor,
  nodeClassAssignments: Map<string, string[]>
): VisualNode {
  recordFlowchartNodeClasses(nodeClassAssignments, descriptor.id, descriptor.classNames)
  return ensureNode(nodes, descriptor.id, descriptor.label, {
    ...(descriptor.shape ? { shape: descriptor.shape } : {})
  })
}

function recordFlowchartNodeClasses(
  nodeClassAssignments: Map<string, string[]>,
  nodeId: string,
  classNames: string[] | undefined
): void {
  if (!classNames || classNames.length === 0) {
    return
  }

  const existingClassNames = nodeClassAssignments.get(nodeId) ?? []
  for (const className of classNames) {
    if (!existingClassNames.includes(className)) {
      existingClassNames.push(className)
    }
  }

  nodeClassAssignments.set(nodeId, existingClassNames)
}

function mergeAssignedFlowchartClassStyles(
  nodeId: string,
  nodeClassAssignments: Map<string, string[]>,
  classStyles: Map<string, FlowchartNodeStyle>
): FlowchartNodeStyle | undefined {
  const classNames = nodeClassAssignments.get(nodeId)
  if (!classNames || classNames.length === 0) {
    return undefined
  }

  const mergedStyle = classNames.reduce<FlowchartNodeStyle>((result, className) => {
    const classStyle = classStyles.get(className)
    return classStyle ? { ...result, ...classStyle } : result
  }, {})

  return Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined
}

function parseFlowchartShape(token: string): FlowchartNodeShape {
  switch (token) {
    case '((': return 'circle'
    case 'o': return 'smallCircle'
    case '(((': return 'doubleCircle'
    case '([': return 'stadium'
    case '[[': return 'subroutine'
    case '[/': return 'trapezoid'
    case '[\\': return 'inverseTrapezoid'
    case '("': return 'rounded'
    case '{"': return 'diamond'
    case '{{"': return 'hexagon'
    case '>"': return 'asymmetric'
    case '[':
    case '["':
    default:
      return 'rectangle'
  }
}

function parseFlowchartLineStylePair(startToken: string, endToken: string): FlowchartEdgeStyle | undefined {
  if (startToken === '--' && endToken === '-->') {
    return 'arrow'
  }

  if (startToken === '--' && endToken === '---') {
    return 'line'
  }

  if (startToken === '-.' && endToken === '.->') {
    return 'dottedArrow'
  }

  if (startToken === '-.' && endToken === '.-') {
    return 'dottedLine'
  }

  if (startToken === '==' && endToken === '==>') {
    return 'thickArrow'
  }

  if (startToken === '==' && endToken === '==') {
    return 'thickLine'
  }

  return undefined
}

function parseFlowchartLineStyle(token: string): FlowchartEdgeStyle {
  switch (token) {
    case '<-->':
      return 'bidirectionalArrow'
    case 'o--o':
      return 'bidirectionalCircle'
    case 'x--x':
      return 'bidirectionalCross'
    case '---':
      return 'line'
    case '-.->':
      return 'dottedArrow'
    case '-.-':
      return 'dottedLine'
    case '==>':
      return 'thickArrow'
    case '===':
      return 'thickLine'
    case '--o':
      return 'circleEdge'
    case '--x':
      return 'crossEdge'
    case '-->':
    default:
      return 'arrow'
  }
}
function parseExpandedFlowchartNodeDescriptor(
  descriptorText: string
): { id: string; label: string; shape?: FlowchartNodeShape } | undefined {
  const match = descriptorText.match(/^([A-Za-z0-9_:.\-]+)@\{\s*(.+)\s*\}$/)
  if (!match) {
    return undefined
  }

  const [, id, propertyText] = match
  const properties = parseMermaidPropertyMap(propertyText)
  const shapeToken = properties.shape ? normalizeEscapedText(properties.shape).toLowerCase() : undefined
  const shape = shapeToken ? flowchartShapeAliases[shapeToken] : undefined
  const label = properties.label ? normalizeFlowchartLabel(properties.label) : id

  return {
    id,
    label,
    ...(shape ? { shape } : {})
  }
}

function parseMermaidPropertyMap(text: string): Record<string, string> {
  return splitMermaidProperties(text).reduce<Record<string, string>>((result, entry) => {
    const separatorIndex = entry.indexOf(':')
    if (separatorIndex === -1) {
      return result
    }

    const key = entry.slice(0, separatorIndex).trim()
    const value = entry.slice(separatorIndex + 1).trim()
    if (key && value) {
      result[key] = value
    }

    return result
  }, {})
}

function splitMermaidProperties(text: string): string[] {
  const entries: string[] = []
  let current = ''
  let quote: '"' | "'" | undefined

  for (const character of text) {
    if ((character === '"' || character === "'") && !quote) {
      quote = character
      current += character
      continue
    }

    if (quote && character === quote && !current.endsWith('\\')) {
      quote = undefined
      current += character
      continue
    }

    if (character === ',' && !quote) {
      if (current.trim()) {
        entries.push(current.trim())
      }
      current = ''
      continue
    }

    current += character
  }

  if (current.trim()) {
    entries.push(current.trim())
  }

  return entries
}

function parseFlowchartNodeGroup(
  text: string
): Array<{ id: string; label: string; shape?: FlowchartNodeShape }> | undefined {
  const descriptors = splitTopLevelFlowchartGroup(text)
    .map((part) => parseFlowchartNodeDescriptor(part.trim()))

  if (descriptors.some((descriptor) => !descriptor)) {
    return undefined
  }

  return descriptors as Array<{ id: string; label: string; shape?: FlowchartNodeShape }>
}

function splitTopLevelFlowchartGroup(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let roundDepth = 0
  let squareDepth = 0
  let curlyDepth = 0
  let quote: '"' | "'" | undefined

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if ((character === '"' || character === "'") && !quote) {
      quote = character
      current += character
      continue
    }

    if (quote && character === quote && text[index - 1] !== '\\') {
      quote = undefined
      current += character
      continue
    }

    if (!quote) {
      if (character === '(') {
        roundDepth += 1
      } else if (character === ')') {
        roundDepth = Math.max(0, roundDepth - 1)
      } else if (character === '[') {
        squareDepth += 1
      } else if (character === ']') {
        squareDepth = Math.max(0, squareDepth - 1)
      } else if (character === '{') {
        curlyDepth += 1
      } else if (character === '}') {
        curlyDepth = Math.max(0, curlyDepth - 1)
      }

      if (character === '&' && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
        if (current.trim()) {
          parts.push(current.trim())
        }
        current = ''
        continue
      }
    }

    current += character
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}
const flowchartDescriptorPatterns: Array<[FlowchartNodeShape, RegExp]> = [
  ['doubleCircle', /^([A-Za-z0-9_:.\-]+)\(\(\((.+?)\)\)\)$/],
  ['circle', /^([A-Za-z0-9_:.\-]+)\(\((.+?)\)\)$/],
  ['cylinder', /^([A-Za-z0-9_:.\-]+)\[\((.+?)\)\]$/],
  ['stadium', /^([A-Za-z0-9_:.\-]+)\(\[(.+?)\]\)$/],
  ['subroutine', /^([A-Za-z0-9_:.\-]+)\[\[(.+?)\]\]$/],
  ['hexagon', /^([A-Za-z0-9_:.\-]+)\{\{(.+?)\}\}$/],
  ['diamond', /^([A-Za-z0-9_:.\-]+)\{(.+?)\}$/],
  ['parallelogram', /^([A-Za-z0-9_:.\-]+)\[\/(.+?)\/\]$/],
  ['trapezoid', /^([A-Za-z0-9_:.\-]+)\[\/(.+?)\\\]$/],
  ['inverseTrapezoid', /^([A-Za-z0-9_:.\-]+)\[\\(.+?)\/\]$/],
  ['asymmetric', /^([A-Za-z0-9_:.\-]+)>(.+?)\]$/],
  ['rounded', /^([A-Za-z0-9_:.\-]+)\((.+?)\)$/],
  ['rectangle', /^([A-Za-z0-9_:.\-]+)\[(.+?)\]$/]
]

const flowchartLinkPattern = /\s*(<-->|o--o|x--x|-->|---|-\.->|-\.\-|==>|===|--o|--x)(?:\|([^|]+)\|)?\s*/g