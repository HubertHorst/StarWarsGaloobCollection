'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  onCommit?: () => void   // Enter
  onCancel?: () => void   // Esc
  className?: string      // extra wrapper classes
  inputClassName?: string // input field styling
}

/**
 * Combobox: free-text input + visible dropdown that opens on focus/click.
 * Unlike a native <datalist>, the dropdown is rendered by us so it shows
 * even before the user types and is consistent across browsers.
 *
 * Options are filtered by the current value (case-insensitive substring).
 * Empty value shows all options.
 */
export default function SerieCombobox({
  value, onChange, options,
  placeholder = 'Serie wählen oder eingeben',
  disabled = false, autoFocus = false,
  onCommit, onCancel,
  className = '',
  inputClassName = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Filter options by current input
  const q = value.toLowerCase().trim()
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(option: string) {
    onChange(option)
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && activeIdx >= 0 && activeIdx < filtered.length) {
        e.preventDefault()
        pick(filtered[activeIdx])
      } else {
        e.preventDefault()
        setOpen(false)
        onCommit?.()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (open) setOpen(false)
      else onCancel?.()
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full bg-zinc-800 text-zinc-100 rounded-md pl-2.5 pr-14 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-yellow-500 placeholder:text-zinc-500 disabled:opacity-50 ${inputClassName}`}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => { onChange(''); inputRef.current?.focus() }}
              className="p-1 text-zinc-500 hover:text-zinc-200 rounded"
              tabIndex={-1}
              title="Leeren"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setOpen((o) => !o); inputRef.current?.focus() }}
            disabled={disabled}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
            tabIndex={-1}
            title="Liste öffnen"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-zinc-900 border border-white/10 rounded-md shadow-2xl"
        >
          {filtered.map((o, i) => {
            const isActive = i === activeIdx
            const isSelected = o === value
            return (
              <li
                key={o}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(o) }}
                className={[
                  'px-2.5 py-1.5 text-sm cursor-pointer select-none',
                  isActive  ? 'bg-yellow-600/30 text-white'         : 'text-zinc-200',
                  isSelected ? 'font-medium text-yellow-300'          : '',
                ].join(' ')}
              >
                {o}
              </li>
            )
          })}
        </ul>
      )}

      {open && filtered.length === 0 && value && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-md px-2.5 py-2 text-xs text-zinc-500">
          Kein Treffer – Enter zum Anlegen als neue Serie
        </div>
      )}
    </div>
  )
}
