import { useEffect, useMemo, useState, type RefObject } from 'react'
import mermaid from 'mermaid'

type MermaidPreviewProps = {
  code: string
  containerRef: RefObject<HTMLDivElement>
  theme: 'light' | 'dark'
  onSvgChange: (svg: string) => void
  onRenderStateChange: (status: string) => void
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
  onRenderStateChange
}: MermaidPreviewProps): JSX.Element {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const renderId = useMemo(() => `mermaid-${Date.now().toString(36)}`, [code])

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
          onSvgChange(result.svg)
          onRenderStateChange('Preview is up to date')
        }
      } catch (caughtError) {
        if (!cancelled) {
          setSvg('')
          setError(caughtError instanceof Error ? caughtError.message : 'Unable to render diagram')
          setIsRendering(false)
          onSvgChange('')
          onRenderStateChange('Preview has Mermaid errors')
        }
      }
    }

    setSvg('')
    setError(null)
    setIsRendering(true)
    onSvgChange('')
    onRenderStateChange('Rendering preview...')
    const timeoutId = window.setTimeout(() => {
      render()
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [code, onRenderStateChange, onSvgChange, renderId, theme])

  return (
    <div className="preview-panel" ref={containerRef}>
      {error ? (
        <div className="preview-error">
          <strong>Mermaid render error</strong>
          <span>{error}</span>
        </div>
      ) : isRendering ? (
        <div className="preview-loading">Rendering diagram...</div>
      ) : (
        <div className="preview-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  )
}
