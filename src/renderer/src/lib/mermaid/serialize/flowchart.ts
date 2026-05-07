import type { DiagramDirection } from '../../../../../shared/diagram'
import { sanitizeId } from '../ids'
import {
  escapeFlowchartPipeLabel,
  escapeLabel,
  escapeQuotedText
} from '../text-utils'
import type {
  FlowchartClassStyleMap,
  FlowchartEdgeStyle,
  FlowchartEdgeVisualStyle,
  FlowchartNodeShape,
  FlowchartNodeStyle,
  VisualEdge,
  VisualNode
} from '../types'

function formatExpandedFlowchartNode(mermaidShape: string): (id: string, label: string) => string {
  return (id, label) => `  ${id}@{ shape: ${mermaidShape}, label: "${label}" }`
}

const flowchartNodeFormatters: Record<FlowchartNodeShape, (id: string, label: string) => string> = {
  rectangle: (id, label) => `  ${id}["${label}"]`,
  rounded: (id, label) => `  ${id}("${label}")`,
  stadium: (id, label) => `  ${id}(["${label}"])`,
  subroutine: (id, label) => `  ${id}[["${label}"]]`,
  cylinder: (id, label) => `  ${id}[("${label}")]`,
  circle: (id, label) => `  ${id}(("${label}"))`,
  smallCircle: formatExpandedFlowchartNode('sm-circ'),
  doubleCircle: (id, label) => `  ${id}((("${label}")))`,
  framedCircle: formatExpandedFlowchartNode('fr-circ'),
  diamond: (id, label) => `  ${id}{"${label}"}`,
  hexagon: (id, label) => `  ${id}{{"${label}"}}`,
  parallelogram: (id, label) => `  ${id}[/"${label}"/]`,
  trapezoid: (id, label) => `  ${id}[/"${label}"\\]`,
  inverseTrapezoid: (id, label) => `  ${id}[\\"${label}"/]`,
  asymmetric: (id, label) => `  ${id}>"${label}"]`,
  fork: formatExpandedFlowchartNode('fork'),
  hourglass: formatExpandedFlowchartNode('hourglass'),
  comment: formatExpandedFlowchartNode('brace'),
  commentRight: formatExpandedFlowchartNode('brace-r'),
  commentBoth: formatExpandedFlowchartNode('braces'),
  bolt: formatExpandedFlowchartNode('bolt'),
  document: formatExpandedFlowchartNode('doc'),
  delay: formatExpandedFlowchartNode('delay'),
  directAccessStorage: formatExpandedFlowchartNode('h-cyl'),
  linedCylinder: formatExpandedFlowchartNode('lin-cyl'),
  display: formatExpandedFlowchartNode('curv-trap'),
  dividedRectangle: formatExpandedFlowchartNode('div-rect'),
  triangle: formatExpandedFlowchartNode('tri'),
  windowPane: formatExpandedFlowchartNode('win-pane'),
  filledCircle: formatExpandedFlowchartNode('f-circ'),
  linedDocument: formatExpandedFlowchartNode('lin-doc'),
  notchedPentagon: formatExpandedFlowchartNode('notch-pent'),
  flippedTriangle: formatExpandedFlowchartNode('flip-tri'),
  slopedRectangle: formatExpandedFlowchartNode('sl-rect'),
  stackedDocument: formatExpandedFlowchartNode('docs'),
  stackedRectangle: formatExpandedFlowchartNode('st-rect'),
  paperTape: formatExpandedFlowchartNode('flag'),
  bowTieRectangle: formatExpandedFlowchartNode('bow-rect'),
  crossedCircle: formatExpandedFlowchartNode('cross-circ'),
  taggedDocument: formatExpandedFlowchartNode('tag-doc'),
  taggedRectangle: formatExpandedFlowchartNode('tag-rect'),
  notchedRectangle: formatExpandedFlowchartNode('notch-rect'),
  linedRectangle: formatExpandedFlowchartNode('lin-rect'),
  cloud: formatExpandedFlowchartNode('cloud')
}

