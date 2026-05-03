import { useState, useRef, useEffect } from "react"
import { Home, Download } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface TopBarProps {
  title: string
  onTitleChange: (title: string) => void
  onHome: () => void
  onExport: () => void
}

export function TopBar({ title, onTitleChange, onHome, onExport }: TopBarProps) {
  const [draft, setDraft] = useState(title)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  function startEdit() {
    setDraft(title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed) onTitleChange(trimmed)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  return (
    <>
      {/* Left pill: Home | separator | title | save */}
      <div
        className="absolute top-6 left-6 flex items-center gap-2"
        style={{
          background: "#ffffff",
          border: "1px solid #e4e4e7",
          borderRadius: 8,
          padding: "8px 16px 8px 8px",
          boxShadow: "0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.06)",
        }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={onHome}
                style={{
                  width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", borderRadius: 6,
                  cursor: "pointer", color: "#18181b", flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f4f4f5" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
              />
            }
          >
            <Home size={16} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Home</TooltipContent>
        </Tooltip>

        <div style={{ width: 1, height: 20, background: "#e4e4e7", flexShrink: 0 }} />

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
              if (e.key === "Escape") cancel()
            }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: "20px",
              color: "#09090b",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
              minWidth: 80,
              width: `${Math.max(80, draft.length * 8.5)}px`,
            }}
          />
        ) : (
          <span
            onClick={startEdit}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: "20px",
              color: "#09090b",
              whiteSpace: "nowrap",
              cursor: "text",
              userSelect: "none",
            }}
          >
            {title}
          </span>
        )}

      </div>

      {/* Right: download button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onExport}
              className="absolute top-6 right-6"
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                cursor: "pointer",
                color: "#18181b",
                boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f4f4f5" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ffffff" }}
            />
          }
        >
          <Download size={16} />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Export PNG</TooltipContent>
      </Tooltip>
    </>
  )
}
