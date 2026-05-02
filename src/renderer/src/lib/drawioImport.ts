import type { VisualEdge, VisualNode } from './mermaid'

export type DrawioImportResult = {
  nodes: VisualNode[]
  edges: VisualEdge[]
}

const parserErrorSelector = 'parsererror'

export function importDrawioDiagram(content: string): DrawioImportResult | undefined {
  const document = new DOMParser().parseFromString(content, 'text/xml')
  if (document.querySelector(parserErrorSelector)) {
    return undefined
  }

  const model = getGraphModel(document)
  if (!model) {
    return undefined
  }

  const cells = Array.from(model.querySelectorAll('mxCell'))
  const nodes = cells.filter((cell) => cell.getAttribute('vertex') === '1').map(toVisualNode)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = cells
    .filter((cell) => cell.getAttribute('edge') === '1')
    .map((cell) => toVisualEdge(cell, nodeIds))
    .filter((edge): edge is VisualEdge => Boolean(edge))

  if (nodes.length === 0) {
    return undefined
  }

  return { nodes, edges }
}

export function isDrawioDiagram(content: string): boolean {
  return /<mxfile\b|<mxGraphModel\b|<mxCell\b/i.test(content)
}

function getGraphModel(document: Document): Element | null {
  const directModel = document.querySelector('mxGraphModel')
  if (directModel) {
    return directModel
  }

  const diagram = document.querySelector('diagram')
  return diagram?.querySelector('mxGraphModel') ?? null
}

function toVisualNode(cell: Element): VisualNode {
  const id = cell.getAttribute('id') || `drawio_node_${crypto.randomUUID()}`
  const geometry = getGeometry(cell)
  const label = cleanLabel(cell.getAttribute('value')) || id

  return {
    id,
    type: 'editableNode',
    position: {
      x: readNumberAttribute(geometry, 'x', 0),
      y: readNumberAttribute(geometry, 'y', 0)
    },
    data: { label }
  }
}

function toVisualEdge(cell: Element, nodeIds: Set<string>): VisualEdge | undefined {
  const source = cell.getAttribute('source')
  const target = cell.getAttribute('target')
  if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
    return undefined
  }

  const label = cleanLabel(cell.getAttribute('value'))

  return {
    id: cell.getAttribute('id') || `${source}-${target}-${crypto.randomUUID()}`,
    source,
    target,
    animated: true,
    ...(label ? { label } : {})
  }
}

function getGeometry(cell: Element): Element | null {
  return Array.from(cell.children).find((child) => child.tagName === 'mxGeometry') ?? null
}

function readNumberAttribute(element: Element | null, attribute: string, fallback: number): number {
  const value = Number(element?.getAttribute(attribute))
  return Number.isFinite(value) ? value : fallback
}

function cleanLabel(value: string | null): string {
  if (!value) {
    return ''
  }

  const template = document.createElement('template')
  template.innerHTML = value.replace(/<br\s*\/?>/gi, '\n')
  return (template.content.textContent ?? value).replace(/\s+/g, ' ').trim()
}
