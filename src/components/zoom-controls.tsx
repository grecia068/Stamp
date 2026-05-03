import { useState, useRef, useEffect } from "react"
import { ZoomIn, ZoomOut } from "lucide-react"

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomTo: (zoom: number) => void
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onZoomTo }: ZoomControlsProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEditing() {
    setDraft(String(Math.round(zoom * 100)))
    setEditing(true)
  }

  function commit() {
    const value = parseFloat(draft)
    if (!isNaN(value) && value > 0) {
      onZoomTo(Math.max(10, Math.min(125, value)) / 100)
    }
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  return (
    <div
      className="absolute bottom-6 left-6 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg"
      style={{
        padding: 8,
        boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -1px rgba(0,0,0,0.06)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-100 transition-colors shrink-0"
        onClick={onZoomIn}
      >
        <ZoomIn size={16} color="#18181b" />
      </button>
      <div className="w-px h-5 bg-zinc-200 shrink-0" />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit() }
            if (e.key === "Escape") { e.preventDefault(); cancel() }
          }}
          className="h-8 rounded-md text-sm text-black text-center border border-zinc-300 focus:outline-none focus:border-zinc-400"
          style={{ width: 53, fontFamily: "'DM Mono', monospace", padding: "0 4px" }}
        />
      ) : (
        <button
          className="flex items-center justify-center h-8 rounded-md hover:bg-zinc-100 transition-colors text-sm text-black whitespace-nowrap"
          style={{ minWidth: 53, fontFamily: "'DM Mono', monospace", padding: "0 8px" }}
          onClick={startEditing}
        >
          {Math.round(zoom * 100)}%
        </button>
      )}

      <div className="w-px h-5 bg-zinc-200 shrink-0" />
      <button
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-100 transition-colors shrink-0"
        onClick={onZoomOut}
      >
        <ZoomOut size={16} color="#18181b" />
      </button>
    </div>
  )
}
