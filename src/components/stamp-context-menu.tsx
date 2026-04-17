import { cn } from "@/lib/utils"
import { BringToFront, SendToBack, Trash2 } from "lucide-react"

const MENU_FONT = { fontFamily: "'DM Mono', monospace" }

interface StampContextMenuProps {
  x: number
  y: number
  canForward: boolean
  canBack: boolean
  onBringForward: () => void
  onSendBack: () => void
  onDelete: () => void
}

export function StampContextMenu({
  x, y, canForward, canBack, onBringForward, onSendBack, onDelete,
}: StampContextMenuProps) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
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
      <button
        disabled={!canForward}
        onClick={onBringForward}
        style={MENU_FONT}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left text-zinc-800 rounded transition-colors",
          "hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-300",
          !canForward && "opacity-40 cursor-default pointer-events-none"
        )}
      >
        <BringToFront size={14} />
        Bring Forward
      </button>
      <button
        disabled={!canBack}
        onClick={onSendBack}
        style={MENU_FONT}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left text-zinc-800 rounded transition-colors",
          "hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-300",
          !canBack && "opacity-40 cursor-default pointer-events-none"
        )}
      >
        <SendToBack size={14} />
        Send Back
      </button>
      <div className="h-px bg-zinc-200 my-1" />
      <button
        onClick={onDelete}
        style={MENU_FONT}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left text-red-500 rounded transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-200"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  )
}
