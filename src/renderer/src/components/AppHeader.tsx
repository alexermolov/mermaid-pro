import {
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

type AppHeaderProps = {
  theme: AppTheme
  canExport: boolean
  canUndo: boolean
  canRedo: boolean
  onNewDiagram: () => void
  onOpenDiagram: () => void
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
        <button onClick={onNewDiagram}>
          <FileCode2 size={16} />
          New
        </button>
        <button onClick={onOpenDiagram}>
          <FolderOpen size={16} />
          Open
        </button>
        <button onClick={onSaveDiagram}>
          <Save size={16} />
          Project
        </button>
        <button onClick={onSaveMermaid}>
          <FileText size={16} />
          MMD
        </button>
        <button onClick={onAutoLayout} title="Reflow the current diagram on the canvas">
          <SlidersHorizontal size={16} />
          Auto-layout
        </button>
        <button onClick={onUndo} disabled={!canUndo} title="Undo">
          <Undo2 size={16} />
          Undo
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo">
          <Redo2 size={16} />
          Redo
        </button>
        <button onClick={onExportSvg} disabled={!canExport} title={canExport ? 'Export SVG' : 'Fix Mermaid errors first'}>
          <Download size={16} />
          SVG
        </button>
        <button onClick={onExportPng} disabled={!canExport} title={canExport ? 'Export PNG' : 'Fix Mermaid errors first'}>
          <ImageDown size={16} />
          PNG
        </button>
        <button onClick={onToggleTheme} title={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}>
          {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkTheme ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}
