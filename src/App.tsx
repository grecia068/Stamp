import { useState, useEffect, useRef } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toolbar } from "@/components/toolbar"
import { StampCanvas } from "@/components/stamp-canvas"
import { ShortcutsPanel } from "@/components/shortcuts-panel"
import { TILE_SHAPES } from "@/components/tile-shapes"
import { Download } from "lucide-react"

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || !!t.isContentEditable
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function App() {
  const [activeTool, setActiveTool] = useState<"select" | "shapes">("select")
  const [selectedShapeId, setSelectedShapeId] = useState("square")
  const [inkColor, setInkColor] = useState("#5B8BD9")
  const [inkOpacity, setInkOpacity] = useState(100)
  const [shapesOpen, setShapesOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [title, setTitle] = useState("Untitled master piece")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const shortcutsPanelRef = useRef<HTMLDivElement>(null)

  // Refs so the keyboard handler always sees current values without re-registering
  const selectedShapeIdRef = useRef(selectedShapeId)
  selectedShapeIdRef.current = selectedShapeId

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
  }, [])

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

  function startEditingTitle() {
    setTitleDraft(title)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }

  function commitTitle() {
    const trimmed = titleDraft.trim()
    if (trimmed) setTitle(trimmed)
    setEditingTitle(false)
  }

  function cancelTitle() {
    setEditingTitle(false)
  }

  async function handleExport() {
    const svg = svgRef.current
    if (!svg) return

    // Clone SVG and inline all image hrefs as base64
    const clone = svg.cloneNode(true) as SVGSVGElement
    const images = clone.querySelectorAll("image[href]")
    await Promise.all(
      Array.from(images).map(async (img) => {
        const href = img.getAttribute("href")
        if (!href || href.startsWith("data:")) return
        try {
          const b64 = await toBase64(href)
          img.setAttribute("href", b64)
        } catch {
          // skip images that fail to load
        }
      })
    )

    // Get actual pixel dimensions from the container
    const rect = svg.getBoundingClientRect()
    clone.setAttribute("width", String(rect.width))
    clone.setAttribute("height", String(rect.height))

    const svgStr = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgStr], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = rect.width
      canvas.height = rect.height
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return
        const a = document.createElement("a")
        a.href = URL.createObjectURL(pngBlob)
        a.download = `${title}.png`
        a.click()
      }, "image/png")
    }
    img.src = url
  }

  return (
    <TooltipProvider delay={300}>
      <div className="h-screen w-screen bg-white relative overflow-hidden">
        {/* Stamp canvas */}
        <StampCanvas
          activeTool={activeTool}
          selectedShapeId={selectedShapeId}
          inkColor={inkColor}
          svgRef={svgRef}
        />

        {/* Toolbar */}
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
          }}
          shapesOpen={shapesOpen}
          onShapesOpenChange={setShapesOpen}
          colorOpen={colorOpen}
          onColorOpenChange={setColorOpen}
        />

        {/* Title bar + export — top left */}
        <div className="absolute top-6 left-6 flex items-center gap-2">
          {/* Download icon button */}
          <button
            onClick={handleExport}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid #e4e4e7",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Download size={16} color="#18181b" />
          </button>

          {/* Title pill */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") cancelTitle()
              }}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 14,
                fontWeight: 500,
                color: "#09090b",
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                padding: "0 8px",
                height: 32,
                outline: "none",
                boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
                minWidth: 160,
              }}
            />
          ) : (
            <button
              onClick={startEditingTitle}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 14,
                fontWeight: 500,
                color: "#09090b",
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                padding: "0 8px",
                height: 32,
                cursor: "text",
                boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </button>
          )}
        </div>

        {/* Shortcuts panel + ? button — bottom right */}
        <div ref={shortcutsPanelRef} className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
          {showShortcuts && <ShortcutsPanel />}
          <button
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
          </button>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