const flowchartLinkFormatters: Record<FlowchartEdgeStyle, (label: string) => string> = {
  arrow: (label) => (label ? `-- "${escapeQuotedText(label)}" -->` : '-->'),
  line: (label) => (label ? `-- "${escapeQuotedText(label)}" ---` : '---'),
  dottedArrow: (label) => (label ? `-. "${escapeQuotedText(label)}" .->` : '-.->'),
  dottedLine: (label) => (label ? `-. "${escapeQuotedText(label)}" .-` : '-.-'),
  thickArrow: (label) => (label ? `== "${escapeQuotedText(label)}" ==>` : '==>'),
  thickLine: (label) => (label ? `== "${escapeQuotedText(label)}" ==` : '==='),
  circleEdge: (label) => (label ? `--o|${escapeFlowchartPipeLabel(label)}|` : '--o'),
  crossEdge: (label) => (label ? `--x|${escapeFlowchartPipeLabel(label)}|` : '--x'),
  bidirectionalArrow: (label) => (label ? `<-->|${escapeFlowchartPipeLabel(label)}|` : '<-->'),
  bidirectionalCircle: (label) => (label ? `o--o|${escapeFlowchartPipeLabel(label)}|` : 'o--o'),
  bidirectionalCross: (label) => (label ? `x--x|${escapeFlowchartPipeLabel(label)}|` : 'x--x')
}

export function toFlowchart(nodes: VisualNode[], edges: VisualEdge[], direction: DiagramDirection): string {
  const { classDefinitionLines, classAssignmentLines, nodeStyleLines } = formatFlowchartClassLines(nodes)
  const subgraphTree = collectFlowchartSubgraphTree(nodes)

  const nodeLines = formatFlowchartNodeLines(nodes, subgraphTree)

  const edgeLines = edges
    .map((edge) => {
      const label = edge.label ? String(edge.label) : ''
      return `  ${sanitizeId(edge.source)} ${formatFlowchartLink(edge.data?.lineStyle, label)} ${sanitizeId(edge.target)}`
    })
    .join('\n')

  const edgeStyleLines = edges
    .map((edge, index) => formatFlowchartEdgeStyle(index, edge.data?.visualStyle))
    .filter(Boolean)
    .join('\n')

  return [
    `flowchart ${direction}`,
    classDefinitionLines,
    nodeLines,
    edgeLines,
    classAssignmentLines,
    nodeStyleLines,
    edgeStyleLines
  ]
    .filter(Boolean)
    .join('\n')
}

function formatFlowchartNodeLines(nodes: VisualNode[], subgraphTree: FlowchartSubgraphTree): string {
  const lines: string[] = []
  const assignedNodeIds = new Set<string>()

  for (const rootSubgraph of subgraphTree.rootSubgraphs) {
    renderFlowchartSubgraph(lines, rootSubgraph, assignedNodeIds, 1)
  }

  for (const node of nodes) {
    if (assignedNodeIds.has(node.id)) {
      continue
    }
    lines.push(formatFlowchartNode(sanitizeId(node.id), escapeLabel(node.data.label || node.id), node.data.shape))
  }

  return lines.join('\n')
}

function formatFlowchartNode(id: string, label: string, shape: FlowchartNodeShape = 'rectangle'): string {
  return flowchartNodeFormatters[shape](id, label)
}

function formatFlowchartLink(lineStyle: FlowchartEdgeStyle = 'arrow', label: string): string {
  return flowchartLinkFormatters[lineStyle](label)
}

function formatFlowchartNodeStyle(id: string, style: FlowchartNodeStyle | undefined): string {
  const declarations = formatFlowchartNodeStyleDeclarations(style)

  return declarations.length > 0 ? `  style ${id} ${declarations.join(',')}` : ''
}

