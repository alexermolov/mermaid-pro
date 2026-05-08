import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'

export type ToolbarMenuEntry =
  | {
      type: 'item'
      id: string
      label: string
      icon?: ReactNode
      onSelect: () => void
      disabled?: boolean
      title?: string
    }
  | { type: 'separator' }

type ToolbarSplitButtonProps = {
  primaryIcon: ReactNode
  primaryLabel: string
  primaryTitle?: string
  onPrimaryClick: () => void
  primaryDisabled?: boolean
  menuLabel: string
  menuEntries: ToolbarMenuEntry[]
}

export function ToolbarSplitButton({
  primaryIcon,
  primaryLabel,
  primaryTitle,
  onPrimaryClick,
  primaryDisabled = false,
  menuLabel,
  menuEntries
}: ToolbarSplitButtonProps): JSX.Element {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent): void {
      const el = rootRef.current
      if (!el?.contains(event.target as Node)) {
        close()
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  function toggleMenu(): void {
    setOpen((v) => !v)
  }

  function handleMenuTriggerKeyDown(event: ReactKeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div ref={rootRef} className="toolbar-split">
      <button
        type="button"
        className="toolbar-split__primary"
        onClick={onPrimaryClick}
        disabled={primaryDisabled}
        title={primaryTitle}
      >
        {primaryIcon}
        {primaryLabel}
      </button>
      <button
        type="button"
        className="toolbar-split__trigger"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.stopPropagation()
          toggleMenu()
        }}
        onKeyDown={handleMenuTriggerKeyDown}
      >
        <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="toolbar-split__menu" role="menu" aria-label={menuLabel}>
          {menuEntries.map((entry, index) =>
            entry.type === 'separator' ? (
              <div key={`sep-${index}`} className="toolbar-split__menu-sep" role="separator" />
            ) : (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                className="toolbar-split__menu-item"
                disabled={entry.disabled}
                title={entry.title}
                onClick={() => {
                  if (!entry.disabled) {
                    entry.onSelect()
                    close()
                  }
                }}
              >
                {entry.icon ? <span className="toolbar-split__menu-icon">{entry.icon}</span> : null}
                <span>{entry.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
