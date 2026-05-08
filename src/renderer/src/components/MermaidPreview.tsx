import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
  type WheelEvent
} from 'react'
import mermaid from 'mermaid'

type MermaidPreviewProps = {
  code: string
  containerRef: RefObject<HTMLDivElement>
  theme: 'light' | 'dark'
  onSvgChange: (svg: string) => void
  onRenderStateChange: (status: string) => void
  /** Secondary instance (e.g. lightbox): do not clear/update parent export or status bar */
  suppressParentNotify?: boolean
}

const mermaidThemeVariables = {
  light: {
    primaryColor: '#dbeafe',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#2563eb',
    lineColor: '#1e40af',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#eff6ff',
    fontFamily: 'Inter, Segoe UI, sans-serif'
  },
  dark: {
    primaryColor: '#1e3a8a',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#60a5fa',
    lineColor: '#93c5fd',
    secondaryColor: '#0f172a',
    tertiaryColor: '#1e293b',
    background: '#0f172a',
    mainBkg: '#1e293b',
    secondBkg: '#111827',
    tertiaryBkg: '#172554',
    textColor: '#e2e8f0',
    fontFamily: 'Inter, Segoe UI, sans-serif'
  }
} as const

export function MermaidPreview({
  code,
  containerRef,
  theme,
  onSvgChange,
  onRenderStateChange,
  suppressParentNotify = false
}: MermaidPreviewProps): JSX.Element {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const renderId = useMemo(() => `mermaid-${Date.now().toString(36)}`, [code])
  const zoomStep = 0.1
  const minZoom = 0.2
  const maxZoom = 3
  const panStateRef = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  })

  const setSafeZoom = (value: number): void => {
    setZoom(Math.min(maxZoom, Math.max(minZoom, value)))
  }

  const handleWheelZoom = (event: WheelEvent<HTMLDivElement>): void => {
    if (!svg) {
      return
    }
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setSafeZoom(zoom + direction * zoomStep)
  }

  const handlePanStart = (event: MouseEvent<HTMLDivElement>): void => {
    if (!svg || event.button !== 0) {
      return
    }
    const target = event.target as HTMLElement
    if (target.closest('.preview-zoom-controls')) {
      return
    }
    const container = event.currentTarget
    panStateRef.current = {
      isActive: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    }
    setIsPanning(true)
  }

  const handlePanMove = (event: MouseEvent<HTMLDivElement>): void => {
    if (!panStateRef.current.isActive) {
      return
    }
    event.preventDefault()
    const container = event.currentTarget
    const deltaX = event.clientX - panStateRef.current.startX
    const deltaY = event.clientY - panStateRef.current.startY
    container.scrollLeft = panStateRef.current.scrollLeft - deltaX
    container.scrollTop = panStateRef.current.scrollTop - deltaY
  }

  const handlePanEnd = (): void => {
    if (!panStateRef.current.isActive) {
      return
    }
    panStateRef.current.isActive = false
    setIsPanning(false)
  }

  useEffect(() => {
    let cancelled = false

    async function render(): Promise<void> {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: mermaidThemeVariables[theme]
        })
        await mermaid.parse(code)
        const result = await mermaid.render(renderId, code)

        if (!cancelled) {
          setSvg(result.svg)
          setError(null)
          setIsRendering(false)
          if (!suppressParentNotify) {
            onSvgChange(result.svg)
            onRenderStateChange('Preview is up to date')
          }
        }
      } catch (caughtError) {
        if (!cancelled) {
          setSvg('')
          setError(caughtError instanceof Error ? caughtError.message : 'Unable to render diagram')
          setIsRendering(false)
          if (!suppressParentNotify) {
            onSvgChange('')
            onRenderStateChange('Preview has Mermaid errors')
          }
        }
      }
    }

    setSvg('')
    setError(null)
    setIsRendering(true)
    if (!suppressParentNotify) {
      onSvgChange('')
      onRenderStateChange('Rendering preview...')
    }
    const timeoutId = window.setTimeout(() => {
      render()
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [code, onRenderStateChange, onSvgChange, renderId, suppressParentNotify, theme])

  useEffect(() => {
    setZoom(1)
  }, [code, theme])

  return (
    <div
      className={`preview-panel ${svg ? 'preview-panel--pannable' : ''} ${isPanning ? 'preview-panel--panning' : ''}`}
      ref={containerRef}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
    >
      {error ? (
        <div className="preview-error">
          <strong>Mermaid render error</strong>
          <span>{error}</span>
        </div>
      ) : isRendering ? (
        <div className="preview-loading">Rendering diagram...</div>
      ) : (
        <div className="preview-canvas-wrap">
          <div className="preview-zoom-controls" role="group" aria-label="Preview zoom controls">
            <button
              type="button"
              className="panel-heading__icon-action"
              onClick={() => setSafeZoom(zoom - zoomStep)}
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              className="panel-heading__icon-action"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="panel-heading__icon-action"
              onClick={() => setSafeZoom(zoom + zoomStep)}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <div
            className="preview-canvas"
            onWheel={handleWheelZoom}
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          />
        </div>
      )}
    </div>
  )
}