function formatFlowchartClassLines(nodes: VisualNode[]): {
  classDefinitionLines: string
  classAssignmentLines: string
  nodeStyleLines: string
} {
  const classDefinitions = new Map<string, FlowchartNodeStyle>()
  const classAssignmentLines: string[] = []
  const nodeStyleLines: string[] = []

  for (const node of nodes) {
    const nodeId = sanitizeId(node.id)
    const classNames = node.data.flowchartClassNames?.filter(Boolean) ?? []
    const classStyles = node.data.flowchartClassStyles ?? {}

    for (const className of classNames) {
      const classStyle = classStyles[className]
      if (!classStyle || Object.keys(classStyle).length === 0) {
        continue
      }

      classDefinitions.set(className, {
        ...(classDefinitions.get(className) ?? {}),
        ...classStyle
      })
    }

    if (classNames.length > 0) {
      classAssignmentLines.push(`  class ${nodeId} ${classNames.join(',')}`)
    }

    const residualStyle = subtractFlowchartNodeStyle(
      node.data.style,
      mergeFlowchartClassStyleList(classNames, classStyles)
    )
    const nodeStyleLine = formatFlowchartNodeStyle(nodeId, residualStyle)
    if (nodeStyleLine) {
      nodeStyleLines.push(nodeStyleLine)
    }
  }

  const classDefinitionLines = Array.from(classDefinitions.entries())
    .map(([className, style]) => formatFlowchartClassDefinition(className, style))
    .filter(Boolean)
    .join('\n')

  return {
    classDefinitionLines,
    classAssignmentLines: classAssignmentLines.join('\n'),
    nodeStyleLines: nodeStyleLines.join('\n')
  }
}

function formatFlowchartClassDefinition(className: string, style: FlowchartNodeStyle): string {
  const declarations = formatFlowchartNodeStyleDeclarations(style)
  return declarations.length > 0 ? `  classDef ${className} ${declarations.join(',')}` : ''
}

function formatFlowchartNodeStyleDeclarations(style: FlowchartNodeStyle | undefined): string[] {
  return [
    style?.fillColor ? `fill:${style.fillColor}` : '',
    style?.strokeColor ? `stroke:${style.strokeColor}` : '',
    style?.textColor ? `color:${style.textColor}` : '',
    style?.borderWidth ? `stroke-width:${style.borderWidth}px` : ''
  ].filter(Boolean)
}

function subtractFlowchartNodeStyle(
  style: FlowchartNodeStyle | undefined,
  inheritedStyle: FlowchartNodeStyle | undefined
): FlowchartNodeStyle | undefined {
  if (!style) {
    return undefined
  }

  const residualStyle: FlowchartNodeStyle = {
    ...(style.fillColor !== undefined && style.fillColor !== inheritedStyle?.fillColor ? { fillColor: style.fillColor } : {}),
    ...(style.strokeColor !== undefined && style.strokeColor !== inheritedStyle?.strokeColor
      ? { strokeColor: style.strokeColor }
      : {}),
    ...(style.textColor !== undefined && style.textColor !== inheritedStyle?.textColor ? { textColor: style.textColor } : {}),
    ...(style.borderWidth !== undefined && style.borderWidth !== inheritedStyle?.borderWidth
      ? { borderWidth: style.borderWidth }
      : {})
  }

  return Object.keys(residualStyle).length > 0 ? residualStyle : undefined
}

function mergeFlowchartClassStyleList(
  classNames: string[],
  classStyles: FlowchartClassStyleMap
): FlowchartNodeStyle | undefined {
  if (classNames.length === 0) {
    return undefined
  }

  const mergedStyle = classNames.reduce<FlowchartNodeStyle>((result, className) => {
    const classStyle = classStyles[className]
    return classStyle ? { ...result, ...classStyle } : result
  }, {})

  return Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined
}

function formatFlowchartEdgeStyle(index: number, style: FlowchartEdgeVisualStyle | undefined): string {
  const declarations = [
    style?.strokeColor ? `stroke:${style.strokeColor}` : '',
    style?.strokeWidth ? `stroke-width:${style.strokeWidth}px` : ''
  ].filter(Boolean)

  return declarations.length > 0 ? `  linkStyle ${index} ${declarations.join(',')}` : ''
}

type FlowchartSubgraphDefinition = {
  id: string
  title?: string
  direction?: DiagramDirection
  ownNodes: VisualNode[]
  childSubgraphs: FlowchartSubgraphDefinition[]
}

