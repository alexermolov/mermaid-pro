import type { AppTheme, DiagramDirection, DiagramDocument, DiagramType, ProjectDiagram } from '../../../shared/diagram'
import type { EditableEdgeData } from '../components/EditableEdge'
import {
  defaultDiagram,
  graphToMermaidText,
  mermaidTextToGraph,
  toMermaid,
  type VisualEdge,
  type VisualNode
} from './mermaid'

export type DiagramSnapshot = {
  id: string
  title: string
  diagramType: DiagramType
  direction: DiagramDirection
  nodes: VisualNode[]
  edges: VisualEdge[]
  code: string
  autoSync: boolean
  appTheme: AppTheme
}

const initialDiagramId = 'diagram-1'

export function toProjectDocument(
  diagrams: DiagramSnapshot[],
  selectedDiagramId: string,
  appTheme: AppTheme
): DiagramDocument {
  return {
    format: 'mermaid-pro',
    version: 2,
    title: diagrams.find((diagram) => diagram.id === selectedDiagramId)?.title ?? defaultDiagram.title,
    selectedDiagramId,
    diagrams: diagrams.map(toProjectDiagram),
    theme: appTheme
  }
}

export function toProjectDiagram(snapshot: DiagramSnapshot): ProjectDiagram {
  return {
    id: snapshot.id,
    title: snapshot.title,
    type: snapshot.diagramType,
    direction: snapshot.direction,
    nodes: toSerializableNodes(snapshot.nodes),
    edges: toSerializableEdges(snapshot.edges),
    code: snapshot.code,
    autoSync: snapshot.autoSync,
    theme: snapshot.appTheme
  }
}

export function toSnapshotsFromDocument(document: DiagramDocument): DiagramSnapshot[] {
  if (document.diagrams?.length) {
    return document.diagrams.map((diagram, index) => toSnapshotFromProjectDiagram(diagram, document.theme, index))
  }

  return [toSnapshotFromLegacyDocument(document)]
}

export function parseProjectDocument(content: string): DiagramDocument | undefined {
  try {
    const parsedDocument: unknown = JSON.parse(content)

    if (!isRecord(parsedDocument) || parsedDocument.format !== 'mermaid-pro') {
      return undefined
    }

    const theme = parsedDocument.theme === 'light' ? 'light' : 'dark'
    const diagrams = Array.isArray(parsedDocument.diagrams)
      ? parsedDocument.diagrams.map((diagram, index): ProjectDiagram => {
          if (!isRecord(diagram)) {
            return toProjectDiagram(createDefaultDiagramSnapshot(`diagram-${index + 1}`, theme))
          }

          const diagramType = isDiagramType(diagram.type) ? diagram.type : defaultDiagram.type
          const direction = isDiagramDirection(diagram.direction) ? diagram.direction : defaultDiagram.direction
          const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : defaultDiagram.nodes
          const edges = Array.isArray(diagram.edges) ? diagram.edges : defaultDiagram.edges

          return {
            id: typeof diagram.id === 'string' && diagram.id ? diagram.id : `diagram-${index + 1}`,
            title: typeof diagram.title === 'string' ? diagram.title : defaultDiagram.title,
            type: diagramType,
            direction,
            nodes,
            edges,
            code:
              typeof diagram.code === 'string'
                ? diagram.code
                : toMermaid(nodes as VisualNode[], edges as VisualEdge[], direction, diagramType),
            autoSync: typeof diagram.autoSync === 'boolean' ? diagram.autoSync : false,
            theme: diagram.theme === 'light' || diagram.theme === 'dark' ? diagram.theme : theme
          }
        })
      : undefined

    return {
      format: 'mermaid-pro',
      version: parsedDocument.version === 2 ? 2 : 1,
      title: typeof parsedDocument.title === 'string' ? parsedDocument.title : defaultDiagram.title,
      selectedDiagramId:
        typeof parsedDocument.selectedDiagramId === 'string' ? parsedDocument.selectedDiagramId : diagrams?.[0]?.id,
      diagrams,
      type: isDiagramType(parsedDocument.type) ? parsedDocument.type : defaultDiagram.type,
      direction: isDiagramDirection(parsedDocument.direction) ? parsedDocument.direction : defaultDiagram.direction,
      nodes: Array.isArray(parsedDocument.nodes) ? parsedDocument.nodes : defaultDiagram.nodes,
      edges: Array.isArray(parsedDocument.edges) ? parsedDocument.edges : defaultDiagram.edges,
      code: typeof parsedDocument.code === 'string' ? parsedDocument.code : '',
      autoSync: typeof parsedDocument.autoSync === 'boolean' ? parsedDocument.autoSync : false,
      theme
    }
  } catch {
    return undefined
  }
}

export function isProjectFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.mpro')
}

export function toSerializableNodes(nodes: VisualNode[]): VisualNode[] {
  return cloneSerializable(nodes).map((node) => {
    const data = { ...node.data }
    delete data.onLabelChange
    delete data.onDataChange
    delete data.diagramType
    delete data.direction

    return {
      ...node,
      selected: false,
      dragging: false,
      data
    }
  })
}

