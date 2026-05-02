import { Plus, Trash2 } from 'lucide-react'
import type { DiagramDirection, DiagramType } from '../../../shared/diagram'
import {
  diagramTypes,
  directions,
  flowchartEdgeStyles,
  flowchartNodeShapes,
  getAddNodeLabel,
  getEdgePlaceholder,
  getWorkflowHint
} from '../lib/appHelpers'
import type {
  FlowchartEdgeStyle,
  FlowchartEdgeVisualStyle,
  FlowchartNodeShape,
  FlowchartNodeStyle,
  VisualEdge,
  VisualNode
} from '../lib/mermaid'

type DiagramSidebarProps = {
  title: string
  diagramType: DiagramType
  direction: DiagramDirection
  autoSync: boolean
  selectedNode: VisualNode | null
  selectedEdge: VisualEdge | null
  selectedNodeCount: number
  selectedEdgeCount: number
  onTitleChange: (title: string) => void
  onDiagramTypeChange: (diagramType: DiagramType) => void
  onDirectionChange: (direction: DiagramDirection) => void
  onAddNode: () => void
  onSelectedNodeShapeChange: (shape: FlowchartNodeShape) => void
  onSelectedNodeStyleChange: (style: Partial<FlowchartNodeStyle>) => void
  onSelectedEdgeLabelChange: (label: string) => void
  onSelectedEdgeStyleChange: (lineStyle: FlowchartEdgeStyle) => void
  onSelectedEdgeVisualStyleChange: (visualStyle: Partial<FlowchartEdgeVisualStyle>) => void
  onDeleteSelected: () => void
  onSyncFromVisual: () => void
}

export function DiagramSidebar({
  title,
  diagramType,
  direction,
  autoSync,
  selectedNode,
  selectedEdge,
  selectedNodeCount,
  selectedEdgeCount,
  onTitleChange,
  onDiagramTypeChange,
  onDirectionChange,
  onAddNode,
  onSelectedNodeShapeChange,
  onSelectedNodeStyleChange,
  onSelectedEdgeLabelChange,
  onSelectedEdgeStyleChange,
  onSelectedEdgeVisualStyleChange,
  onDeleteSelected,
  onSyncFromVisual
}: DiagramSidebarProps): JSX.Element {
  const hasSelection = selectedNodeCount > 0 || selectedEdgeCount > 0
  const canEditFlowchartNode = diagramType === 'flowchart' && selectedNodeCount === 1 && Boolean(selectedNode)
  const canEditFlowchartEdge = diagramType === 'flowchart' && selectedEdgeCount === 1 && Boolean(selectedEdge)
  const nodeStyle = selectedNode?.data.style
  const edgeVisualStyle = selectedEdge?.data?.visualStyle

  return (
    <aside className="left-panel">
      <div className="panel-section">
        <label>
          Diagram title
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label>
          Diagram type
          <select value={diagramType} onChange={(event) => onDiagramTypeChange(event.target.value as DiagramType)}>
            {diagramTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Flow direction
          <select
            value={direction}
            disabled={diagramType !== 'flowchart'}
            onChange={(event) => onDirectionChange(event.target.value as DiagramDirection)}
          >
            {directions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-action" onClick={onAddNode}>
          <Plus size={16} />
          {getAddNodeLabel(diagramType)}
        </button>
      </div>

      <div className="panel-section">
        <h2>Selected node</h2>
        <label>
          Shape
          <select
            disabled={!canEditFlowchartNode}
            value={selectedNode?.data.shape ?? 'rectangle'}
            onChange={(event) => onSelectedNodeShapeChange(event.target.value as FlowchartNodeShape)}
          >
            {flowchartNodeShapes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fill color
          <input
            type="color"
            disabled={!canEditFlowchartNode}
            value={nodeStyle?.fillColor ?? '#1e293b'}
            onChange={(event) => onSelectedNodeStyleChange({ fillColor: event.target.value })}
          />
        </label>
        <label>
          Border color
          <input
            type="color"
            disabled={!canEditFlowchartNode}
            value={nodeStyle?.strokeColor ?? '#60a5fa'}
            onChange={(event) => onSelectedNodeStyleChange({ strokeColor: event.target.value })}
          />
        </label>
        <label>
          Text color
          <input
            type="color"
            disabled={!canEditFlowchartNode}
            value={nodeStyle?.textColor ?? '#f8fafc'}
            onChange={(event) => onSelectedNodeStyleChange({ textColor: event.target.value })}
          />
        </label>
      </div>

      <div className="panel-section">
        <h2>Selected edge</h2>
        <input
          disabled={!selectedEdge}
          value={String(selectedEdge?.label ?? '')}
          onChange={(event) => onSelectedEdgeLabelChange(event.target.value)}
          placeholder={getEdgePlaceholder(diagramType)}
        />
        <label>
          Line style
          <select
            disabled={!canEditFlowchartEdge}
            value={selectedEdge?.data?.lineStyle ?? 'arrow'}
            onChange={(event) => onSelectedEdgeStyleChange(event.target.value as FlowchartEdgeStyle)}
          >
            {flowchartEdgeStyles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Line color
          <input
            type="color"
            disabled={!canEditFlowchartEdge}
            value={edgeVisualStyle?.strokeColor ?? '#60a5fa'}
            onChange={(event) => onSelectedEdgeVisualStyleChange({ strokeColor: event.target.value })}
          />
        </label>
        <label>
          Line width
          <input
            type="number"
            min={1}
            max={12}
            disabled={!canEditFlowchartEdge}
            value={edgeVisualStyle?.strokeWidth ?? 3}
            onChange={(event) => onSelectedEdgeVisualStyleChange({ strokeWidth: Number(event.target.value) })}
          />
        </label>
        <button onClick={onDeleteSelected} disabled={!hasSelection} title="Select nodes or edges on the canvas, then delete them">
          <Trash2 size={16} />
          Delete selected
        </button>
      </div>

      <div className="panel-section hint">
        <h2>Workflow</h2>
        <p>{getWorkflowHint(diagramType)}</p>
        {!autoSync && <p className="warning">Code was edited manually. Use sync to regenerate it from the canvas.</p>}
        <button onClick={onSyncFromVisual}>Sync from visual editor</button>
      </div>
    </aside>
  )
}