type FlowchartSubgraphTree = {
  rootSubgraphs: FlowchartSubgraphDefinition[]
}

function collectFlowchartSubgraphTree(nodes: VisualNode[]): FlowchartSubgraphTree {
  const subgraphMap = new Map<string, FlowchartSubgraphDefinition>()
  const rootSubgraphIds: string[] = []

  for (const node of nodes) {
    const pathIds = node.data.flowchartSubgraphPathIds?.filter(Boolean) ?? []
    const normalizedPathIds = (
      pathIds.length > 0
        ? pathIds
        : node.data.flowchartSubgraphId?.trim()
          ? [node.data.flowchartSubgraphId.trim()]
          : []
    )
      .filter(Boolean)
    if (normalizedPathIds.length === 0) {
      continue
    }

    normalizedPathIds.forEach((subgraphId, index) => {
      const existingSubgraph = subgraphMap.get(subgraphId)
      const pathTitle = node.data.flowchartSubgraphPathTitles?.[index]
      const pathDirection = node.data.flowchartSubgraphPathDirections?.[index]

      if (existingSubgraph) {
        if (!existingSubgraph.title && pathTitle?.trim()) {
          existingSubgraph.title = pathTitle.trim()
        }
        if (!existingSubgraph.direction && pathDirection) {
          existingSubgraph.direction = pathDirection
        }
        return
      }

      subgraphMap.set(subgraphId, {
        id: subgraphId,
        title: pathTitle?.trim() || undefined,
        direction: pathDirection,
        ownNodes: [],
        childSubgraphs: []
      })
    })

    normalizedPathIds.forEach((subgraphId, index) => {
      if (index === 0) {
        if (!rootSubgraphIds.includes(subgraphId)) {
          rootSubgraphIds.push(subgraphId)
        }
        return
      }
      const parentId = normalizedPathIds[index - 1]
      const parent = subgraphMap.get(parentId)
      const child = subgraphMap.get(subgraphId)
      if (parent && child && !parent.childSubgraphs.includes(child)) {
        parent.childSubgraphs.push(child)
      }
    })

    const leafSubgraphId = normalizedPathIds[normalizedPathIds.length - 1]
    const leafSubgraph = subgraphMap.get(leafSubgraphId)
    if (leafSubgraph && !leafSubgraph.ownNodes.some((candidate) => candidate.id === node.id)) {
      leafSubgraph.ownNodes.push(node)
    }
  }

  return {
    rootSubgraphs: rootSubgraphIds
      .map((subgraphId) => subgraphMap.get(subgraphId))
      .filter((subgraph): subgraph is FlowchartSubgraphDefinition => Boolean(subgraph))
  }
}

function formatFlowchartSubgraphHeader(subgraph: FlowchartSubgraphDefinition): string {
  const subgraphId = sanitizeId(subgraph.id)
  if (!subgraph.title || subgraph.title === subgraph.id) {
    return `  subgraph ${subgraphId}`
  }

  return `  subgraph ${subgraphId}["${escapeLabel(subgraph.title)}"]`
}

function renderFlowchartSubgraph(
  lines: string[],
  subgraph: FlowchartSubgraphDefinition,
  assignedNodeIds: Set<string>,
  depth: number
): void {
  const indent = '  '.repeat(depth)
  lines.push(`${indent}${formatFlowchartSubgraphHeader(subgraph).trim()}`)
  if (subgraph.direction) {
    lines.push(`${indent}  direction ${subgraph.direction}`)
  }

  for (const childSubgraph of subgraph.childSubgraphs) {
    renderFlowchartSubgraph(lines, childSubgraph, assignedNodeIds, depth + 1)
  }

  for (const node of subgraph.ownNodes) {
    lines.push(`${indent}  ${formatFlowchartNode(sanitizeId(node.id), escapeLabel(node.data.label || node.id), node.data.shape).trim()}`)
    assignedNodeIds.add(node.id)
  }

  lines.push(`${indent}end`)
}
