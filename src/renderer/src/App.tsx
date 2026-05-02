import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import type { DiagramDirection, DiagramType } from '../../shared/diagram'
import { AppHeader } from './components/AppHeader'
import { CodeEditorPanel } from './components/CodeEditorPanel'
import { DiagramSidebar } from './components/DiagramSidebar'
import type { EditableEdgeData } from './components/EditableEdge'
import { FlowCanvas } from './components/FlowCanvas'
import { PreviewPanel } from './components/PreviewPanel'
import {
  isTextInputTarget,
  layoutNodesForDirection,
  toFileBaseName,
  type AppTheme
} from './lib/appHelpers'
import { importDrawioDiagram, isDrawioDiagram } from './lib/drawioImport'
import {
  defaultDiagram,
  nextNodeId,
  toMermaid,
  type FlowchartEdgeVisualStyle,
  type FlowchartEdgeStyle,
  type FlowchartNodeShape,
  type FlowchartNodeStyle,
  type VisualEdge,
  type VisualNode
} from './lib/mermaid'

export default function App(): JSX.Element {
  const [title, setTitle] = useState(defaultDiagram.title)
  const [diagramType, setDiagramType] = useState<DiagramType>(defaultDiagram.type)
  const [direction, setDirection] = useState<DiagramDirection>(defaultDiagram.direction)
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<VisualNode>(defaultDiagram.nodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<VisualEdge>(defaultDiagram.edges)
  const [code, setCode] = useState(() =>
    toMermaid(defaultDiagram.nodes, defaultDiagram.edges, defaultDiagram.direction, defaultDiagram.type)
  )
  const [autoSync, setAutoSync] = useState(true)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [renderedSvg, setRenderedSvg] = useState('')
  const [status, setStatus] = useState('Ready')
  const [appTheme, setAppTheme] = useState<AppTheme>('dark')
  const previewRef = useRef<HTMLDivElement>(null)
  const canExport = Boolean(renderedSvg)
  const isDarkTheme = appTheme === 'dark'

  const flowTheme = useMemo(
    () => ({
      backgroundColor: isDarkTheme ? '#475569' : '#bfdbfe',
      miniMapMaskColor: isDarkTheme ? 'rgba(15, 23, 42, 0.56)' : 'rgba(239, 246, 255, 0.64)',
      miniMapStrokeColor: isDarkTheme ? '#60a5fa' : '#2563eb'
    }),
    [isDarkTheme]
  )

  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, label } } : node))
      )
    },
    [setNodes]
  )

  const updateNodeShape = useCallback(
    (id: string, shape: FlowchartNodeShape) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, shape } } : node))
      )
      setAutoSync(true)
    },
    [setNodes]
  )

  const updateNodeStyle = useCallback(
    (id: string, style: Partial<FlowchartNodeStyle>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  style: {
                    ...(node.data.style ?? {}),
                    ...style
                  }
                }
              }
            : node
        )
      )
      setAutoSync(true)
    },
    [setNodes]
  )

  const updateEdgeLabel = useCallback(
    (id: string, label: string) => {
      setEdges((currentEdges) => currentEdges.map((edge) => (edge.id === id ? { ...edge, label } : edge)))
      setAutoSync(true)
    },
    [setEdges]
  )

  const updateEdgeVisualStyle = useCallback(
    (id: string, visualStyle: Partial<FlowchartEdgeVisualStyle>) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...(edge.data ?? {}),
                  visualStyle: {
                    ...(edge.data?.visualStyle ?? {}),
                    ...visualStyle
                  }
                }
              }
            : edge
        )
      )
      setAutoSync(true)
    },
    [setEdges]
  )

  const updateEdgeStyle = useCallback(
    (id: string, lineStyle: FlowchartEdgeStyle) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...(edge.data ?? {}),
                  lineStyle
                }
              }
            : edge
        )
      )
      setAutoSync(true)
    },
    [setEdges]
  )

  const flowNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          direction,
          onLabelChange: updateNodeLabel
        }
      })),
    [direction, nodes, updateNodeLabel]
  )

  const flowEdges = useMemo(
    () =>
      edges.map((edge): Edge<EditableEdgeData> => {
        const lineStyle = edge.data?.lineStyle ?? 'arrow'
        const hasArrow = lineStyle === 'arrow' || lineStyle === 'dottedArrow' || lineStyle === 'thickArrow'

        return {
          ...edge,
          type: 'editableEdge',
          markerEnd: hasArrow
            ? { type: MarkerType.ArrowClosed, color: edge.data?.visualStyle?.strokeColor }
            : undefined,
          data: {
            ...(edge.data ?? {}),
            onLabelChange: updateEdgeLabel
          }
        }
      }),
    [edges, updateEdgeLabel]
  )

  const generatedCode = useMemo(
    () => toMermaid(nodes, edges, direction, diagramType),
    [nodes, edges, direction, diagramType]
  )

  useEffect(() => {
    if (autoSync) {
      setCode(generatedCode)
    }
  }, [autoSync, generatedCode])

  const onNodesChange = useCallback(
    (changes: NodeChange<VisualNode>[]) => {
      onNodesChangeBase(changes)
      setAutoSync(true)
    },
    [onNodesChangeBase]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes)
      setAutoSync(true)
    },
    [onEdgesChangeBase]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            id: `${connection.source}-${connection.target}-${Date.now().toString(36)}`,
            animated: true,
            data: { lineStyle: 'arrow' }
          },
          currentEdges
        )
      )
      setAutoSync(true)
    },
    [setEdges]
  )

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId]
  )

  const selectedNode = useMemo(
    () => (selectedNodeIds.length === 1 ? nodes.find((node) => node.id === selectedNodeIds[0]) ?? null : null),
    [nodes, selectedNodeIds]
  )

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodeIds(params.nodes.map((node) => node.id))
    setSelectedEdgeIds(params.edges.map((edge) => edge.id))
    setSelectedEdgeId(params.edges[0]?.id ?? null)
  }, [])

  const deleteSelectedElements = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      return
    }

    const nodeIdsToDelete = new Set(selectedNodeIds)
    const edgeIdsToDelete = new Set(selectedEdgeIds)

    setNodes((currentNodes) => currentNodes.filter((node) => !nodeIdsToDelete.has(node.id)))
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          !edgeIdsToDelete.has(edge.id) && !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
      )
    )
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setSelectedEdgeId(null)
    setAutoSync(true)
    setStatus('Selected items deleted')
  }, [selectedEdgeIds, selectedNodeIds, setEdges, setNodes])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.key !== 'Delete' && event.key !== 'Backspace') || isTextInputTarget(event.target)) {
        return
      }

      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
        return
      }

      event.preventDefault()
      deleteSelectedElements()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedElements, selectedEdgeIds.length, selectedNodeIds.length])

  function addNode(): void {
    const id = nextNodeId(nodes)
    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        type: 'editableNode',
        position: { x: 120 + currentNodes.length * 40, y: 220 + currentNodes.length * 24 },
        data: { label: `Node ${currentNodes.length + 1}` }
      }
    ])
    setAutoSync(true)
  }

  function updateSelectedEdgeLabel(label: string): void {
    if (!selectedEdgeId) {
      return
    }

    updateEdgeLabel(selectedEdgeId, label)
  }

  function updateSelectedNodeShape(shape: FlowchartNodeShape): void {
    if (!selectedNode) {
      return
    }

    updateNodeShape(selectedNode.id, shape)
  }

  function updateSelectedNodeStyle(style: Partial<FlowchartNodeStyle>): void {
    if (!selectedNode) {
      return
    }

    updateNodeStyle(selectedNode.id, style)
  }

  function updateSelectedEdgeStyle(lineStyle: FlowchartEdgeStyle): void {
    if (!selectedEdgeId) {
      return
    }

    updateEdgeStyle(selectedEdgeId, lineStyle)
  }

  function updateSelectedEdgeVisualStyle(visualStyle: Partial<FlowchartEdgeVisualStyle>): void {
    if (!selectedEdgeId) {
      return
    }

    updateEdgeVisualStyle(selectedEdgeId, visualStyle)
  }

  function updateDiagramType(nextDiagramType: DiagramType): void {
    setDiagramType(nextDiagramType)
    setAutoSync(true)
  }

  function updateDirection(nextDirection: DiagramDirection): void {
    setDirection(nextDirection)
    setNodes((currentNodes) => layoutNodesForDirection(currentNodes, nextDirection))
    setAutoSync(true)
    setStatus(`Flow direction changed to ${nextDirection}`)
  }

  function syncFromVisual(): void {
    setCode(generatedCode)
    setAutoSync(true)
    setStatus('Mermaid code regenerated from visual editor')
  }

  const handleRenderStateChange = useCallback((nextStatus: string) => {
    setStatus(nextStatus)
  }, [])

  function createNewDiagram(): void {
    setTitle(defaultDiagram.title)
    setDiagramType(defaultDiagram.type)
    setDirection(defaultDiagram.direction)
    setNodes(defaultDiagram.nodes)
    setEdges(defaultDiagram.edges)
    setCode(toMermaid(defaultDiagram.nodes, defaultDiagram.edges, defaultDiagram.direction, defaultDiagram.type))
    setAutoSync(true)
    setStatus('New diagram created')
  }

  async function openDiagram(): Promise<void> {
    const result = await window.mermaidPro.openDiagram()

    if (result.canceled || !result.content) {
      return
    }

    const fileName = result.filePath?.split(/[\\/]/).pop() ?? 'Imported Diagram'
    const drawioImport = isDrawioDiagram(result.content) ? importDrawioDiagram(result.content) : undefined

    setTitle(fileName)

    if (drawioImport) {
      const importedCode = toMermaid(drawioImport.nodes, drawioImport.edges, 'LR', 'flowchart')
      setDiagramType('flowchart')
      setDirection('LR')
      setNodes(drawioImport.nodes)
      setEdges(drawioImport.edges)
      setCode(importedCode)
      setAutoSync(true)
      setSelectedNodeIds([])
      setSelectedEdgeIds([])
      setSelectedEdgeId(null)
      setStatus(`Imported draw.io diagram from ${result.filePath}`)
      return
    }

    setCode(result.content)
    setAutoSync(false)
    setStatus(`Opened ${result.filePath}`)
  }

  async function saveDiagram(): Promise<void> {
    const filePath = await window.mermaidPro.saveDiagram({
      content: code,
      defaultPath: `${toFileBaseName(title)}.mmd`
    })

    if (filePath) {
      setStatus(`Saved ${filePath}`)
    }
  }

  async function exportSvg(): Promise<void> {
    if (!renderedSvg) {
      setStatus('Fix Mermaid errors before exporting SVG')
      return
    }

    const filePath = await window.mermaidPro.saveExport({
      fileName: `${toFileBaseName(title)}.svg`,
      data: renderedSvg,
      extension: 'svg'
    })

    if (filePath) {
      setStatus(`Exported ${filePath}`)
    }
  }

  async function exportPng(): Promise<void> {
    if (!previewRef.current || !renderedSvg) {
      setStatus('Fix Mermaid errors before exporting PNG')
      return
    }

    const dataUrl = await toPng(previewRef.current, {
      backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
      pixelRatio: 2
    })
    const filePath = await window.mermaidPro.saveExport({
      fileName: `${toFileBaseName(title)}.png`,
      data: dataUrl,
      extension: 'png'
    })

    if (filePath) {
      setStatus(`Exported ${filePath}`)
    }
  }

  return (
    <main className="app-shell" data-theme={appTheme}>
      <AppHeader
        theme={appTheme}
        canExport={canExport}
        onNewDiagram={createNewDiagram}
        onOpenDiagram={openDiagram}
        onSaveDiagram={saveDiagram}
        onExportSvg={exportSvg}
        onExportPng={exportPng}
        onToggleTheme={() => setAppTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
      />

      <section className="workspace">
        <DiagramSidebar
          title={title}
          diagramType={diagramType}
          direction={direction}
          autoSync={autoSync}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          selectedNodeCount={selectedNodeIds.length}
          selectedEdgeCount={selectedEdgeIds.length}
          onTitleChange={setTitle}
          onDiagramTypeChange={updateDiagramType}
          onDirectionChange={updateDirection}
          onAddNode={addNode}
          onSelectedNodeShapeChange={updateSelectedNodeShape}
          onSelectedNodeStyleChange={updateSelectedNodeStyle}
          onSelectedEdgeLabelChange={updateSelectedEdgeLabel}
          onSelectedEdgeStyleChange={updateSelectedEdgeStyle}
          onSelectedEdgeVisualStyleChange={updateSelectedEdgeVisualStyle}
          onDeleteSelected={deleteSelectedElements}
          onSyncFromVisual={syncFromVisual}
        />

        <FlowCanvas
          nodes={flowNodes}
          edges={flowEdges}
          flowTheme={flowTheme}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
        />

        <section className="right-panel">
          <CodeEditorPanel
            code={code}
            autoSync={autoSync}
            isDarkTheme={isDarkTheme}
            onCodeChange={(nextCode) => {
              setCode(nextCode)
              setAutoSync(false)
            }}
          />

          <PreviewPanel
            code={code}
            status={status}
            theme={appTheme}
            previewRef={previewRef}
            onSvgChange={setRenderedSvg}
            onRenderStateChange={handleRenderStateChange}
          />
        </section>
      </section>
    </main>
  )
}
