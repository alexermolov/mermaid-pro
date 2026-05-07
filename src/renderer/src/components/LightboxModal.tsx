import { useEffect, useRef, useState, type ReactNode } from 'react'

type LightboxModalProps = {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  bodyClassName?: string
}

const exitFallbackMs = 380

export function LightboxModal({ title, open, onClose, children, bodyClassName }: LightboxModalProps): JSX.Element | null {
  const [displayed, setDisplayed] = useState(false)
  const [entered, setEntered] = useState(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const enterFrameRef = useRef<number>(0)
  const enterFrame2Ref = useRef<number>(0)

  useEffect(() => {
    if (open) {
      setDisplayed(true)
      enterFrameRef.current = requestAnimationFrame(() => {
        enterFrame2Ref.current = requestAnimationFrame(() => setEntered(true))
      })
      return () => {
        cancelAnimationFrame(enterFrameRef.current)
        cancelAnimationFrame(enterFrame2Ref.current)
      }
    }

    setEntered(false)
    return undefined
  }, [open])

  useEffect(() => {
    if (open || !displayed) {
      return undefined
    }

    const el = surfaceRef.current
    const finalize = (): void => setDisplayed(false)

    if (!el) {
      finalize()
      return undefined
    }

    let done = false
    const finish = (): void => {
      if (done) {
        return
      }
      done = true
      finalize()
    }

    function handleTransitionEnd(event: TransitionEvent): void {
      if (event.target !== el || event.propertyName !== 'transform') {
        return
      }
      finish()
    }

    el.addEventListener('transitionend', handleTransitionEnd)
    const fallbackId = window.setTimeout(finish, exitFallbackMs)

    return () => {
      window.clearTimeout(fallbackId)
      el.removeEventListener('transitionend', handleTransitionEnd)
    }
  }, [open, displayed])

  useEffect(() => {
    if (!displayed) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [displayed, onClose])

  if (!displayed) {
    return null
  }

  const bodyClasses = ['lightbox-modal__body']
  if (bodyClassName) {
    bodyClasses.push(bodyClassName)
  }

  return (
    <div
      className={`lightbox-modal${entered ? ' lightbox-modal--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-modal-title"
    >
      <button type="button" className="lightbox-modal__backdrop" aria-label="Close enlarged view" onClick={onClose} />
      <div ref={surfaceRef} className="lightbox-modal__surface">
        <header className="lightbox-modal__header">
          <h3 id="lightbox-modal-title">{title}</h3>
          <button type="button" className="lightbox-modal__close compact-action" onClick={onClose}>
            Close
          </button>
        </header>
        <div className={bodyClasses.join(' ')}>{children}</div>
      </div>
    </div>
  )
}
