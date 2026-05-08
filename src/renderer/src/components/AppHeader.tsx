import {
  ClipboardPaste,
  Download,
  FileCode2,
  FileText,
  FolderOpen,
  ImageDown,
  Moon,
  Redo2,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Undo2
} from 'lucide-react'
import type { AppTheme } from '../lib/appHelpers'
import { ToolbarSplitButton } from './ToolbarSplitButton'

type AppHeaderProps = {
  theme: AppTheme
  canExport: boolean
  canUndo: boolean
  canRedo: boolean
  onNewDiagram: () => void
  onOpenDiagram: () => void
  onPasteDiagram: () => void
  onSaveDiagram: () => void
  onSaveMermaid: () => void
  onAutoLayout: () => void
  onExportSvg: () => void
  onExportPng: () => void
  onToggleTheme: () => void
  onUndo: () => void
  onRedo: () => void
}

export function AppHeader({
  theme,
  canExport,
  canUndo,
  canRedo,
  onNewDiagram,
  onOpenDiagram,
  onPasteDiagram,
  onSaveDiagram,
  onSaveMermaid,
  onAutoLayout,
  onExportSvg,
  onExportPng,
  onToggleTheme,
  onUndo,
  onRedo
}: AppHeaderProps): JSX.Element {
  const isDarkTheme = theme === 'dark'

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={22} />
        </div>
        <div>
          <p>Mermaid Pro</p>
          <span>Visual desktop editor for Mermaid diagrams</span>
        </div>
      </div>

      <div className="toolbar">
        <ToolbarSplitButton
          primaryIcon={<Save size={16} />}
          primaryLabel="Project"
          onPrimaryClick={onSaveDiagram}
          menuLabel="More file actions"
          menuEntries={[
            {
              type: 'item',
              id: 'new',
              label: 'New',
              icon: <FileCode2 size={16} />,
              onSelect: onNewDiagram
            },
            {
              type: 'item',
              id: 'open',
              label: 'Open',
              icon: <FolderOpen size={16} />,
              onSelect: onOpenDiagram
            },
            {
              type: 'item',
              id: 'paste',
              label: 'Paste',
              icon: <ClipboardPaste size={16} />,
              title: 'Paste Mermaid, PlantUML or draw.io source',
              onSelect: onPasteDiagram
            },
            { type: 'separator' },
            {
              type: 'item',
              id: 'mmd',
              label: 'Save Mermaid',
              icon: <FileText size={16} />,
              onSelect: onSaveMermaid
            }
          ]}
        />

        <ToolbarSplitButton
          primaryIcon={<Undo2 size={16} />}
          primaryLabel="Undo"
          primaryTitle="Undo"
          onPrimaryClick={onUndo}
          primaryDisabled={!canUndo}
          menuLabel="History"
          menuEntries={[
            {
              type: 'item',
              id: 'redo',
              label: 'Redo',
              icon: <Redo2 size={16} />,
              title: 'Redo',
              onSelect: onRedo,
              disabled: !canRedo
            }
          ]}
        />

        <button onClick={onAutoLayout} title="Reflow the current diagram on the canvas">
          <SlidersHorizontal size={16} />
          Auto-layout
        </button>

        <ToolbarSplitButton
          primaryIcon={<Download size={16} />}
          primaryLabel="SVG"
          primaryTitle={canExport ? 'Export SVG' : 'Fix Mermaid errors first'}
          onPrimaryClick={onExportSvg}
          primaryDisabled={!canExport}
          menuLabel="Export as"
          menuEntries={[
            {
              type: 'item',
              id: 'png',
              label: 'PNG',
              icon: <ImageDown size={16} />,
              title: canExport ? 'Export PNG' : 'Fix Mermaid errors first',
              onSelect: onExportPng,
              disabled: !canExport
            }
          ]}
        />

        <button onClick={onToggleTheme} title={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}>
          {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkTheme ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}
