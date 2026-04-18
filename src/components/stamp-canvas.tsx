import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { TILE_SHAPE_MAP, TILE_SHAPES } from "./tile-shapes"
import type { TileShape } from "./tile-shapes"
import { StampContextMenu } from "./stamp-context-menu"

// ---------------------------------------------------------------------------
// Grid constant
// ---------------------------------------------------------------------------

const SNAP = 58

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const OVERLAY_STYLE: React.CSSProperties = { display: "block", pointerEvents: "none" }
const MAIN_STYLE:    React.CSSProperties = { display: "block" }

// ---------------------------------------------------------------------------
// Color remap — pixel-level equivalent of the SVG feColorMatrix
// Maps #538FDF → target ink color, preserves white grain highlights
// ---------------------------------------------------------------------------

function recolorPixels(data: Uint8ClampedArray, hex: string): void {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const L_BASE = 0.5247, RANGE = 1 - L_BASE, SCALE = 1 + L_BASE / RANGE
  const kr = (1 - r) / RANGE, kg = (1 - g) / RANGE, kb = (1 - b) / RANGE
  const cr = SCALE * r - (SCALE - 1)
  const cg = SCALE * g - (SCALE - 1)
  const cb = SCALE * b - (SCALE - 1)
  const wR = 0.3, wG = 0.59, wB = 0.11
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i] / 255, pg = data[i + 1] / 255, pb = data[i + 2] / 255
    data[i]     = Math.max(0, Math.min(255, (kr * wR * pr + kr * wG * pg + kr * wB * pb + cr) * 255)) | 0
    data[i + 1] = Math.max(0, Math.min(255, (kg * wR * pr + kg * wG * pg + kg * wB * pb + cg) * 255)) | 0
    data[i + 2] = Math.max(0, Math.min(255, (kb * wR * pr + kb * wG * pg + kb * wB * pb + cb) * 255)) | 0
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function snapPos(x: number, y: number) {
  return { x: Math.round(x / SNAP) * SNAP, y: Math.round(y / SNAP) * SNAP }
}

function isSameCell(a: Stamp, b: Stamp): boolean {
  return a.x === b.x && a.y === b.y
}

function stampAtPoint(x: number, y: number, stamps: Stamp[]): string | null {
  for (let i = stamps.length - 1; i >= 0; i--) {
    const s = stamps[i]
    const shape = TILE_SHAPE_MAP.get(s.shapeId)
    if (!shape) continue
    let px = x, py = y
    if (s.rotation) {
      const cx = s.x + shape.pxW / 2
      const cy = s.y + shape.pxH / 2
      const rad = (-s.rotation * Math.PI) / 180
      const cos = Math.cos(rad), sin = Math.sin(rad)
      const dx = x - cx, dy = y - cy
      px = cx + dx * cos - dy * sin
      py = cy + dx * sin + dy * cos
    }
    if (px >= s.x && px <= s.x + shape.pxW && py >= s.y && py <= s.y + shape.pxH) {
      return s.id
    }
  }
  return null
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
  additive: boolean
}

interface RubberBandRect {
  x1: number
  y1: number
  x2: number
  y2: number
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
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
}

