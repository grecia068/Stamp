import React from "react"
import { cn } from "@/lib/utils"
import { BringToFront, SendToBack, Trash2, ChevronsUp, ChevronsDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ── Constants ─────────────────────────────────────────────────────────────────

const MENU_FONT  = { fontFamily: "'DM Mono', monospace" }
const BTN_BASE   = "flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left text-zinc-800 rounded transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-300"
const BTN_DISABLED = "opacity-40 cursor-default pointer-events-none"

function stopAll(e: React.MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StampContextMenuProps {
  x: number
  y: number
  canForward: boolean
  canBack: boolean
  onBringToFront: () => void
  onBringForward: () => void
  onSendBack: () => void
  onSendToBack: () => void
  onDelete: () => void
}

type LayerAction = { icon: LucideIcon; label: string; enabled: boolean; action: () => void }

// ── Component ─────────────────────────────────────────────────────────────────

export function StampContextMenu({
  x, y, canForward, canBack,
  onBringToFront, onBringForward, onSendBack, onSendToBack, onDelete,
}: StampContextMenuProps) {
  const layerActions: LayerAction[] = [
    { icon: ChevronsUp,   label: "Bring to Front", enabled: canForward, action: onBringToFront },
    { icon: BringToFront, label: "Bring Forward",  enabled: canForward, action: onBringForward },
    { icon: SendToBack,   label: "Send Back",       enabled: canBack,    action: onSendBack     },
    { icon: ChevronsDown, label: "Send to Back",    enabled: canBack,    action: onSendToBack   },
  ]

  return (
    <div
      onMouseDown={stopAll}
      onMouseUp={stopAll}
      onClick={stopAll}
      onDoubleClick={stopAll}
      onContextMenu={stopAll}
      style={{
        position: "fixed",
        left: x,
        top: y,
        background: "#ffffff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.06)",
        paddingTop: 4,
        paddingBottom: 4,
        zIndex: 1000,
        minWidth: 160,
      }}
    >
      {layerActions.map(({ icon: Icon, label, enabled, action }) => (
        <button
          key={label}
          disabled={!enabled}
          onClick={(e) => { e.stopPropagation(); action() }}
          style={MENU_FONT}
          className={cn(BTN_BASE, !enabled && BTN_DISABLED)}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}

      <div className="h-px bg-zinc-200 my-1" />

      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={MENU_FONT}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left text-red-500 rounded transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-200"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  )
}
