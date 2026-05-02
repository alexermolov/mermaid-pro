import { Download, FileCode2, FolderOpen, ImageDown, Moon, Save, Sparkles, Sun } from 'lucide-react'
import type { AppTheme } from '../lib/appHelpers'

type AppHeaderProps = {
  theme: AppTheme
  canExport: boolean
  onNewDiagram: () => void
  onOpenDiagram: () => void
  onSaveDiagram: () => void
  onExportSvg: () => void
  onExportPng: () => void
  onToggleTheme: () => void
}

export function AppHeader({
  theme,
  canExport,
  onNewDiagram,
  onOpenDiagram,
  onSaveDiagram,
  onExportSvg,
  onExportPng,
  onToggleTheme
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
          Save
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