export function StampCanvas({ activeTool, selectedShapeId, inkColor, inkOpacity, recolorVersion, canvasRef }: StampCanvasProps) {

  // ── State ─────────────────────────────────────────────────────────────────

  const [stamps, setStamps]               = useState<Stamp[]>([])
  const [past, setPast]                   = useState<Stamp[][]>([])
  const [future, setFuture]               = useState<Stamp[][]>([])
  const [ghostPos, setGhostPos]           = useState<{ x: number; y: number } | null>(null)
  const [ghostRotation, setGhostRotation] = useState(0)
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu]     = useState<ContextMenuState | null>(null)
  const [rubberBand, setRubberBand]       = useState<RubberBandRect | null>(null)
  const [tilesLoaded, setTilesLoaded]     = useState(false)

  // ── Canvas refs ────────────────────────────────────────────────────────────

  const mainCanvasRef    = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // ── Tile image / color caches ──────────────────────────────────────────────

  const tileImgRef     = useRef(new Map<string, HTMLImageElement>())
  const coloredTileRef = useRef(new Map<string, OffscreenCanvas>())

  // ── Interaction refs ──────────────────────────────────────────────────────

  const containerRef       = useRef<HTMLDivElement>(null)
  const dragRef            = useRef<DragState | null>(null)
  const rubberBandRef      = useRef<RubberBandStart | null>(null)
  const rubberBandRectRef  = useRef<RubberBandRect | null>(null)
  const clipboardRef       = useRef<Stamp[]>([])
  const rafRef             = useRef<number | null>(null)
  const recolorSnapshotRef = useRef<Stamp[] | null>(null)

  // Mirror refs
  const stampsRef          = useRef(stamps)
  const pastRef            = useRef(past)
  const futureRef          = useRef(future)
  const selectedIdsRef     = useRef(selectedIds)
  const activeToolRef      = useRef(activeTool)
  const ghostRotationRef   = useRef(ghostRotation)
  const ghostPosRef        = useRef(ghostPos)
  const inkOpacityRef      = useRef(inkOpacity)
  const inkColorRef        = useRef(inkColor)
  const selectedShapeIdRef = useRef(selectedShapeId)
  stampsRef.current          = stamps
  pastRef.current            = past
  futureRef.current          = future
  selectedIdsRef.current     = selectedIds
  activeToolRef.current      = activeTool
  ghostRotationRef.current   = ghostRotation
  ghostPosRef.current        = ghostPos
  inkOpacityRef.current      = inkOpacity
  inkColorRef.current        = inkColor
  selectedShapeIdRef.current = selectedShapeId

  // ── Tile image loading ─────────────────────────────────────────────────────

  useEffect(() => {
    let loaded = 0
    const total = TILE_SHAPES.length
    TILE_SHAPES.forEach((shape) => {
      const img = new Image()
      const done = () => {
        tileImgRef.current.set(shape.id, img)
        if (++loaded === total) setTilesLoaded(true)
      }
      img.onload  = done
      img.onerror = done
      img.src = shape.textureUrl
    })
  }, [])

  // ── Colored-tile getter ───────────────────────────────────────────────────

  const getColoredTile = useCallback((shape: TileShape, color: string): OffscreenCanvas | null => {
    const key = `${shape.id}-${color}`
    const cache = coloredTileRef.current
    if (cache.has(key)) return cache.get(key)!
    const img = tileImgRef.current.get(shape.id)
    if (!img) return null
    const oc  = new OffscreenCanvas(shape.pxW, shape.pxH)
    const ctx = oc.getContext("2d")!
    ctx.drawImage(img, 0, 0, shape.pxW, shape.pxH)
    const imageData = ctx.getImageData(0, 0, shape.pxW, shape.pxH)
    recolorPixels(imageData.data, color)
    ctx.putImageData(imageData, 0, 0)
    cache.set(key, oc)
    return oc
  }, [])

  // ── Draw callbacks (ref pattern so ResizeObserver can call them stably) ───

  const redrawMainRef = useRef<() => void>(() => {})
  redrawMainRef.current = () => {
    const canvas = mainCanvasRef.current
    if (!canvas || canvas.width === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    for (const stamp of stampsRef.current) {
      const shape = TILE_SHAPE_MAP.get(stamp.shapeId)
      if (!shape) continue
      const colored = getColoredTile(shape, stamp.color)
      if (!colored) continue
      ctx.save()
      if (stamp.rotation) {
        const cx = stamp.x + shape.pxW / 2
        const cy = stamp.y + shape.pxH / 2
        ctx.translate(cx, cy)
        ctx.rotate(stamp.rotation * Math.PI / 180)
        ctx.translate(-cx, -cy)
      }
      ctx.globalAlpha = (stamp.opacity ?? 100) / 100
      ctx.drawImage(colored, stamp.x, stamp.y, shape.pxW, shape.pxH)
      ctx.restore()
    }
  }

  const redrawOverlayRef = useRef<() => void>(() => {})
  redrawOverlayRef.current = () => {
    const canvas = overlayCanvasRef.current
    if (!canvas || canvas.width === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    // Selection highlights
    const sel = selectedIdsRef.current
    if (sel.size > 0) {
      ctx.fillStyle   = "rgba(0,131,246,0.31)"
      ctx.strokeStyle = "#0083F6"
      ctx.lineWidth   = 2
      for (const stamp of stampsRef.current) {
        if (!sel.has(stamp.id)) continue
        const shape = TILE_SHAPE_MAP.get(stamp.shapeId)
        if (!shape) continue
        ctx.save()
        if (stamp.rotation) {
          const cx = stamp.x + shape.pxW / 2
          const cy = stamp.y + shape.pxH / 2
          ctx.translate(cx, cy)
          ctx.rotate(stamp.rotation * Math.PI / 180)
          ctx.translate(-cx, -cy)
        }
        ctx.beginPath()
        ctx.roundRect(stamp.x - 2, stamp.y - 2, shape.pxW + 4, shape.pxH + 4, 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
    }

    // Ghost preview
    const gp = ghostPosRef.current
    if (activeToolRef.current === "shapes" && gp) {
      const shape = TILE_SHAPE_MAP.get(selectedShapeIdRef.current)
      if (shape) {
        const colored = getColoredTile(shape, inkColorRef.current)
        if (colored) {
          const rot = ghostRotationRef.current
          ctx.save()
          if (rot) {
            const cx = gp.x + shape.pxW / 2
            const cy = gp.y + shape.pxH / 2
            ctx.translate(cx, cy)
            ctx.rotate(rot * Math.PI / 180)
            ctx.translate(-cx, -cy)
          }
          ctx.globalAlpha = 0.35
          ctx.drawImage(colored, gp.x, gp.y, shape.pxW, shape.pxH)
          ctx.restore()
        }
      }
    }

    // Rubber band selection rect
    const rb = rubberBandRectRef.current
    if (rb) {
      const x = Math.min(rb.x1, rb.x2), y = Math.min(rb.y1, rb.y2)
      const w = Math.abs(rb.x2 - rb.x1),  h = Math.abs(rb.y2 - rb.y1)
      ctx.fillStyle   = "rgba(0,131,246,0.1)"
      ctx.strokeStyle = "#0083F6"
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 6)
      ctx.fill()
      ctx.stroke()
    }
  }

  // ── Canvas resize observer ─────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const w = Math.round(width), h = Math.round(height)
      const dpr = window.devicePixelRatio || 1
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr)
      const main    = mainCanvasRef.current
      const overlay = overlayCanvasRef.current
      if (main && (main.width !== pw || main.height !== ph)) {
        main.width = pw; main.height = ph
        main.style.width = w + "px"; main.style.height = h + "px"
      }
      if (overlay && (overlay.width !== pw || overlay.height !== ph)) {
        overlay.width = pw; overlay.height = ph
        overlay.style.width = w + "px"; overlay.style.height = h + "px"
      }
      redrawMainRef.current()
      redrawOverlayRef.current()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // ── Forward main canvas to parent for export ───────────────────────────────

  useEffect(() => {
    if (canvasRef) canvasRef.current = mainCanvasRef.current
  })

  // ── Redraw triggers ────────────────────────────────────────────────────────

  useEffect(() => { redrawMainRef.current() }, [stamps, tilesLoaded])

  useEffect(() => {
    redrawOverlayRef.current()
  }, [stamps, selectedIds, activeTool, ghostPos, ghostRotation, rubberBand, inkColor, selectedShapeId])

  // ── Clear selection when switching away from select tool ───────────────────

  useEffect(() => {
    if (activeTool !== "select") { setSelectedIds(new Set()); dragRef.current = null }
  }, [activeTool])

  // ── Dismiss context menu on outside mousedown ──────────────────────────────

  useEffect(() => {
    if (!contextMenu) return
    const onDown = () => setContextMenu(null)
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [contextMenu])

  // ── Reset recolor session when selection changes ───────────────────────────

  useEffect(() => { recolorSnapshotRef.current = null }, [selectedIds])

  // ── Live recolor selected tiles; one undo entry per color-picker session ───

  useEffect(() => {
    if (activeToolRef.current !== "select") return
    const sel = selectedIdsRef.current
    if (sel.size === 0) return
    if (recolorSnapshotRef.current === null) {
      recolorSnapshotRef.current = stampsRef.current
      setPast((p) => [...p.slice(-49), stampsRef.current])
      setFuture([])
    }
    setStamps((prev) => prev.map((s) =>
      sel.has(s.id) ? { ...s, color: inkColor, opacity: inkOpacityRef.current } : s
    ))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recolorVersion])

  // ── Cancel pending rAF on unmount ──────────────────────────────────────────

  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }, [])

  // ── Keyboard handler ───────────────────────────────────────────────────────

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
      setPast((p) => [...p.slice(-49), curStamps])
      setFuture((prev) => prev.slice(1))
      setStamps(f[0])
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "c") {
      if (tool !== "select" || sel.size === 0) return
      e.preventDefault()
      clipboardRef.current = curStamps.filter((s) => sel.has(s.id))
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "v") {
      e.preventDefault()
      if (clipboardRef.current.length === 0) return
      const newStamps = clipboardRef.current.map((s, i) => ({
        ...s,
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        x: s.x + SNAP,
        y: s.y + SNAP,
      }))
      setPast((p) => [...p.slice(-49), curStamps]); setFuture([])
      setStamps((prev) => [...prev, ...newStamps])
      setSelectedIds(new Set(newStamps.map((s) => s.id)))
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
      setPast((p) => [...p.slice(-49), curStamps]); setFuture([])
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

  // ── Stable callbacks ───────────────────────────────────────────────────────

  const finalizeDrag = useCallback(() => {
    if (!dragRef.current?.moved) return
    const draggedIds = new Set(dragRef.current.startPositions.keys())
    setStamps((prev) => prev.map((s) => {
      if (!draggedIds.has(s.id)) return s
      const { x, y } = snapPos(s.x, s.y)
      return { ...s, x, y }
    }))
  }, [])

  const getHitStamps = useCallback((rb: RubberBandRect): string[] => {
    const left   = Math.min(rb.x1, rb.x2)
    const right  = Math.max(rb.x1, rb.x2)
    const top    = Math.min(rb.y1, rb.y2)
    const bottom = Math.max(rb.y1, rb.y2)
    return stampsRef.current.filter((s) => {
      const shape = TILE_SHAPE_MAP.get(s.shapeId)
      if (!shape) return false
      return s.x < right && s.x + shape.pxW > left &&
             s.y < bottom && s.y + shape.pxH > top
    }).map((s) => s.id)
  }, [])

  // ── Layer order ────────────────────────────────────────────────────────────

  const bringForward = useCallback((id: string) => {
    recolorSnapshotRef.current = null
    const current = stampsRef.current
    const idx = current.findIndex((s) => s.id === id)
    if (idx === -1 || idx === current.length - 1) return
    const next = [...current];[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setPast((p) => [...p.slice(-49), current]); setFuture([]); setStamps(next)
  }, [])

  const sendBack = useCallback((id: string) => {
    recolorSnapshotRef.current = null
    const current = stampsRef.current
    const idx = current.findIndex((s) => s.id === id)
    if (idx <= 0) return
    const next = [...current];[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
    setPast((p) => [...p.slice(-49), current]); setFuture([]); setStamps(next)
  }, [])

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeToolRef.current !== "select") return
    setContextMenu(null)

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const currentStamps   = stampsRef.current
    const currentSelected = selectedIdsRef.current
    const stampId = stampAtPoint(cx, cy, currentStamps)

    if (stampId) {
      if (e.shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.has(stampId) ? next.delete(stampId) : next.add(stampId)
          return next
        })
        return
      }

      const hit = currentStamps.find((s) => s.id === stampId)
      if (!hit) return

      const cellStack = [...currentStamps].reverse().filter((s) => isSameCell(s, hit))
      let targetId = stampId
      if (cellStack.length > 1) {
        const selId = currentSelected.size === 1 ? [...currentSelected][0] : null
        const currentIdx = cellStack.findIndex((s) => s.id === selId)
        if (currentIdx !== -1) targetId = cellStack[(currentIdx + 1) % cellStack.length].id
      }

      let dragSet: Set<string>
      if (currentSelected.has(targetId) && currentSelected.size > 1) {
        dragSet = currentSelected
      } else {
        setSelectedIds(new Set([targetId]))
        dragSet = new Set([targetId])
      }

      const startPositions = new Map<string, { x: number; y: number }>()
      for (const id of dragSet) {
        const s = currentStamps.find((st) => st.id === id)
        if (s) startPositions.set(id, snapPos(s.x, s.y))
      }
      dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startPositions, moved: false }
      e.preventDefault()

    } else {
      rubberBandRef.current = {
        screenX: e.clientX, screenY: e.clientY,
        canvasX: cx, canvasY: cy,
        additive: e.shiftKey,
      }
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const clientX = e.clientX
    const clientY = e.clientY

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null

      if (activeToolRef.current === "select") {
        if (dragRef.current) {
          const dx = clientX - dragRef.current.startMouseX
          const dy = clientY - dragRef.current.startMouseY
          if (!dragRef.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) dragRef.current.moved = true
          if (dragRef.current.moved) {
            setStamps((prev) => prev.map((s) => {
              const start = dragRef.current!.startPositions.get(s.id)
              return start ? { ...s, x: start.x + dx, y: start.y + dy } : s
            }))
          }
        } else if (rubberBandRef.current) {
          const { screenX, screenY, canvasX, canvasY } = rubberBandRef.current
          if (Math.abs(clientX - screenX) > 2 || Math.abs(clientY - screenY) > 2) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect) {
              const newRB = { x1: canvasX, y1: canvasY, x2: clientX - rect.left, y2: clientY - rect.top }
              rubberBandRectRef.current = newRB
              setRubberBand(newRB)
            }
          }
        }
      } else {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        setGhostPos(snapPos(clientX - rect.left, clientY - rect.top))
      }
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    finalizeDrag()
    dragRef.current = null

    if (rubberBandRef.current) {
      const { additive } = rubberBandRef.current
      rubberBandRef.current = null
      const rb = rubberBandRectRef.current
      if (rb) {
        const hitIds = getHitStamps(rb)
        setSelectedIds((prev) => additive ? new Set([...prev, ...hitIds]) : new Set(hitIds))
        rubberBandRectRef.current = null
        setRubberBand(null)
      } else {
        setSelectedIds(new Set())
      }
    }
  }, [finalizeDrag, getHitStamps])

  const handleMouseLeave = useCallback(() => {
    setGhostPos(null)
    finalizeDrag()
    dragRef.current = null
    rubberBandRef.current     = null
    rubberBandRectRef.current = null
    setRubberBand(null)
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [finalizeDrag])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (activeToolRef.current !== "shapes") return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pos = snapPos(e.clientX - rect.left, e.clientY - rect.top)
    recolorSnapshotRef.current = null
    const current = stampsRef.current
    setPast((p) => [...p.slice(-49), current]); setFuture([])
    setStamps((prev) => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      shapeId: selectedShapeIdRef.current, color: inkColorRef.current, opacity: inkOpacityRef.current,
      x: pos.x, y: pos.y, rotation: ghostRotationRef.current,
    }])
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (activeToolRef.current !== "select") return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const stampId = stampAtPoint(e.clientX - rect.left, e.clientY - rect.top, stampsRef.current)
    if (!stampId) return
    setSelectedIds(new Set([stampId]))
    setStamps((prev) => prev.map((s) => s.id === stampId ? { ...s, rotation: (s.rotation + 90) % 360 } : s))
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (activeToolRef.current !== "select") return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const stampId = stampAtPoint(e.clientX - rect.left, e.clientY - rect.top, stampsRef.current)
    if (!stampId) return
    if (!selectedIdsRef.current.has(stampId)) setSelectedIds(new Set([stampId]))
    setContextMenu({ x: e.clientX, y: e.clientY, stampId })
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  const ctxIdx        = contextMenu ? stamps.findIndex((s) => s.id === contextMenu.stampId) : -1
  const ctxCanForward = ctxIdx !== -1 && ctxIdx < stamps.length - 1
  const ctxCanBack    = ctxIdx > 0
  const containerStyle = useMemo<React.CSSProperties>(
    () => ({ cursor: activeTool === "shapes" ? "crosshair" : "default" }),
    [activeTool]
  )

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={containerStyle}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}    onMouseLeave={handleMouseLeave}
      onClick={handleClick}        onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Main canvas — placed stamps */}
      <canvas ref={mainCanvasRef} className="absolute inset-0" style={MAIN_STYLE} />

      {/* Overlay canvas — selection highlights, ghost preview, rubber band */}
      <canvas ref={overlayCanvasRef} className="absolute inset-0" style={OVERLAY_STYLE} />

      {/* Right-click context menu */}
      {contextMenu && ctxIdx !== -1 && (
        <StampContextMenu
          x={contextMenu.x} y={contextMenu.y}
          canForward={ctxCanForward} canBack={ctxCanBack}
          onBringForward={() => bringForward(contextMenu.stampId)}
          onSendBack={() => sendBack(contextMenu.stampId)}
          onDelete={() => {
            recolorSnapshotRef.current = null
            const toDelete = selectedIdsRef.current.size > 0 ? selectedIdsRef.current : new Set([contextMenu.stampId])
            const current = stampsRef.current
            setPast((p) => [...p.slice(-49), current]); setFuture([])
            setStamps((prev) => prev.filter((s) => !toDelete.has(s.id)))
            setSelectedIds(new Set()); setContextMenu(null)
          }}
        />
      )}
    </div>
  )
}
