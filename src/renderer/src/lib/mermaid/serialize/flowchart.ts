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

  const nodeLines = nodes
    .map((node) => formatFlowchartNode(sanitizeId(node.id), escapeLabel(node.data.label || node.id), node.data.shape))
    .join('\n')

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
