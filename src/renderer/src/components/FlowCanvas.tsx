import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams
} from '@xyflow/react'
import { useEffect, type ReactNode } from 'react'
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
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void
  onSelectionChange: (params: OnSelectionChangeParams) => void
  fitViewToken: number
  children?: ReactNode
}

export function FlowCanvas({
  nodes,
  edges,
  flowTheme,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onSelectionChange,
  fitViewToken,
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
        onReconnect={onReconnect}
        onSelectionChange={onSelectionChange}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesReconnectable={true}
        reconnectRadius={20}
        fitView
      >
        <FlowViewportSync fitViewToken={fitViewToken} />
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

function FlowViewportSync({ fitViewToken }: { fitViewToken: number }): null {
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (fitViewToken === 0) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.18, duration: 250 })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [fitView, fitViewToken])

  return null
}
