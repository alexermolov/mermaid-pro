import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import type { AppTheme, DiagramDirection, DiagramDocument, DiagramType, ProjectDiagram } from '../../shared/diagram'
import { AppHeader } from './components/AppHeader'
import { CodeEditorPanel } from './components/CodeEditorPanel'
import { DiagramSidebar } from './components/DiagramSidebar'
import { DiagramToolPalette } from './components/DiagramToolPalette'
import type { EditableEdgeData } from './components/EditableEdge'
import { FlowCanvas } from './components/FlowCanvas'
import { PreviewPanel } from './components/PreviewPanel'
import {
  isTextInputTarget,
  toFileBaseName
} from './lib/appHelpers'
import { importDrawioDiagram, isDrawioDiagram } from './lib/drawioImport'
import {
  autoLayoutNodes,
  defaultDiagram,
  nextNodeId,
  parseMermaid,
  toMermaid,
  type EditableVisualNodeData,
  type ErCardinality,
  type ErRelationshipLineStyle,
  type FlowchartEdgeVisualStyle,
  type FlowchartEdgeStyle,
  type FlowchartNodeShape,
  type FlowchartNodeStyle,
  type VisualEdge,
  type VisualNode
} from './lib/mermaid'

type DiagramSnapshot = {
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

const historyLimit = 80
const rightPanelMinWidth = 420
const rightPanelDefaultWidth = 520
const canvasMinWidth = 440
const workspacePadding = 14
const workspaceGap = 14
const workspaceResizeHandleWidth = 8
const sidebarExpandedWidth = 280
const sidebarCollapsedWidth = 24
const initialDiagramId = 'diagram-1'
const initialDiagramSnapshot = createDefaultDiagramSnapshot(initialDiagramId)

export default function App(): JSX.Element {
  const [diagrams, setDiagrams] = useState<DiagramSnapshot[]>([initialDiagramSnapshot])
  const [selectedDiagramId, setSelectedDiagramId] = useState(initialDiagramId)
  const [title, setTitle] = useState(initialDiagramSnapshot.title)
  const [diagramType, setDiagramType] = useState<DiagramType>(initialDiagramSnapshot.diagramType)
  const [direction, setDirection] = useState<DiagramDirection>(initialDiagramSnapshot.direction)
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<VisualNode>(initialDiagramSnapshot.nodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<VisualEdge>(initialDiagramSnapshot.edges)
  const [code, setCode] = useState(initialDiagramSnapshot.code)
  const [autoSync, setAutoSync] = useState(true)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [renderedSvg, setRenderedSvg] = useState('')
  const [status, setStatus] = useState('Ready')
  const [appTheme, setAppTheme] = useState<AppTheme>('dark')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(rightPanelDefaultWidth)
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false)
  const [fitViewToken, setFitViewToken] = useState(0)
  const [undoStack, setUndoStack] = useState<DiagramSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<DiagramSnapshot[]>([])
  const workspaceRef = useRef<HTMLElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const lastCommittedSnapshotRef = useRef<DiagramSnapshot | null>(null)
  const lastCommittedHistoryKeyRef = useRef('')
  const isRestoringHistoryRef = useRef(false)
  const hasLoadedLastProjectRef = useRef(false)
  const canExport = Boolean(renderedSvg)
  const isDarkTheme = appTheme === 'dark'
  const workspaceStyle = {
    '--right-panel-width': `${rightPanelWidth}px`
  } as CSSProperties

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

  const updateNodeData = useCallback(
    (id: string, data: Partial<EditableVisualNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node))
      )
      setAutoSync(true)
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

  const updateEdgeErRelationship = useCallback(
    (
      id: string,
      relationship: Partial<{
        erSourceCardinality: ErCardinality
        erTargetCardinality: ErCardinality
        erRelationshipLineStyle: ErRelationshipLineStyle
      }>
    ) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...(edge.data ?? {}),
                  ...relationship
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
          diagramType,
          direction,
          onLabelChange: updateNodeLabel,
          onDataChange: updateNodeData
        }
      })),
    [diagramType, direction, nodes, updateNodeData, updateNodeLabel]
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
  const effectiveCode = autoSync ? generatedCode : code

  const currentSnapshot = useMemo<DiagramSnapshot>(
    () => ({
      id: selectedDiagramId,
      title,
      diagramType,
      direction,
      nodes: toSerializableNodes(nodes),
      edges: toSerializableEdges(edges),
      code: effectiveCode,
      autoSync,
      appTheme
    }),
    [appTheme, autoSync, diagramType, direction, effectiveCode, edges, nodes, selectedDiagramId, title]
  )
  const projectDiagrams = useMemo(
    () => diagrams.map((diagram) => (diagram.id === selectedDiagramId ? currentSnapshot : diagram)),
    [currentSnapshot, diagrams, selectedDiagramId]
  )

  useEffect(() => {
    if (autoSync) {
      setCode(generatedCode)
    }
  }, [autoSync, generatedCode])

  useEffect(() => {
    const snapshot = cloneSnapshot(currentSnapshot)
    const snapshotKey = getSnapshotKey(snapshot)

    setDiagrams((currentDiagrams) => {
      const existingDiagram = currentDiagrams.find((diagram) => diagram.id === snapshot.id)

      if (existingDiagram && getSnapshotKey(existingDiagram) === snapshotKey) {
        return currentDiagrams
      }

      if (!existingDiagram) {
        return [...currentDiagrams, snapshot]
      }

      return currentDiagrams.map((diagram) => (diagram.id === snapshot.id ? snapshot : diagram))
    })
  }, [currentSnapshot])

  useEffect(() => {
    const snapshot = cloneSnapshot(currentSnapshot)
    const historyKey = getSnapshotKey(snapshot)

    if (!lastCommittedSnapshotRef.current) {
      lastCommittedSnapshotRef.current = snapshot
      lastCommittedHistoryKeyRef.current = historyKey
      return
    }

    if (historyKey === lastCommittedHistoryKeyRef.current) {
      return
    }

    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false
      lastCommittedSnapshotRef.current = snapshot
      lastCommittedHistoryKeyRef.current = historyKey
      return
    }

    const previousSnapshot = cloneSnapshot(lastCommittedSnapshotRef.current)
    setUndoStack((currentStack) => [...currentStack, previousSnapshot].slice(-historyLimit))
    setRedoStack([])
    lastCommittedSnapshotRef.current = snapshot
    lastCommittedHistoryKeyRef.current = historyKey
  }, [currentSnapshot])

  const applySnapshot = useCallback(
    (snapshot: DiagramSnapshot) => {
      isRestoringHistoryRef.current = true
      setSelectedDiagramId(snapshot.id)
      setTitle(snapshot.title)
      setDiagramType(snapshot.diagramType)
      setDirection(snapshot.direction)
      setNodes(cloneSerializable(snapshot.nodes))
      setEdges(cloneSerializable(snapshot.edges))
      setCode(snapshot.code)
      setAutoSync(snapshot.autoSync)
      setAppTheme(snapshot.appTheme)
      setSelectedNodeIds([])
      setSelectedEdgeIds([])
      setSelectedEdgeId(null)
    },
    [setEdges, setNodes]
  )

  const resetHistory = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
    lastCommittedSnapshotRef.current = null
    lastCommittedHistoryKeyRef.current = ''
    isRestoringHistoryRef.current = true
  }, [])

  useEffect(() => {
    if (hasLoadedLastProjectRef.current) {
      return undefined
    }

    hasLoadedLastProjectRef.current = true

    async function loadLastProject(): Promise<void> {
      const result = await window.mermaidPro.loadLastProject()

      if (result.canceled || !result.content || !result.filePath) {
        return
      }

      const projectDocument = isProjectFile(result.filePath) ? parseProjectDocument(result.content) : undefined

      if (!projectDocument) {
        setStatus('Unable to open last Mermaid Pro project')
        return
      }

      const projectSnapshots = toSnapshotsFromDocument(projectDocument)
      const selectedSnapshot =
        projectSnapshots.find((snapshot) => snapshot.id === projectDocument.selectedDiagramId) ?? projectSnapshots[0]

      resetHistory()
      setDiagrams(projectSnapshots)
      applySnapshot(selectedSnapshot)
      setRenderedSvg('')
      setStatus(`Opened last project ${result.filePath}`)
    }

    void loadLastProject()
  }, [applySnapshot, resetHistory])

  const undo = useCallback(() => {
    setUndoStack((currentUndoStack) => {
      const previousSnapshot = currentUndoStack.at(-1)
      if (!previousSnapshot) {
        return currentUndoStack
      }

      const currentHistorySnapshot = lastCommittedSnapshotRef.current
        ? cloneSnapshot(lastCommittedSnapshotRef.current)
        : cloneSnapshot(currentSnapshot)
      setRedoStack((currentRedoStack) => [currentHistorySnapshot, ...currentRedoStack].slice(0, historyLimit))
      applySnapshot(previousSnapshot)
      setStatus('Undo')
      return currentUndoStack.slice(0, -1)
    })
  }, [applySnapshot, currentSnapshot])

  const redo = useCallback(() => {
    setRedoStack((currentRedoStack) => {
      const nextSnapshot = currentRedoStack[0]
      if (!nextSnapshot) {
        return currentRedoStack
      }

      const currentHistorySnapshot = lastCommittedSnapshotRef.current
        ? cloneSnapshot(lastCommittedSnapshotRef.current)
        : cloneSnapshot(currentSnapshot)
      setUndoStack((currentUndoStack) => [...currentUndoStack, currentHistorySnapshot].slice(-historyLimit))
      applySnapshot(nextSnapshot)
      setStatus('Redo')
      return currentRedoStack.slice(1)
    })
  }, [applySnapshot, currentSnapshot])

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

  const duplicateSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) {
      return
    }

    const selectedNodeIdSet = new Set(selectedNodeIds)
    const copySuffix = Date.now().toString(36)
    const nodeIdMap = new Map<string, string>()
    const duplicatedNodes = nodes
      .filter((node) => selectedNodeIdSet.has(node.id))
      .map((node, index): VisualNode => {
        const id = `${node.id}_copy_${copySuffix}_${index + 1}`
        nodeIdMap.set(node.id, id)

        return {
          ...node,
          id,
          selected: true,
          position: {
            x: node.position.x + 48,
            y: node.position.y + 48
          },
          data: {
            ...node.data,
            label: `${node.data.label || node.id} copy`
          }
        }
      })

    if (duplicatedNodes.length === 0) {
      return
    }

    const duplicatedEdges = edges
      .filter((edge) => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target))
      .map((edge, index): VisualEdge => ({
        ...edge,
        id: `${edge.id}_copy_${copySuffix}_${index + 1}`,
        source: nodeIdMap.get(edge.source) ?? edge.source,
        target: nodeIdMap.get(edge.target) ?? edge.target,
        selected: false
      }))

    const duplicatedNodeIds = duplicatedNodes.map((node) => node.id)
    setNodes((currentNodes) => [
      ...currentNodes.map((node) => ({ ...node, selected: false })),
      ...duplicatedNodes
    ])
    setEdges((currentEdges) => [
      ...currentEdges.map((edge) => ({ ...edge, selected: false })),
      ...duplicatedEdges
    ])
    setSelectedNodeIds(duplicatedNodeIds)
    setSelectedEdgeIds([])
    setSelectedEdgeId(null)
    setAutoSync(true)
    setStatus(`Duplicated ${duplicatedNodes.length} selected node${duplicatedNodes.length === 1 ? '' : 's'}`)
  }, [edges, nodes, selectedNodeIds, setEdges, setNodes])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isTextInputTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()
      const isShortcut = event.ctrlKey || event.metaKey
      const isUndoShortcut = isShortcut && key === 'z' && !event.shiftKey
      const isRedoShortcut = isShortcut && (key === 'y' || (key === 'z' && event.shiftKey))

      if (isUndoShortcut) {
        event.preventDefault()
        undo()
        return
      }

      if (isRedoShortcut) {
        event.preventDefault()
        redo()
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') {
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
  }, [deleteSelectedElements, redo, selectedEdgeIds.length, selectedNodeIds.length, undo])

  useEffect(() => {
    if (!isResizingRightPanel) {
      return undefined
    }

    function handlePointerMove(event: PointerEvent): void {
      const workspace = workspaceRef.current

      if (!workspace) {
        return
      }

      const workspaceRect = workspace.getBoundingClientRect()
      const sidebarWidth = isSidebarCollapsed ? sidebarCollapsedWidth : sidebarExpandedWidth
      const contentWidth = workspaceRect.width - workspacePadding * 2
      const maxRightPanelWidth =
        contentWidth - sidebarWidth - canvasMinWidth - workspaceResizeHandleWidth - workspaceGap * 3
      const nextRightPanelWidth = workspaceRect.right - workspacePadding - event.clientX

      setRightPanelWidth(clamp(nextRightPanelWidth, rightPanelMinWidth, maxRightPanelWidth))
    }

    function stopResizing(): void {
      setIsResizingRightPanel(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
    }
  }, [isResizingRightPanel, isSidebarCollapsed])

  function addNode(): void {
    const id = nextNodeId(nodes)
    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        type: 'editableNode',
        position: { x: 120 + currentNodes.length * 40, y: 220 + currentNodes.length * 24 },
        data: createNodeData(diagramType, currentNodes.length + 1)
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

  function updateSelectedEdgeErRelationship(
    relationship: Partial<{
      erSourceCardinality: ErCardinality
      erTargetCardinality: ErCardinality
      erRelationshipLineStyle: ErRelationshipLineStyle
    }>
  ): void {
    if (!selectedEdgeId) {
      return
    }

    updateEdgeErRelationship(selectedEdgeId, relationship)
  }

  function updateDiagramType(nextDiagramType: DiagramType): void {
    setDiagramType(nextDiagramType)
    setAutoSync(true)
  }

  function applyAutoLayout(nextDirection = direction): void {
    setNodes(autoLayoutNodes(nodes, edges, nextDirection))
    setAutoSync(true)
  }

  function requestFitView(): void {
    setFitViewToken((currentToken) => currentToken + 1)
  }

  function updateDirection(nextDirection: DiagramDirection): void {
    setDirection(nextDirection)
    applyAutoLayout(nextDirection)
    requestFitView()
    setStatus(`Flow direction changed to ${nextDirection}`)
  }

  function autoLayoutDiagram(): void {
    applyAutoLayout(direction)
    requestFitView()
    setStatus('Canvas auto-layout applied')
  }

  function syncFromVisual(): void {
    setCode(generatedCode)
    setAutoSync(true)
    setStatus('Mermaid code regenerated from canvas')
  }

  function syncFromCode(): void {
    try {
      const parsedDiagram = parseMermaid(code)
      setDiagramType(parsedDiagram.diagramType)
      setDirection(parsedDiagram.direction)
      setNodes(parsedDiagram.nodes)
      setEdges(parsedDiagram.edges)
      setSelectedNodeIds([])
      setSelectedEdgeIds([])
      setSelectedEdgeId(null)
      setAutoSync(true)
      requestFitView()
      setStatus('Visual diagram updated from Mermaid code')
    } catch (error) {
      setStatus(error instanceof Error ? `Sync failed: ${error.message}` : 'Sync failed')
    }
  }

  const handleRenderStateChange = useCallback((nextStatus: string) => {
    setStatus(nextStatus)
  }, [])

  function addProjectDiagram(): void {
    const nextSnapshot = createDefaultDiagramSnapshot(createDiagramId(), appTheme)
    const untitledCount = projectDiagrams.filter((diagram) => diagram.title.startsWith(defaultDiagram.title)).length
    nextSnapshot.title = `${defaultDiagram.title} ${untitledCount + 1}`

    const currentDiagramSnapshot = cloneSnapshot(currentSnapshot)
    setDiagrams((currentDiagrams) => {
      const hasCurrentDiagram = currentDiagrams.some((diagram) => diagram.id === currentDiagramSnapshot.id)
      const savedDiagrams = hasCurrentDiagram
        ? currentDiagrams.map((diagram) => (diagram.id === currentDiagramSnapshot.id ? currentDiagramSnapshot : diagram))
        : [...currentDiagrams, currentDiagramSnapshot]

      return [...savedDiagrams, nextSnapshot]
    })
    resetHistory()
    applySnapshot(nextSnapshot)
    setRenderedSvg('')
    setStatus('New diagram added to project')
  }

  function selectProjectDiagram(diagramId: string): void {
    if (diagramId === selectedDiagramId) {
      return
    }

    const nextDiagram = projectDiagrams.find((diagram) => diagram.id === diagramId)

    if (!nextDiagram) {
      return
    }

    resetHistory()
    applySnapshot(nextDiagram)
    setRenderedSvg('')
    setStatus(`Selected ${nextDiagram.title}`)
  }

  function createNewDiagram(): void {
    const nextSnapshot = createDefaultDiagramSnapshot(initialDiagramId, appTheme)
    setDiagrams([nextSnapshot])
    resetHistory()
    applySnapshot(nextSnapshot)
    setRenderedSvg('')
    setStatus('New project created')
  }

  async function openDiagram(): Promise<void> {
    const result = await window.mermaidPro.openDiagram()

    if (result.canceled || !result.content) {
      return
    }

    const fileName = result.filePath?.split(/[\\/]/).pop() ?? 'Imported Diagram'
    const projectDocument =
      result.filePath && isProjectFile(result.filePath) ? parseProjectDocument(result.content) : undefined

    if (result.filePath && isProjectFile(result.filePath)) {
      if (!projectDocument) {
        setStatus('Unable to open Mermaid Pro project')
        return
      }

      const projectSnapshots = toSnapshotsFromDocument(projectDocument)
      const selectedSnapshot =
        projectSnapshots.find((snapshot) => snapshot.id === projectDocument.selectedDiagramId) ?? projectSnapshots[0]

      resetHistory()
      setDiagrams(projectSnapshots)
      applySnapshot(selectedSnapshot)
      setStatus(`Opened ${result.filePath}`)
      return
    }

    const drawioImport = isDrawioDiagram(result.content) ? importDrawioDiagram(result.content) : undefined

    setTitle(fileName)

    if (drawioImport) {
      const importedCode = toMermaid(drawioImport.nodes, drawioImport.edges, 'LR', 'flowchart')
      const importedSnapshot = {
        id: createDiagramId(),
        title: fileName,
        diagramType: 'flowchart' as const,
        direction: 'LR' as const,
        nodes: drawioImport.nodes,
        edges: drawioImport.edges,
        code: importedCode,
        autoSync: true,
        appTheme
      }

      resetHistory()
      setDiagrams([importedSnapshot])
      applySnapshot(importedSnapshot)
      setSelectedNodeIds([])
      setSelectedEdgeIds([])
      setSelectedEdgeId(null)
      setStatus(`Imported draw.io diagram from ${result.filePath}`)
      return
    }

    const importedMermaidSnapshot = (() => {
      try {
        const parsedDiagram = parseMermaid(result.content)

        return {
          id: createDiagramId(),
          title: fileName,
          diagramType: parsedDiagram.diagramType,
          direction: parsedDiagram.direction,
          nodes: parsedDiagram.nodes,
          edges: parsedDiagram.edges,
          code: result.content,
          autoSync: false,
          appTheme
        }
      } catch {
        return undefined
      }
    })()

    if (importedMermaidSnapshot) {
      resetHistory()
      setDiagrams([importedMermaidSnapshot])
      applySnapshot(importedMermaidSnapshot)
      requestFitView()
      setStatus(`Opened ${result.filePath}`)
      return
    }

    resetHistory()
    const importedSnapshot = {
      ...createDefaultDiagramSnapshot(createDiagramId(), appTheme),
      title: fileName,
      code: result.content,
      autoSync: false
    }
    setDiagrams([importedSnapshot])
    applySnapshot(importedSnapshot)
    setStatus(`Opened ${result.filePath}`)
  }

  async function saveDiagram(): Promise<void> {
    const document = toProjectDocument(projectDiagrams, selectedDiagramId, appTheme)
    const filePath = await window.mermaidPro.saveDiagram({
      content: JSON.stringify(document, null, 2),
      defaultPath: `${toFileBaseName(title)}.mpro`,
      format: 'project'
    })

    if (filePath) {
      setStatus(`Saved ${filePath}`)
    }
  }

  async function saveMermaid(): Promise<void> {
    const filePath = await window.mermaidPro.saveDiagram({
      content: effectiveCode,
      defaultPath: `${toFileBaseName(title)}.mmd`,
      format: 'mermaid'
    })

    if (filePath) {
      setStatus(`Saved Mermaid ${filePath}`)
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
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onNewDiagram={createNewDiagram}
        onOpenDiagram={openDiagram}
        onSaveDiagram={saveDiagram}
        onSaveMermaid={saveMermaid}
        onAutoLayout={autoLayoutDiagram}
        onExportSvg={exportSvg}
        onExportPng={exportPng}
        onToggleTheme={() => setAppTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
        onUndo={undo}
        onRedo={redo}
      />

      <section
        ref={workspaceRef}
        className={`workspace${isSidebarCollapsed ? ' workspace--sidebar-collapsed' : ''}${
          isResizingRightPanel ? ' workspace--resizing-right-panel' : ''
        }`}
        style={workspaceStyle}
      >
        <DiagramSidebar
          diagrams={projectDiagrams.map((diagram) => ({
            id: diagram.id,
            title: diagram.title,
            diagramType: diagram.diagramType
          }))}
          selectedDiagramId={selectedDiagramId}
          title={title}
          diagramType={diagramType}
          direction={direction}
          autoSync={autoSync}
          isCollapsed={isSidebarCollapsed}
          onAddDiagram={addProjectDiagram}
          onSelectDiagram={selectProjectDiagram}
          onTitleChange={setTitle}
          onDiagramTypeChange={updateDiagramType}
          onDirectionChange={updateDirection}
          onSyncFromVisual={syncFromVisual}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
        />

        <FlowCanvas
          nodes={flowNodes}
          edges={flowEdges}
          flowTheme={flowTheme}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          fitViewToken={fitViewToken}
        >
          <DiagramToolPalette
            diagramType={diagramType}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            selectedNodeCount={selectedNodeIds.length}
            selectedEdgeCount={selectedEdgeIds.length}
            onAddNode={addNode}
            onDuplicateSelected={duplicateSelectedNodes}
            onSelectedNodeShapeChange={updateSelectedNodeShape}
            onSelectedNodeStyleChange={updateSelectedNodeStyle}
            onSelectedEdgeLabelChange={updateSelectedEdgeLabel}
            onSelectedEdgeStyleChange={updateSelectedEdgeStyle}
            onSelectedEdgeVisualStyleChange={updateSelectedEdgeVisualStyle}
            onSelectedEdgeErRelationshipChange={updateSelectedEdgeErRelationship}
            onDeleteSelected={deleteSelectedElements}
          />
        </FlowCanvas>

        <div
          className="workspace-resizer"
          role="separator"
          aria-label="Resize right panels"
          aria-orientation="vertical"
          onPointerDown={(event) => {
            event.preventDefault()
            setIsResizingRightPanel(true)
          }}
        />

        <section className="right-panel">
          <CodeEditorPanel
            code={code}
            autoSync={autoSync}
            isDarkTheme={isDarkTheme}
            onSyncFromCode={syncFromCode}
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

function toProjectDocument(diagrams: DiagramSnapshot[], selectedDiagramId: string, appTheme: AppTheme): DiagramDocument {
  return {
    format: 'mermaid-pro',
    version: 2,
    title: diagrams.find((diagram) => diagram.id === selectedDiagramId)?.title ?? defaultDiagram.title,
    selectedDiagramId,
    diagrams: diagrams.map(toProjectDiagram),
    theme: appTheme
  }
}

function toProjectDiagram(snapshot: DiagramSnapshot): ProjectDiagram {
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

function toSnapshotsFromDocument(document: DiagramDocument): DiagramSnapshot[] {
  if (document.diagrams?.length) {
    return document.diagrams.map((diagram, index) => toSnapshotFromProjectDiagram(diagram, document.theme, index))
  }

  return [toSnapshotFromLegacyDocument(document)]
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

function parseProjectDocument(content: string): DiagramDocument | undefined {
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
            code: typeof diagram.code === 'string' ? diagram.code : toMermaid(nodes as VisualNode[], edges as VisualEdge[], direction, diagramType),
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

function isProjectFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.mpro')
}

function toSerializableNodes(nodes: VisualNode[]): VisualNode[] {
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

function toSerializableEdges(edges: VisualEdge[]): VisualEdge[] {
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

function createDefaultDiagramSnapshot(id: string, appTheme: AppTheme = 'dark'): DiagramSnapshot {
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

function createDiagramId(): string {
  return `diagram-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneSnapshot(snapshot: DiagramSnapshot): DiagramSnapshot {
  return cloneSerializable(snapshot)
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function createNodeData(diagramType: DiagramType, index: number): EditableVisualNodeData {
  switch (diagramType) {
    case 'class':
      return {
        label: `Class${index}`,
        classAttributes: '+String name',
        classMethods: '+method()'
      }
    case 'state':
      return {
        label: `State ${index}`,
        stateDescription: 'entry action'
      }
    case 'er':
      return {
        label: `Entity ${index}`,
        erAttributes: 'string name'
      }
    case 'sequence':
      return { label: `Participant ${index}` }
    case 'mindmap':
      return { label: `Topic ${index}` }
    case 'flowchart':
      return { label: `Node ${index}` }
  }
}

function getSnapshotKey(snapshot: DiagramSnapshot): string {
  return JSON.stringify(snapshot)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDiagramType(value: unknown): value is DiagramType {
  return value === 'flowchart' || value === 'sequence' || value === 'class' || value === 'state' || value === 'er' || value === 'mindmap'
}

function isDiagramDirection(value: unknown): value is DiagramDirection {
  return value === 'TD' || value === 'LR' || value === 'BT' || value === 'RL'
}
