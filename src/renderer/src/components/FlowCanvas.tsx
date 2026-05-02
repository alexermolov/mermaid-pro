import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams
} from '@xyflow/react'
import type { ReactNode } from 'react'
import { EditableNode } from './EditableNode'
import { EditableEdge } from './EditableEdge'
import type { VisualNode } from '../lib/mermaid'

const nodeTypes = { editableNode: EditableNode }
const edgeTypes = { editableEdge: EditableEdge }

type FlowTheme = {
  backgroundColor: string
  miniMapMaskColor: string
  miniMapStrokeColor: string
}

type FlowCanvasProps = {
  nodes: VisualNode[]
  edges: Edge[]
  flowTheme: FlowTheme
  onNodesChange: (changes: NodeChange<VisualNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onSelectionChange: (params: OnSelectionChangeParams) => void
  children?: ReactNode
}

export function FlowCanvas({
  nodes,
  edges,
  flowTheme,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  children
}: FlowCanvasProps): JSX.Element {
  return (
    <section className="canvas-panel">
      {children}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background color={flowTheme.backgroundColor} />
        <MiniMap
          zoomable
          pannable
          maskColor={flowTheme.miniMapMaskColor}
          nodeStrokeColor={flowTheme.miniMapStrokeColor}
        />
        <Controls />
      </ReactFlow>
    </section>
  )
}