export function toSerializableEdges(edges: VisualEdge[]): VisualEdge[] {
  return cloneSerializable(edges).map((edge) => {
    const data = { ...(edge.data ?? {}) } as EditableEdgeData
    delete data.onLabelChange

    return {
      ...edge,
      selected: false,
      data
    }
  })
}

export function createDefaultDiagramSnapshot(id: string, appTheme: AppTheme = 'dark'): DiagramSnapshot {
  return {
    id,
    title: defaultDiagram.title,
    diagramType: defaultDiagram.type,
    direction: defaultDiagram.direction,
    nodes: toSerializableNodes(defaultDiagram.nodes),
    edges: toSerializableEdges(defaultDiagram.edges),
    code: toMermaid(defaultDiagram.nodes, defaultDiagram.edges, defaultDiagram.direction, defaultDiagram.type),
    autoSync: true,
    appTheme
  }
}

export function createDiagramSnapshotFromMermaidCode(
  code: string,
  options: {
    id?: string
    title?: string
    autoSync?: boolean
    appTheme?: AppTheme
  } = {}
): DiagramSnapshot {
  const parsedDiagram = mermaidTextToGraph(code)

  return {
    id: options.id ?? createDiagramId(),
    title: options.title ?? defaultDiagram.title,
    diagramType: parsedDiagram.diagramType,
    direction: parsedDiagram.direction,
    nodes: toSerializableNodes(parsedDiagram.nodes),
    edges: toSerializableEdges(parsedDiagram.edges),
    code,
    autoSync: options.autoSync ?? false,
    appTheme: options.appTheme ?? 'dark'
  }
}

export function createDiagramSnapshotFromGraph(
  graph: {
    diagramType: DiagramType
    direction: DiagramDirection
    nodes: VisualNode[]
    edges: VisualEdge[]
  },
  options: {
    id?: string
    title?: string
    autoSync?: boolean
    appTheme?: AppTheme
  } = {}
): DiagramSnapshot {
  const nodes = toSerializableNodes(graph.nodes)
  const edges = toSerializableEdges(graph.edges)

  return {
    id: options.id ?? createDiagramId(),
    title: options.title ?? defaultDiagram.title,
    diagramType: graph.diagramType,
    direction: graph.direction,
    nodes,
    edges,
    code: graphToMermaidText({
      diagramType: graph.diagramType,
      direction: graph.direction,
      nodes,
      edges
    }),
    autoSync: options.autoSync ?? true,
    appTheme: options.appTheme ?? 'dark'
  }
}

export function createDiagramId(): string {
  return `diagram-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function cloneSnapshot(snapshot: DiagramSnapshot): DiagramSnapshot {
  return cloneSerializable(snapshot)
}

export function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function getSnapshotKey(snapshot: DiagramSnapshot): string {
  return JSON.stringify(snapshot)
}

function toSnapshotFromProjectDiagram(diagram: ProjectDiagram, fallbackTheme: AppTheme, index: number): DiagramSnapshot {
  return {
    id: diagram.id || `diagram-${index + 1}`,
    title: diagram.title || defaultDiagram.title,
    diagramType: diagram.type,
    direction: diagram.direction,
    nodes: toSerializableNodes(diagram.nodes as VisualNode[]).map((node) => ({
      ...node,
      type: node.type ?? 'editableNode'
    })),
    edges: toSerializableEdges(diagram.edges as VisualEdge[]),
    code: diagram.code,
    autoSync: diagram.autoSync,
    appTheme: diagram.theme ?? fallbackTheme
  }
}

function toSnapshotFromLegacyDocument(document: DiagramDocument): DiagramSnapshot {
  const diagramType = document.type ?? defaultDiagram.type
  const direction = document.direction ?? defaultDiagram.direction
  const nodes = Array.isArray(document.nodes) ? (document.nodes as VisualNode[]) : defaultDiagram.nodes
  const edges = Array.isArray(document.edges) ? (document.edges as VisualEdge[]) : defaultDiagram.edges

  return {
    id: document.selectedDiagramId ?? initialDiagramId,
    title: document.title,
    diagramType,
    direction,
    nodes: toSerializableNodes(nodes).map((node) => ({
      ...node,
      type: node.type ?? 'editableNode'
    })),
    edges: toSerializableEdges(edges as VisualEdge[]),
    code: document.code ?? toMermaid(nodes, edges as VisualEdge[], direction, diagramType),
    autoSync: document.autoSync ?? false,
    appTheme: document.theme
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDiagramType(value: unknown): value is DiagramType {
  return (
    value === 'flowchart' ||
    value === 'sequence' ||
    value === 'class' ||
    value === 'state' ||
    value === 'er' ||
    value === 'mindmap' ||
    value === 'timeline'
  )
}

function isDiagramDirection(value: unknown): value is DiagramDirection {
  return value === 'TD' || value === 'LR' || value === 'BT' || value === 'RL'
}