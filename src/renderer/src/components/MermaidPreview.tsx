import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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

type SvgDimensions = {
  width: number
  height: number
}

const zoomStep = 0.1
const minZoom = 0.2
const maxZoom = 3

const mermaidThemeVariables = {
  light: {
    primaryColor: '#dbeafe',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#2563eb',
    lineColor: '#1e40af',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#eff6ff',
    background: '#ffffff',
    mainBkg: '#ffffff',
    secondBkg: '#f8fafc',
    tertiaryBkg: '#eff6ff',
    textColor: '#0f172a',
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

function clampZoom(value: number): number {
  return Math.min(maxZoom, Math.max(minZoom, value))
}

function parseSvgLength(value: string | null): number | null {
  if (!value) {
    return null
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function getSvgDimensions(svgMarkup: string): SvgDimensions | null {
  const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svgElement = parsed.querySelector('svg')

  if (!svgElement) {
    return null
  }

  const viewBox = svgElement.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return {
        width: parts[2],
        height: parts[3]
      }
    }
  }

  const width = parseSvgLength(svgElement.getAttribute('width'))
  const height = parseSvgLength(svgElement.getAttribute('height'))

  return width && height ? { width, height } : null
}

export function MermaidPreview({
  code,
  containerRef,
  theme,
  onSvgChange,
  onRenderStateChange,
  suppressParentNotify = false
}: MermaidPreviewProps): JSX.Element {
  const [svg, setSvg] = useState('')
  const [svgDimensions, setSvgDimensions] = useState<SvgDimensions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const renderId = useMemo(() => `mermaid-${Date.now().toString(36)}`, [code])
  const panStateRef = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  })

  const setSafeZoom = (value: number): void => {
    setZoom(clampZoom(value))
  }

  const handleWheelZoom = (event: WheelEvent<HTMLDivElement>): void => {
    if (!svg) {
      return
    }

    event.preventDefault()

    const container = event.currentTarget
    const rect = container.getBoundingClientRect()
    const anchorX = event.clientX - rect.left + container.scrollLeft
    const anchorY = event.clientY - rect.top + container.scrollTop
    const direction = event.deltaY < 0 ? 1 : -1
    const nextZoom = clampZoom(zoom + direction * zoomStep)

    if (nextZoom === zoom) {
      return
    }

    setZoom(nextZoom)
    window.requestAnimationFrame(() => {
      const zoomRatio = nextZoom / zoom
      container.scrollLeft = anchorX * zoomRatio - (event.clientX - rect.left)
      container.scrollTop = anchorY * zoomRatio - (event.clientY - rect.top)
    })
  }

  const handlePanStart = (event: MouseEvent<HTMLDivElement>): void => {
    if (!svg || event.button !== 0) {
      return
    }
    const target = event.target as HTMLElement
    if (target.closest('.preview-zoom-controls')) {
      return
    }
    event.preventDefault()
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
          setSvgDimensions(getSvgDimensions(result.svg))
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
          setSvgDimensions(null)
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
    setSvgDimensions(null)
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
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0
      containerRef.current.scrollTop = 0
    }
  }, [code, theme])

  const scaledCanvasStyle: CSSProperties | undefined = svgDimensions
    ? {
        width: `${Math.max(1, svgDimensions.width * zoom)}px`,
        height: `${Math.max(1, svgDimensions.height * zoom)}px`
      }
    : undefined
  const canvasStyle: CSSProperties = svgDimensions
    ? {
        width: `${svgDimensions.width}px`,
        height: `${svgDimensions.height}px`,
        transform: `scale(${zoom})`,
        transformOrigin: 'top center'
      }
    : {
        transform: `scale(${zoom})`,
        transformOrigin: 'top center'
      }

  return (
    <div
      className={`preview-panel ${svg ? 'preview-panel--pannable' : ''} ${isPanning ? 'preview-panel--panning' : ''}`}
      ref={containerRef}
      onWheel={handleWheelZoom}
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
            className="preview-canvas-space"
            style={scaledCanvasStyle}
          >
            <div
              className="preview-canvas"
              dangerouslySetInnerHTML={{ __html: svg }}
              style={canvasStyle}
            />
          </div>
        </div>
      )}
    </div>
  )
}
