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
  isCollapsed: boolean
  onTitleChange: (title: string) => void
  onDiagramTypeChange: (diagramType: DiagramType) => void
  onDirectionChange: (direction: DiagramDirection) => void
  onSyncFromVisual: () => void
  onToggleCollapsed: () => void
}

export function DiagramSidebar({
  title,
  diagramType,
  direction,
  autoSync,
  isCollapsed,
  onTitleChange,
  onDiagramTypeChange,
  onDirectionChange,
  onSyncFromVisual,
  onToggleCollapsed
}: DiagramSidebarProps): JSX.Element {
  return (
    <aside className={`left-panel${isCollapsed ? ' left-panel--collapsed' : ''}`} aria-label="Diagram settings">
      <button
        className="sidebar-toggle"
        type="button"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expand left panel' : 'Collapse left panel'}
        title={isCollapsed ? 'Expand left panel' : 'Collapse left panel'}
        onClick={onToggleCollapsed}
      >
        <span className="sidebar-toggle__icon" aria-hidden="true">
          {isCollapsed ? '>' : '<'}
        </span>
        <span className="sidebar-toggle__label">{isCollapsed ? 'Expand' : 'Collapse'}</span>
      </button>

      {!isCollapsed && (
        <>
          <div className="panel-section">
            <label>
              Diagram title
              <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
            </label>
            <div className="control-group">
              <span className="control-label">Diagram type</span>
              <div className="mode-button-group" role="radiogroup" aria-label="Diagram type">
                {diagramTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`mode-button${diagramType === item.value ? ' mode-button--active' : ''}`}
                    role="radio"
                    aria-checked={diagramType === item.value}
                    onClick={() => onDiagramTypeChange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <span className="control-label">Flow direction</span>
              <div className="mode-button-group mode-button-group--compact" role="radiogroup" aria-label="Flow direction">
                {directions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`mode-button${direction === item ? ' mode-button--active' : ''}`}
                    role="radio"
                    aria-checked={direction === item}
                    disabled={diagramType !== 'flowchart'}
                    onClick={() => onDirectionChange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-section hint">
            <h2>Workflow</h2>
            <p>{getWorkflowHint(diagramType)}</p>
            {!autoSync && <p className="warning">Code was edited manually. Use sync to regenerate it from the canvas.</p>}
            <button onClick={onSyncFromVisual}>Sync from visual editor</button>
          </div>
        </>
      )}
    </aside>
  )
}
