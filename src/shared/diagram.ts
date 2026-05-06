import type { Edge, Node } from '@xyflow/react'

export type DiagramNodeData = {
  label: string
}

export type DiagramNode = Node<DiagramNodeData>
export type DiagramEdge = Edge

export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'mindmap' | 'timeline'

export type DiagramDirection = 'TD' | 'LR' | 'BT' | 'RL'

export type AppTheme = 'light' | 'dark'

export type ProjectDiagram = {
  id: string
  title: string
  type: DiagramType
  direction: DiagramDirection
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  code: string
  autoSync: boolean
  theme?: AppTheme
}

export type DiagramDocument = {
  format: 'mermaid-pro'
  version: 1 | 2
  title: string
  selectedDiagramId?: string
  diagrams?: ProjectDiagram[]
  type?: DiagramType
  direction?: DiagramDirection
  nodes?: DiagramNode[]
  edges?: DiagramEdge[]
  code?: string
  autoSync?: boolean
  theme: AppTheme
}

export type OpenDiagramResult = {
  canceled: boolean
  filePath?: string
  content?: string
}

export type SaveDiagramPayload = {
  content: string
  defaultPath?: string
  format?: 'project' | 'mermaid'
}

export type LastProjectResult = OpenDiagramResult

export type SaveExportPayload = {
  fileName: string
  data: string
  extension: 'svg' | 'png'
}
