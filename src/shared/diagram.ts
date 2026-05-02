import type { Edge, Node } from '@xyflow/react'

export type DiagramNodeData = {
  label: string
}

export type DiagramNode = Node<DiagramNodeData>
export type DiagramEdge = Edge

export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'mindmap'

export type DiagramDirection = 'TD' | 'LR' | 'BT' | 'RL'

export type DiagramDocument = {
  title: string
  type: DiagramType
  direction: DiagramDirection
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  code: string
}

export type OpenDiagramResult = {
  canceled: boolean
  filePath?: string
  content?: string
}

export type SaveDiagramPayload = {
  content: string
  defaultPath?: string
}

export type SaveExportPayload = {
  fileName: string
  data: string
  extension: 'svg' | 'png'
}
