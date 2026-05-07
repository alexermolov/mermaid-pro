import { Search } from 'lucide-react'
import { useRef, useState, type RefObject } from 'react'
import type { AppTheme } from '../lib/appHelpers'
import { LightboxModal } from './LightboxModal'
import { MermaidPreview } from './MermaidPreview'

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
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false)
  const lightboxPreviewRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <div className="render-panel">
        <div className="panel-heading">
          <div className="panel-heading__title">
            <h2>Live preview</h2>
            <span>{status}</span>
          </div>
          <div className="panel-heading__actions">
            <button
              type="button"
              className="panel-heading__icon-action"
              aria-label="Open enlarged diagram preview"
              onClick={() => setPreviewLightboxOpen(true)}
            >
              <Search size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
        <MermaidPreview
          code={code}
          containerRef={previewRef}
          theme={theme}
          onSvgChange={onSvgChange}
          onRenderStateChange={onRenderStateChange}
        />
      </div>
      <LightboxModal
        title="Live preview — enlarged"
        open={previewLightboxOpen}
        onClose={() => setPreviewLightboxOpen(false)}
        bodyClassName="lightbox-modal__body--preview"
      >
        <div className="lightbox-modal__preview-host">
          <MermaidPreview
            code={code}
            containerRef={lightboxPreviewRef}
            theme={theme}
            suppressParentNotify
            onSvgChange={() => {}}
            onRenderStateChange={() => {}}
          />
        </div>
      </LightboxModal>
    </>
  )
}
