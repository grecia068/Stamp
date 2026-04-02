import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { BringToFront, SendToBack, Trash2 } from "lucide-react"
import { TILE_SHAPES } from "./tile-shapes"
import type { TileShape } from "./tile-shapes"

const SNAP = 55
const GAP  = 2

// ---------------------------------------------------------------------------
// Color remap — maps #538FDF → any ink color, preserves white grain
// ---------------------------------------------------------------------------

function recolorMatrix(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const L_BASE = 0.5247
  const RANGE  = 1 - L_BASE
  const SCALE  = 1 + L_BASE / RANGE
  const kr = (1 - r) / RANGE, kg = (1 - g) / RANGE, kb = (1 - b) / RANGE
  const cr = SCALE * r - (SCALE - 1)
  const cg = SCALE * g - (SCALE - 1)
  const cb = SCALE * b - (SCALE - 1)
  const [wR, wG, wB] = [0.3, 0.59, 0.11]
  const row = (k: number, c: number) =>
    [wR * k, wG * k, wB * k, 0, c].map((v) => v.toFixed(5)).join(" ")
  return `${row(kr, cr)} ${row(kg, cg)} ${row(kb, cb)} 0 0 0 1 0`
}

function filterId(hex: string) {
  return `rc-${hex.replace("#", "")}`
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function effectiveDims(shape: TileShape, rotation: number) {
  const swap = rotation === 90 || rotation === 270
  return { w: swap ? shape.pxH : shape.pxW, h: swap ? shape.pxW : shape.pxH }
}

function visualOrigin(stamp: Stamp, shape: TileShape) {
  const { w, h } = effectiveDims(shape, stamp.rotation)
  return {
    x: stamp.x + (shape.pxW - w) / 2,
    y: stamp.y + (shape.pxH - h) / 2,
  }
}

// Find stamp id from a DOM event by walking up to the nearest [data-stamp-id] element
function stampIdFromEvent(e: React.MouseEvent): string | null {
  return (e.target as Element).closest("[data-stamp-id]")?.getAttribute("data-stamp-id") ?? null
}

// Snap a point to the SNAP grid
function snapPos(x: number, y: number) {
  return {
    x: Math.round(x / SNAP) * SNAP,
    y: Math.round(y / SNAP) * SNAP,
  }
}

// Two stamps are in the same cell if they share the same snapped placement origin
function isSameCell(a: Stamp, b: Stamp): boolean {
  return a.x === b.x && a.y === b.y
}

// Would placing a tile at (px, py) stack on top of an existing stamp?
function wouldStack(px: number, py: number, stamps: Stamp[]): boolean {
  return stamps.some((s) => s.x === px && s.y === py)
}

// Auto-gap: push (x,y) away from all existing stamps to maintain GAP clearance.
// Stamps that share the same position (stacked) are excluded from gap calculation.
function applyAutoGap(
  x: number,
  y: number,
  shapeId: string,
  rotation: number,
  stamps: Stamp[],
  excludeId?: string
): { x: number; y: number } {
  const shape = TILE_SHAPES.find((s) => s.id === shapeId)
  if (!shape) return { x, y }
  const { w: newW, h: newH } = effectiveDims(shape, rotation)
  let cx = x, cy = y

  for (const stamp of stamps) {
    if (stamp.id === excludeId) continue
    // Skip stacked tiles — they share the same cell and need no gap
    if (stamp.x === x && stamp.y === y) continue
    const other = TILE_SHAPES.find((s) => s.id === stamp.shapeId)
    if (!other) continue
    const { w: otherW, h: otherH } = effectiveDims(other, stamp.rotation)
    const { x: ox, y: oy } = visualOrigin(stamp, other)

    const hProx = cx < ox + otherW + GAP && cx + newW + GAP > ox
    const vProx = cy < oy + otherH + GAP && cy + newH + GAP > oy
    if (!hProx || !vProx) continue

    const dx = (cx + newW / 2) - (ox + otherW / 2)
    const dy = (cy + newH / 2) - (oy + otherH / 2)

    if (Math.abs(dx) >= Math.abs(dy)) {
      cx = dx >= 0 ? ox + otherW + GAP : ox - GAP - newW
    } else {
      cy = dy >= 0 ? oy + otherH + GAP : oy - GAP - newH
    }
  }
  return { x: cx, y: cy }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stamp {
  id: string
  shapeId: string
  color: string
  x: number
  y: number
  rotation: number // 0 | 90 | 180 | 270
}

interface DragState {
  startMouseX: number
  startMouseY: number
  startPositions: Map<string, { x: number; y: number }>
  moved: boolean
}

interface ContextMenuState {
  x: number
  y: number
  stampId: string
}

// ---------------------------------------------------------------------------
// Context menu item style helper
// ---------------------------------------------------------------------------

function menuItemStyle(disabled: boolean, destructive = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    padding: "6px 12px",
    fontSize: 14,
    lineHeight: "20px",
    fontFamily: "'DM Mono', monospace",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "#a1a1aa" : destructive ? "#ef4444" : "#18181b",
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StampCanvasProps {
  activeTool: "select" | "shapes"
  selectedShapeId: string
  inkColor: string
  svgRef?: React.RefObject<SVGSVGElement | null>
}

export function StampCanvas({
  activeTool,
  selectedShapeId,
  inkColor,
  svgRef,
}: StampCanvasProps) {
  const [stamps, setStamps]           = useState<Stamp[]>([])
  const [past, setPast]               = useState<Stamp[][]>([])
  const [future, setFuture]           = useState<Stamp[][]>([])
  const [ghostPos, setGhostPos]       = useState<{ x: number; y: number } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef      = useRef<DragState | null>(null)

  // Refs so the keyboard handler always reads current state without stale closures
  const stampsRef      = useRef(stamps)
  const pastRef        = useRef(past)
  const futureRef      = useRef(future)
  const selectedIdsRef = useRef(selectedIds)
  const activeToolRef  = useRef(activeTool)
  stampsRef.current      = stamps
  pastRef.current        = past
  futureRef.current      = future
  selectedIdsRef.current = selectedIds
  activeToolRef.current  = activeTool

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (activeTool !== "select") {
      setSelectedIds(new Set())
      dragRef.current = null
    }
  }, [activeTool])

  // Dismiss context menu on outside mousedown
  useEffect(() => {
    if (!contextMenu) return
    function onDown() { setContextMenu(null) }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [contextMenu])

  // Combined keyboard handler — registered once, reads latest state via refs
  const keyCallbackRef = useRef<(e: KeyboardEvent) => void>(undefined)
  keyCallbackRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return

    const tool      = activeToolRef.current
    const sel       = selectedIdsRef.current
    const curStamps = stampsRef.current

    // ── Undo: Cmd/Ctrl+Z ────────────────────────────────────────────────
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault()
      const p = pastRef.current
      if (p.length === 0) return
      setPast((prev) => prev.slice(0, -1))
      setFuture((f) => [curStamps, ...f])
      setStamps(p[p.length - 1])
      return
    }

    // ── Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y ────────────────────────────
    if (
      (e.metaKey || e.ctrlKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault()
      const f = futureRef.current
      if (f.length === 0) return
      setPast((p) => [...p, curStamps])
      setFuture((prev) => prev.slice(1))
      setStamps(f[0])
      return
    }

    // ── Escape: deselect + cancel drag + close context menu ─────────────
    if (e.key === "Escape") {
      setContextMenu(null)
      setSelectedIds(new Set())
      dragRef.current = null
      return
    }

    // Select-tool-only shortcuts below
    if (tool !== "select") return

    // ── Cmd+A: select all ───────────────────────────────────────────────
    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault()
      setSelectedIds(new Set(curStamps.map((s) => s.id)))
      return
    }

    if (sel.size === 0) return

    // ── Delete / Backspace: remove selected ─────────────────────────────
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      setPast((p) => [...p, curStamps])
      setFuture([])
      setStamps((prev) => prev.filter((s) => !sel.has(s.id)))
      setSelectedIds(new Set())
      return
    }

    // ── R: rotate all selected tiles 90° CW ─────────────────────────────
    if (e.key === "r" || e.key === "R") {
      setStamps((prev) =>
        prev.map((s) => sel.has(s.id) ? { ...s, rotation: (s.rotation + 90) % 360 } : s)
      )
      return
    }

    // ── Arrow keys: nudge 1px ────────────────────────────────────────────
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1],
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    }
    const d = deltas[e.key]
    if (d) {
      e.preventDefault()
      setStamps((prev) =>
        prev.map((s) => sel.has(s.id) ? { ...s, x: s.x + d[0], y: s.y + d[1] } : s)
      )
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyCallbackRef.current?.(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Snap / placement helpers ────────────────────────────────────────────

  const canvasPoint = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const snapToGrid = useCallback((x: number, y: number) => snapPos(x, y), [])

  function getGhostedPlacement(e: React.MouseEvent) {
    const pt = canvasPoint(e)
    if (!pt) return null
    const snapped = snapToGrid(pt.x, pt.y)
    // If an existing tile is at this cell, stack directly — no auto-gap
    if (wouldStack(snapped.x, snapped.y, stamps)) {
      return snapped
    }
    return applyAutoGap(snapped.x, snapped.y, selectedShapeId, 0, stamps)
  }

  // Snap + gap finalize for all dragged stamps (applied against non-dragged stamps only)
  function finalizeDrag() {
    if (!dragRef.current?.moved) return
    const draggedIds = new Set(dragRef.current.startPositions.keys())
    setStamps((prev) => {
      const staticStamps = prev.filter((s) => !draggedIds.has(s.id))
      const updates = new Map<string, { x: number; y: number }>()
      for (const stampId of draggedIds) {
        const stamp = prev.find((s) => s.id === stampId)
        if (!stamp) continue
        const snapped = snapToGrid(stamp.x, stamp.y)
        // Stack if snapped position coincides with a static tile; otherwise auto-gap
        const final = wouldStack(snapped.x, snapped.y, staticStamps)
          ? snapped
          : applyAutoGap(snapped.x, snapped.y, stamp.shapeId, stamp.rotation, staticStamps)
        updates.set(stampId, final)
      }
      return prev.map((s) => {
        const upd = updates.get(s.id)
        return upd ? { ...s, ...upd } : s
      })
    })
  }

  // ── Layer order helpers ─────────────────────────────────────────────────

  function bringForward(id: string) {
    const stamp = stamps.find((s) => s.id === id)
    if (!stamp) return
    const idx = stamps.findIndex((s) => s.id === id)
    // Find the next same-cell stamp with a higher array index
    const nextIdx = stamps.findIndex((s, i) => i > idx && isSameCell(s, stamp))
    if (nextIdx === -1) return
    const next = [...stamps]
    ;[next[idx], next[nextIdx]] = [next[nextIdx], next[idx]]
    setPast((p) => [...p, stamps])
    setFuture([])
    setStamps(next)
  }

  function sendBack(id: string) {
    const stamp = stamps.find((s) => s.id === id)
    if (!stamp) return
    const idx = stamps.findIndex((s) => s.id === id)
    // Find the previous same-cell stamp with a lower array index
    let prevIdx = -1
    for (let i = idx - 1; i >= 0; i--) {
      if (isSameCell(stamps[i], stamp)) { prevIdx = i; break }
    }
    if (prevIdx === -1) return
    const next = [...stamps]
    ;[next[idx], next[prevIdx]] = [next[prevIdx], next[idx]]
    setPast((p) => [...p, stamps])
    setFuture([])
    setStamps(next)
  }

  function deleteStamp(id: string) {
    setPast((p) => [...p, stamps])
    setFuture([])
    setStamps((prev) => prev.filter((s) => s.id !== id))
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // ── Event handlers ──────────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent) {
    if (activeTool !== "select") return
    setContextMenu(null)
    const stampId = stampIdFromEvent(e)

    if (e.shiftKey) {
      if (stampId) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(stampId)) next.delete(stampId)
          else next.add(stampId)
          return next
        })
      }
      return
    }

    if (stampId) {
      const hit = stamps.find((s) => s.id === stampId)
      if (!hit) return

      // Selection cycling: if multiple tiles share this cell, cycle through the stack
      const cellStack = [...stamps].reverse().filter((s) => isSameCell(s, hit))
      let targetId = stampId

      if (cellStack.length > 1) {
        const currentSelected = selectedIds.size === 1 ? [...selectedIds][0] : null
        const currentIdx = cellStack.findIndex((s) => s.id === currentSelected)
        if (currentIdx !== -1) {
          // Cycle to the next tile down in the stack
          targetId = cellStack[(currentIdx + 1) % cellStack.length].id
        }
        // else: select topmost (stampId from DOM event = highest array index rendered)
      }

      const dragSet = selectedIds.has(targetId) && selectedIds.size > 1
        ? selectedIds
        : new Set([targetId])
      setSelectedIds(new Set([targetId]))

      const startPositions = new Map<string, { x: number; y: number }>()
      for (const id of dragSet) {
        const s = stamps.find((st) => st.id === id)
        if (s) startPositions.set(id, { x: s.x, y: s.y })
      }

      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPositions,
        moved: false,
      }
      e.preventDefault()
    } else {
      setSelectedIds(new Set())
      dragRef.current = null
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    if (activeTool !== "select") return
    const stampId = stampIdFromEvent(e)
    if (!stampId) return
    setSelectedIds(new Set([stampId]))
    setContextMenu({ x: e.clientX, y: e.clientY, stampId })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (activeTool === "select") {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startMouseX
        const dy = e.clientY - dragRef.current.startMouseY
        if (!dragRef.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          dragRef.current.moved = true
        }
        if (dragRef.current.moved) {
          setStamps((prev) =>
            prev.map((s) => {
              const start = dragRef.current!.startPositions.get(s.id)
              if (!start) return s
              return { ...s, x: start.x + dx, y: start.y + dy }
            })
          )
        }
      }
    } else {
      setGhostPos(getGhostedPlacement(e))
    }
  }

  function handleMouseUp() {
    finalizeDrag()
    dragRef.current = null
  }

  function handleMouseLeave() {
    setGhostPos(null)
    finalizeDrag()
    dragRef.current = null
  }

  function handleClick(e: React.MouseEvent) {
    if (activeTool !== "shapes") return
    const pos = getGhostedPlacement(e)
    if (!pos) return
    setPast((p) => [...p, stamps])
    setFuture([])
    setStamps((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        shapeId: selectedShapeId,
        color: inkColor,
        x: pos.x,
        y: pos.y,
        rotation: 0,
      },
    ])
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (activeTool !== "select") return
    const stampId = stampIdFromEvent(e)
    if (!stampId) return
    setSelectedIds(new Set([stampId]))
    setStamps((prev) =>
      prev.map((s) => s.id === stampId ? { ...s, rotation: (s.rotation + 90) % 360 } : s)
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const selectedShape = TILE_SHAPES.find((s) => s.id === selectedShapeId)
  const uniqueColors  = useMemo(() => [...new Set(stamps.map((s) => s.color))], [stamps])

  // Derived data for context menu
  const ctxStamp = contextMenu ? stamps.find((s) => s.id === contextMenu.stampId) ?? null : null
  const ctxIdx   = ctxStamp ? stamps.findIndex((s) => s.id === ctxStamp.id) : -1
  const ctxHasStack   = ctxStamp ? stamps.some((s) => s.id !== ctxStamp.id && isSameCell(s, ctxStamp)) : false
  const ctxCanForward = ctxStamp ? stamps.some((s, i) => i > ctxIdx && isSameCell(s, ctxStamp)) : false
  const ctxCanBack    = ctxStamp ? stamps.some((s, i) => i < ctxIdx && isSameCell(s, ctxStamp)) : false

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: activeTool === "shapes" ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <defs>
          {uniqueColors.map((hex) => (
            <filter
              key={hex}
              id={filterId(hex)}
              x="0%" y="0%" width="100%" height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feColorMatrix type="matrix" values={recolorMatrix(hex)} />
            </filter>
          ))}
        </defs>

        {/* ── Placed stamps ───────────────────────────────────────────── */}
        {stamps.map((stamp) => {
          const shape = TILE_SHAPES.find((s) => s.id === stamp.shapeId)
          if (!shape) return null
          const cx        = stamp.x + shape.pxW / 2
          const cy        = stamp.y + shape.pxH / 2
          const transform = stamp.rotation
            ? `rotate(${stamp.rotation} ${cx} ${cy})`
            : undefined
          const isSelected = selectedIds.has(stamp.id)

          return (
            <g
              key={stamp.id}
              data-stamp-id={stamp.id}
              transform={transform}
              style={{ cursor: activeTool === "select" ? "move" : "default" }}
            >
              {isSelected && (
                <rect
                  x={stamp.x - 2}
                  y={stamp.y - 2}
                  width={shape.pxW + 4}
                  height={shape.pxH + 4}
                  rx={2}
                  fill="rgba(0,131,246,0.31)"
                  stroke="#0083F6"
                  strokeWidth={2}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <image
                href={shape.textureUrl}
                x={stamp.x}
                y={stamp.y}
                width={shape.pxW}
                height={shape.pxH}
                filter={`url(#${filterId(stamp.color)})`}
              />
            </g>
          )
        })}

        {/* ── Ghost preview ───────────────────────────────────────────── */}
        {activeTool === "shapes" && ghostPos && selectedShape && (
          <svg
            x={ghostPos.x}
            y={ghostPos.y}
            width={selectedShape.pxW}
            height={selectedShape.pxH}
            viewBox={selectedShape.viewBox}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.35}
            overflow="visible"
            style={{ pointerEvents: "none" }}
          >
            {selectedShape.inner(inkColor)}
          </svg>
        )}
      </svg>

      {/* ── Context menu ────────────────────────────────────────────────── */}
      {contextMenu && ctxStamp && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
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
          {ctxHasStack && (
            <>
              <button
                disabled={!ctxCanForward}
                onClick={() => { bringForward(contextMenu.stampId); setContextMenu(null) }}
                style={menuItemStyle(!ctxCanForward)}
              >
                <BringToFront size={14} />
                Bring Forward
              </button>
              <button
                disabled={!ctxCanBack}
                onClick={() => { sendBack(contextMenu.stampId); setContextMenu(null) }}
                style={menuItemStyle(!ctxCanBack)}
              >
                <SendToBack size={14} />
                Send Back
              </button>
              <div style={{ height: 1, background: "#e4e4e7", margin: "4px 0" }} />
            </>
          )}
          <button
            onClick={() => { deleteStamp(contextMenu.stampId); setContextMenu(null) }}
            style={menuItemStyle(false, true)}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
