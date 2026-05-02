import type { DiagramDirection, DiagramType } from '../../../shared/diagram'
import {
  diagramTypes,
  directions,
  getWorkflowHint
} from '../lib/appHelpers'

type DiagramSidebarProps = {
  title: string
  diagramType: DiagramType
  direction: DiagramDirection
  autoSync: boolean
  onTitleChange: (title: string) => void
  onDiagramTypeChange: (diagramType: DiagramType) => void
  onDirectionChange: (direction: DiagramDirection) => void
  onSyncFromVisual: () => void
}

export function DiagramSidebar({
  title,
  diagramType,
  direction,
  autoSync,
  onTitleChange,
  onDiagramTypeChange,
  onDirectionChange,
  onSyncFromVisual
}: DiagramSidebarProps): JSX.Element {
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
