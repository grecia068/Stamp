import { useState, useEffect, useRef } from "react"
import { useTheme } from "@/lib/theme"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Toolbar } from "@/components/toolbar"
import { StampCanvas } from "@/components/stamp-canvas"
import type { StampCanvasHandle, Stamp } from "@/components/stamp-canvas"
import { ShortcutsPanel } from "@/components/shortcuts-panel"
import { TILE_SHAPES } from "@/components/tile-shapes"
import { TopBar } from "@/components/top-bar"
import { HomeScreen } from "@/components/home-screen"
import { loadPieces, savePiece, deletePiece, generateId, generateThumbnail } from "@/lib/storage"
import type { SavedPiece } from "@/lib/storage"

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || !!t.isContentEditable
}

function App() {
  // Apply and persist dark/light mode across the whole app
  useTheme()

  // ── Screen / piece state ──────────────────────────────────────────────────
  const [screen, setScreen] = useState<"home" | "canvas">("home")
  const [pieces, setPieces] = useState<SavedPiece[]>(() => loadPieces())
  const [, setCurrentPieceId] = useState<string | null>(null)
  const [initialStamps, setInitialStamps] = useState<Stamp[]>([])
  // Ref so autosave/beforeunload always see the current ID without re-registering effects
  const pieceIdRef = useRef<string | null>(null)

  // ── Tool / canvas state ───────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<"select" | "shapes">("select")
  const [selectedShapeId, setSelectedShapeId] = useState("tile6-new")
  const [inkColor, setInkColor] = useState("#5B8BD9")
  const [inkOpacity, setInkOpacity] = useState(100)
  const [recolorVersion, setRecolorVersion] = useState(0)
  const [shapesOpen, setShapesOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [title, setTitle] = useState("Untitled master piece")
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stampHandleRef = useRef<StampCanvasHandle | null>(null)
  const shortcutsPanelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef(title)
  titleRef.current = title
  const selectedShapeIdRef = useRef(selectedShapeId)
  selectedShapeIdRef.current = selectedShapeId

  // Stable ref for doSave so interval/beforeunload closures stay current
  const doSaveRef = useRef<(pieceId: string) => boolean>(() => false)
  doSaveRef.current = (pieceId: string): boolean => {
    const stamps = stampHandleRef.current?.getStamps() ?? []
    const canvas = canvasRef.current
    const thumbnail = canvas ? generateThumbnail(canvas) : ""
    const existing = loadPieces().find((p) => p.id === pieceId)
    const piece: SavedPiece = {
      id: pieceId,
      title: titleRef.current,
      stamps,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thumbnail,
    }
    const result = savePiece(piece)
    if (!result.success) {
      if (result.error === "limit") {
        alert("You've reached the 50-piece limit. Delete some pieces from the home screen to keep saving.")
      } else if (result.error === "size") {
        alert("This piece is too large to save (exceeds 5MB).")
      }
      return false
    }
    return true
  }

  // ── Save helpers ──────────────────────────────────────────────────────────

  function handleSave() {
    let pieceId = pieceIdRef.current
    if (!pieceId) {
      const stamps = stampHandleRef.current?.getStamps() ?? []
      if (stamps.length === 0) return
      pieceId = generateId()
      pieceIdRef.current = pieceId
      setCurrentPieceId(pieceId)
    }
    if (doSaveRef.current(pieceId)) {
      setPieces(loadPieces())
    }
  }

  function handleFirstStamp() {
    if (pieceIdRef.current) return // already have an ID (opened existing piece)
    const newId = generateId()
    pieceIdRef.current = newId
    setCurrentPieceId(newId)
    if (doSaveRef.current(newId)) {
      setPieces(loadPieces())
    }
  }

  // ── 30-second autosave ────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      if (pieceIdRef.current) {
        doSaveRef.current(pieceIdRef.current)
        setPieces(loadPieces())
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // ── Save on tab close ─────────────────────────────────────────────────────

  useEffect(() => {
    function onBeforeUnload() {
      if (pieceIdRef.current) doSaveRef.current(pieceIdRef.current)
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleGoHome() {
    if (pieceIdRef.current) handleSave()
    setScreen("home")
    setCurrentPieceId(null)
    pieceIdRef.current = null
  }

  function handleNewPiece() {
    setInitialStamps([])
    setCurrentPieceId(null)
    pieceIdRef.current = null
    setTitle("Untitled master piece")
    setActiveTool("select")
    setShapesOpen(false)
    setColorOpen(false)
    setScreen("canvas")
  }

  function handleOpenPiece(id: string) {
    const piece = pieces.find((p) => p.id === id)
    if (!piece) return
    pieceIdRef.current = id
    setCurrentPieceId(id)
    setTitle(piece.title)
    setInitialStamps(piece.stamps)
    setActiveTool("select")
    setShapesOpen(false)
    setColorOpen(false)
    setScreen("canvas")
  }

  function handleDeletePiece(id: string) {
    deletePiece(id)
    setPieces(loadPieces())
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    const canvas = canvasRef.current
    if (!canvas) return
    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    ctx.drawImage(canvas, 0, 0)
    exportCanvas.toBlob((pngBlob) => {
      if (!pngBlob) return
      const a = document.createElement("a")
      a.href = URL.createObjectURL(pngBlob)
      a.download = `${titleRef.current}.png`
      a.click()
    }, "image/png")
  }

  // ── Keyboard shortcuts (canvas only) ──────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (screen !== "canvas") return
      if (isTyping(e)) return
      if (e.metaKey || e.ctrlKey) return

      switch (e.key) {
        case "v":
        case "V":
          setActiveTool("select")
          setShapesOpen(false)
          break
        case "s":
        case "S":
          setActiveTool("shapes")
          setShapesOpen(true)
          setColorOpen(false)
          break
        case "c":
        case "C":
          setColorOpen((o) => !o)
          setShapesOpen(false)
          break
        case "?":
          setShowShortcuts((o) => !o)
          break
        case "Escape":
          setShapesOpen(false)
          setColorOpen(false)
          setShowShortcuts(false)
          break
        case "[": {
          const idx = TILE_SHAPES.findIndex((s) => s.id === selectedShapeIdRef.current)
          setSelectedShapeId(TILE_SHAPES[(idx - 1 + TILE_SHAPES.length) % TILE_SHAPES.length].id)
          break
        }
        case "]": {
          const idx = TILE_SHAPES.findIndex((s) => s.id === selectedShapeIdRef.current)
          setSelectedShapeId(TILE_SHAPES[(idx + 1) % TILE_SHAPES.length].id)
          break
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [screen])

  useEffect(() => {
    if (!showShortcuts) return
    function onClickOutside(e: MouseEvent) {
      if (shortcutsPanelRef.current && !shortcutsPanelRef.current.contains(e.target as Node)) {
        setShowShortcuts(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showShortcuts])

  // ── Home screen ───────────────────────────────────────────────────────────

  if (screen === "home") {
    return (
      <HomeScreen
        pieces={pieces}
        onNewPiece={handleNewPiece}
        onOpenPiece={handleOpenPiece}
        onDeletePiece={handleDeletePiece}
      />
    )
  }

  // ── Canvas screen ─────────────────────────────────────────────────────────

  return (
    <TooltipProvider delay={300}>
      <div className="h-screen w-screen bg-background relative overflow-hidden">
        {/* Stamp canvas */}
        <StampCanvas
          activeTool={activeTool}
          selectedShapeId={selectedShapeId}
          inkColor={inkColor}
          inkOpacity={inkOpacity}
          recolorVersion={recolorVersion}
          canvasRef={canvasRef}
          handleRef={stampHandleRef}
          initialStamps={initialStamps}
          onFirstStamp={handleFirstStamp}
        />

        {/* Left toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          selectedShapeId={selectedShapeId}
          onShapeSelect={setSelectedShapeId}
          inkColor={inkColor}
          inkOpacity={inkOpacity}
          onColorChange={(hex, opacity) => {
            setInkColor(hex)
            setInkOpacity(opacity)
            setRecolorVersion((v) => v + 1)
          }}
          shapesOpen={shapesOpen}
          onShapesOpenChange={setShapesOpen}
          colorOpen={colorOpen}
          onColorOpenChange={setColorOpen}
        />

        {/* Top bar (Figma match) */}
        <TopBar
          title={title}
          onTitleChange={setTitle}
          onHome={handleGoHome}
          onExport={handleExport}
        />

        {/* Shortcuts panel + ? button — bottom right */}
        <div ref={shortcutsPanelRef} className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
          {showShortcuts && <ShortcutsPanel />}
          <Tooltip>
            <TooltipTrigger
              onClick={() => setShowShortcuts((o) => !o)}
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                color: "#18181b",
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: "0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.06)",
              }}
            >
              ?
            </TooltipTrigger>
            <TooltipContent side="left">Shortcuts</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
