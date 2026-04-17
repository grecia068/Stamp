import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { TILE_SHAPES } from "./tile-shapes"
import type { TileShape } from "./tile-shapes"
import { StampContextMenu } from "./stamp-context-menu"

// ---------------------------------------------------------------------------
// Grid constant — single source of truth for all snapping
// ---------------------------------------------------------------------------

const SNAP = 58

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

function stampIdFromEvent(e: React.MouseEvent): string | null {
  return (e.target as Element).closest("[data-stamp-id]")?.getAttribute("data-stamp-id") ?? null
}

function snapPos(x: number, y: number) {
  return { x: Math.round(x / SNAP) * SNAP, y: Math.round(y / SNAP) * SNAP }
}

function isSameCell(a: Stamp, b: Stamp): boolean {
  return a.x === b.x && a.y === b.y
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stamp {
  id: string
  shapeId: string
  color: string
  opacity: number  // 0–100
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

interface RubberBandStart {
  screenX: number
  screenY: number
  canvasX: number
  canvasY: number
  additive: boolean // true when Shift was held at mousedown
}

interface RubberBandRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

// ---------------------------------------------------------------------------
// SVG sub-components
// ---------------------------------------------------------------------------

function PlacedStamp({ stamp, shape, isSelected, cursor }: {
  stamp: Stamp
  shape: TileShape
  isSelected: boolean
  cursor: string
}) {
  const cx = stamp.x + shape.pxW / 2
  const cy = stamp.y + shape.pxH / 2
  const transform = stamp.rotation ? `rotate(${stamp.rotation} ${cx} ${cy})` : undefined
  return (
    <g data-stamp-id={stamp.id} transform={transform} style={{ cursor }}>
      {isSelected && (
        <rect
          x={stamp.x - 2} y={stamp.y - 2}
          width={shape.pxW + 4} height={shape.pxH + 4}
          rx={2} fill="rgba(0,131,246,0.31)" stroke="#0083F6" strokeWidth={2}
          style={{ pointerEvents: "none" }}
        />
      )}
      <image
        href={shape.textureUrl}
        x={stamp.x} y={stamp.y}
        width={shape.pxW} height={shape.pxH}
        filter={`url(#${filterId(stamp.color)})`}
        opacity={(stamp.opacity ?? 100) / 100}
      />
    </g>
  )
}

function GhostPreview({ pos, shape, rotation, inkColor }: {
  pos: { x: number; y: number }
  shape: TileShape
  rotation: number
  inkColor: string
}) {
  const cx = pos.x + shape.pxW / 2
  const cy = pos.y + shape.pxH / 2
  return (
    <g
      transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined}
      style={{ pointerEvents: "none" }}
    >
      <svg
        x={pos.x} y={pos.y}
        width={shape.pxW} height={shape.pxH}
        viewBox={shape.viewBox}
        preserveAspectRatio="xMidYMid meet"
        opacity={0.35} overflow="visible"
      >
        {shape.inner(inkColor)}
      </svg>
    </g>
  )
}

// ---------------------------------------------------------------------------
// StampCanvas
// ---------------------------------------------------------------------------

interface StampCanvasProps {
  activeTool: "select" | "shapes"
  selectedShapeId: string
  inkColor: string
  inkOpacity: number
  recolorVersion: number
  svgRef?: React.RefObject<SVGSVGElement | null>
}

export function StampCanvas({ activeTool, selectedShapeId, inkColor, inkOpacity, recolorVersion, svgRef }: StampCanvasProps) {

  // ── State ─────────────────────────────────────────────────────────────────

  const [stamps, setStamps]               = useState<Stamp[]>([])
  const [past, setPast]                   = useState<Stamp[][]>([])
  const [future, setFuture]               = useState<Stamp[][]>([])
  const [ghostPos, setGhostPos]           = useState<{ x: number; y: number } | null>(null)
  const [ghostRotation, setGhostRotation] = useState(0)
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu]     = useState<ContextMenuState | null>(null)
  const [rubberBand, setRubberBand]       = useState<RubberBandRect | null>(null)

  const containerRef       = useRef<HTMLDivElement>(null)
  const dragRef            = useRef<DragState | null>(null)
  const rubberBandRef      = useRef<RubberBandStart | null>(null)
  // Captures the stamps snapshot once per color-picker session so undo gets
  // one history entry per interaction, not one per mouse-move frame.
  const recolorSnapshotRef = useRef<Stamp[] | null>(null)

  // Mirror refs keep the keyboard handler current without re-registering it
  const stampsRef        = useRef(stamps)
  const pastRef          = useRef(past)
  const futureRef        = useRef(future)
  const selectedIdsRef   = useRef(selectedIds)
  const activeToolRef    = useRef(activeTool)
  const ghostRotationRef = useRef(ghostRotation)
  const inkOpacityRef    = useRef(inkOpacity)
  stampsRef.current        = stamps
  pastRef.current          = past
  futureRef.current        = future
  selectedIdsRef.current   = selectedIds
  activeToolRef.current    = activeTool
  ghostRotationRef.current = ghostRotation
  inkOpacityRef.current    = inkOpacity

  // ── Effects ───────────────────────────────────────────────────────────────

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (activeTool !== "select") { setSelectedIds(new Set()); dragRef.current = null }
  }, [activeTool])

  // Dismiss context menu on any outside mousedown
  useEffect(() => {
    if (!contextMenu) return
    const onDown = () => setContextMenu(null)
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [contextMenu])

  // Reset the recolor session when selection changes
  useEffect(() => { recolorSnapshotRef.current = null }, [selectedIds])

  // Recolor selected tiles live as ink color changes; one undo entry per session
  useEffect(() => {
    if (activeToolRef.current !== "select") return
    const sel = selectedIdsRef.current
    if (sel.size === 0) return
    if (recolorSnapshotRef.current === null) {
      recolorSnapshotRef.current = stampsRef.current
      setPast((p) => [...p, stampsRef.current])
      setFuture([])
    }
    setStamps((prev) => prev.map((s) =>
      sel.has(s.id) ? { ...s, color: inkColor, opacity: inkOpacityRef.current } : s
    ))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recolorVersion])

  // ── Keyboard handler ──────────────────────────────────────────────────────

  // Registered once; always reads current state via mirror refs
  const keyCallbackRef = useRef<(e: KeyboardEvent) => void>(undefined)
  keyCallbackRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return

    const tool      = activeToolRef.current
    const sel       = selectedIdsRef.current
    const curStamps = stampsRef.current

    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault()
      const p = pastRef.current
      if (!p.length) return
      setPast((prev) => prev.slice(0, -1))
      setFuture((f) => [curStamps, ...f])
      setStamps(p[p.length - 1])
      return
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
      e.preventDefault()
      const f = futureRef.current
      if (!f.length) return
      setPast((p) => [...p, curStamps])
      setFuture((prev) => prev.slice(1))
      setStamps(f[0])
      return
    }
    if (e.key === "Escape") {
      setContextMenu(null); setSelectedIds(new Set()); dragRef.current = null; return
    }
    if (e.key === "r" || e.key === "R") {
      if (tool === "shapes") { setGhostRotation((prev) => (prev + 90) % 360); return }
      if (tool === "select" && sel.size > 0) {
        setStamps((prev) => prev.map((s) => sel.has(s.id) ? { ...s, rotation: (s.rotation + 90) % 360 } : s))
        return
      }
    }
    if (tool !== "select") return
    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault(); setSelectedIds(new Set(curStamps.map((s) => s.id))); return
    }
    if (!sel.size) return
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      recolorSnapshotRef.current = null
      setPast((p) => [...p, curStamps]); setFuture([])
      setStamps((prev) => prev.filter((s) => !sel.has(s.id))); setSelectedIds(new Set()); return
    }
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    }
    const d = deltas[e.key]
    if (d) {
      e.preventDefault()
      setStamps((prev) => prev.map((s) => sel.has(s.id) ? { ...s, x: s.x + d[0], y: s.y + d[1] } : s))
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyCallbackRef.current?.(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Placement ─────────────────────────────────────────────────────────────

  const canvasPoint = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  function getSnappedPlacement(e: React.MouseEvent) {
    const pt = canvasPoint(e)
    return pt ? snapPos(pt.x, pt.y) : null
  }

  // Snap dragged stamps to the grid on mouse release
  function finalizeDrag() {
    if (!dragRef.current?.moved) return
    const draggedIds = new Set(dragRef.current.startPositions.keys())
    setStamps((prev) => prev.map((s) => {
      if (!draggedIds.has(s.id)) return s
      const { x, y } = snapPos(s.x, s.y)
      return { ...s, x, y }
    }))
  }

  // Returns IDs of stamps whose bounding box intersects the rubber band rect
  function getHitStamps(rb: RubberBandRect): string[] {
    const left   = Math.min(rb.x1, rb.x2)
    const right  = Math.max(rb.x1, rb.x2)
    const top    = Math.min(rb.y1, rb.y2)
    const bottom = Math.max(rb.y1, rb.y2)
    return stamps.filter((s) => {
      const shape = TILE_SHAPES.find((sh) => sh.id === s.shapeId)
      if (!shape) return false
      return s.x < right && s.x + shape.pxW > left &&
             s.y < bottom && s.y + shape.pxH > top
    }).map((s) => s.id)
  }

  // ── Layer order ───────────────────────────────────────────────────────────

  function bringForward(id: string) {
    recolorSnapshotRef.current = null
    const current = stampsRef.current
    const idx = current.findIndex((s) => s.id === id)
    if (idx === -1 || idx === current.length - 1) return
    const next = [...current];[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setPast((p) => [...p, current]); setFuture([]); setStamps(next)
  }

  function sendBack(id: string) {
    recolorSnapshotRef.current = null
    const current = stampsRef.current
    const idx = current.findIndex((s) => s.id === id)
    if (idx <= 0) return
    const next = [...current];[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
    setPast((p) => [...p, current]); setFuture([]); setStamps(next)
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent) {
    if (activeTool !== "select") return
    setContextMenu(null)
    const stampId = stampIdFromEvent(e)

    if (stampId) {
      // ── Clicked on a tile ────────────────────────────────────

      if (e.shiftKey) {
        // Shift+click: toggle this tile in the existing selection
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.has(stampId) ? next.delete(stampId) : next.add(stampId)
          return next
        })
        return
      }

      const hit = stamps.find((s) => s.id === stampId)
      if (!hit) return

      // Cycle through stacked tiles in the same cell on repeated clicks
      const cellStack = [...stamps].reverse().filter((s) => isSameCell(s, hit))
      let targetId = stampId
      if (cellStack.length > 1) {
        const currentSelected = selectedIds.size === 1 ? [...selectedIds][0] : null
        const currentIdx = cellStack.findIndex((s) => s.id === currentSelected)
        if (currentIdx !== -1) targetId = cellStack[(currentIdx + 1) % cellStack.length].id
      }

      // Preserve multi-selection when clicking a tile that's already in it;
      // otherwise select just this tile
      let dragSet: Set<string>
      if (selectedIds.has(targetId) && selectedIds.size > 1) {
        dragSet = selectedIds
      } else {
        setSelectedIds(new Set([targetId]))
        dragSet = new Set([targetId])
      }

      // Snap start positions so drag always originates from a clean grid cell
      const startPositions = new Map<string, { x: number; y: number }>()
      for (const id of dragSet) {
        const s = stamps.find((st) => st.id === id)
        if (s) startPositions.set(id, snapPos(s.x, s.y))
      }
      dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startPositions, moved: false }
      e.preventDefault()

    } else {
      // ── Clicked on empty canvas — start rubber band ──────────

      const pt = canvasPoint(e)
      if (pt) {
        rubberBandRef.current = {
          screenX: e.clientX, screenY: e.clientY,
          canvasX: pt.x, canvasY: pt.y,
          additive: e.shiftKey,
        }
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (activeTool === "select") {
      if (dragRef.current) {
        // Tile drag: move freely, snap on release
        const dx = e.clientX - dragRef.current.startMouseX
        const dy = e.clientY - dragRef.current.startMouseY
        if (!dragRef.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) dragRef.current.moved = true
        if (dragRef.current.moved) {
          setStamps((prev) => prev.map((s) => {
            const start = dragRef.current!.startPositions.get(s.id)
            return start ? { ...s, x: start.x + dx, y: start.y + dy } : s
          }))
        }
      } else if (rubberBandRef.current) {
        // Rubber band: update rect once movement exceeds threshold
        const { screenX, screenY, canvasX, canvasY } = rubberBandRef.current
        if (Math.abs(e.clientX - screenX) > 2 || Math.abs(e.clientY - screenY) > 2) {
          const pt = canvasPoint(e)
          if (pt) setRubberBand({ x1: canvasX, y1: canvasY, x2: pt.x, y2: pt.y })
        }
      }
    } else {
      setGhostPos(getSnappedPlacement(e))
    }
  }

  function handleMouseUp() {
    finalizeDrag()
    dragRef.current = null

    if (rubberBandRef.current) {
      const { additive } = rubberBandRef.current
      rubberBandRef.current = null
      if (rubberBand) {
        // Drag occurred: select tiles that intersect the rect
        const hitIds = getHitStamps(rubberBand)
        setSelectedIds((prev) => additive ? new Set([...prev, ...hitIds]) : new Set(hitIds))
        setRubberBand(null)
      } else {
        // No drag (just a click on empty canvas): deselect all
        setSelectedIds(new Set())
      }
    }
  }

  function handleMouseLeave() {
    setGhostPos(null)
    finalizeDrag()
    dragRef.current = null
    // Cancel any in-progress rubber band
    rubberBandRef.current = null
    setRubberBand(null)
  }

  function handleClick(e: React.MouseEvent) {
    if (activeTool !== "shapes") return
    const pos = getSnappedPlacement(e)
    if (!pos) return
    recolorSnapshotRef.current = null
    const current = stampsRef.current
    setPast((p) => [...p, current]); setFuture([])
    setStamps((prev) => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      shapeId: selectedShapeId, color: inkColor, opacity: inkOpacityRef.current,
      x: pos.x, y: pos.y, rotation: ghostRotation,
    }])
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (activeTool !== "select") return
    const stampId = stampIdFromEvent(e)
    if (!stampId) return
    setSelectedIds(new Set([stampId]))
    setStamps((prev) => prev.map((s) => s.id === stampId ? { ...s, rotation: (s.rotation + 90) % 360 } : s))
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    if (activeTool !== "select") return
    const stampId = stampIdFromEvent(e)
    if (!stampId) return
    if (!selectedIds.has(stampId)) setSelectedIds(new Set([stampId]))
    setContextMenu({ x: e.clientX, y: e.clientY, stampId })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedShape = TILE_SHAPES.find((s) => s.id === selectedShapeId)
  const uniqueColors  = useMemo(() => [...new Set(stamps.map((s) => s.color))], [stamps])
  const ctxIdx        = contextMenu ? stamps.findIndex((s) => s.id === contextMenu.stampId) : -1
  const ctxCanForward = ctxIdx !== -1 && ctxIdx < stamps.length - 1
  const ctxCanBack    = ctxIdx > 0

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: activeTool === "shapes" ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}    onMouseLeave={handleMouseLeave}
      onClick={handleClick}        onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <svg ref={svgRef} className="absolute inset-0" width="100%" height="100%" style={{ overflow: "visible" }}>
        {/* Per-color recolor filters */}
        <defs>
          {uniqueColors.map((hex) => (
            <filter key={hex} id={filterId(hex)} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={recolorMatrix(hex)} />
            </filter>
          ))}
        </defs>

        {/* Placed stamps */}
        {stamps.map((stamp) => {
          const shape = TILE_SHAPES.find((s) => s.id === stamp.shapeId)
          if (!shape) return null
          return <PlacedStamp key={stamp.id} stamp={stamp} shape={shape} isSelected={selectedIds.has(stamp.id)} cursor={activeTool === "select" ? "move" : "default"} />
        })}

        {/* Ghost preview while stamp tool is active */}
        {activeTool === "shapes" && ghostPos && selectedShape && (
          <GhostPreview pos={ghostPos} shape={selectedShape} rotation={ghostRotation} inkColor={inkColor} />
        )}

        {/* Rubber band selection rect */}
        {rubberBand && (
          <rect
            x={Math.min(rubberBand.x1, rubberBand.x2)}
            y={Math.min(rubberBand.y1, rubberBand.y2)}
            width={Math.abs(rubberBand.x2 - rubberBand.x1)}
            height={Math.abs(rubberBand.y2 - rubberBand.y1)}
            rx={6}
            fill="rgba(0,131,246,0.1)"
            stroke="#0083F6"
            strokeWidth={1}
            style={{ pointerEvents: "none" }}
          />
        )}
      </svg>

      {/* Right-click context menu */}
      {contextMenu && ctxIdx !== -1 && (
        <StampContextMenu
          x={contextMenu.x} y={contextMenu.y}
          canForward={ctxCanForward} canBack={ctxCanBack}
          onBringForward={() => bringForward(contextMenu.stampId)}
          onSendBack={() => sendBack(contextMenu.stampId)}
          onDelete={() => {
            recolorSnapshotRef.current = null
            const toDelete = selectedIds.size > 0 ? selectedIds : new Set([contextMenu.stampId])
            const current = stampsRef.current
            setPast((p) => [...p, current]); setFuture([])
            setStamps((prev) => prev.filter((s) => !toDelete.has(s.id)))
            setSelectedIds(new Set()); setContextMenu(null)
          }}
        />
      )}
    </div>
  )
}
