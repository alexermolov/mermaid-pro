import type { RefObject } from 'react'
import { MermaidPreview } from './MermaidPreview'
import type { AppTheme } from '../lib/appHelpers'

type PreviewPanelProps = {
  code: string
  status: string
  theme: AppTheme
  previewRef: RefObject<HTMLDivElement>
  onSvgChange: (svg: string) => void
  onRenderStateChange: (status: string) => void
}

export function PreviewPanel({
  code,
  status,
  theme,
  previewRef,
  onSvgChange,
  onRenderStateChange
}: PreviewPanelProps): JSX.Element {
  return (
    <div className="render-panel">
      <div className="panel-heading">
        <h2>Live preview</h2>
        <span>{status}</span>
      </div>
      <MermaidPreview
        code={code}
        containerRef={previewRef}
        theme={theme}
        onSvgChange={onSvgChange}
        onRenderStateChange={onRenderStateChange}
      />
    </div>
  )
}
