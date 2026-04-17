import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

// --- Color math ---

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100; v /= 100
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)]
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [h, max === 0 ? 0 : (d / max) * 100, max * 100]
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : null
}

// --- Slider ---

interface SliderProps {
  value: number // 0–1
  onChange: (v: number) => void
  onCommit?: () => void
  className?: string
  trackStyle: React.CSSProperties
  thumbBg: string
}

function Slider({ value, onChange, onCommit, className, trackStyle, thumbBg }: SliderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const read = useCallback(
    (e: React.PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
    },
    [onChange]
  )

  return (
    <div
      ref={ref}
      className={cn("relative h-3 rounded-full cursor-pointer select-none", className)}
      style={trackStyle}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        read(e)
      }}
      onPointerMove={(e) => {
        if (dragging.current) read(e)
      }}
      onPointerUp={(e) => {
        dragging.current = false
        read(e)
        onCommit?.()
      }}
    >
      <div
        className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{
          left: `${value * 100}%`,
          transform: "translate(-50%, -50%)",
          backgroundColor: thumbBg,
        }}
      />
    </div>
  )
}

// --- ColorPicker ---

interface ColorPickerProps {
  color: string      // hex
  opacity: number    // 0–100
  recentColors: string[]
  onChange: (hex: string, opacity: number) => void
}

export function ColorPicker({
  color,
  opacity,
  recentColors,
  onChange,
}: ColorPickerProps) {
  // Initialise internal HSV from the incoming hex once
  const init = parseHex(color) ?? [88, 130, 217]
  const [initH, initS, initV] = rgbToHsv(...init)

  const [hue, setHue] = useState(initH)
  const [sat, setSat] = useState(initS)
  const [bri, setBri] = useState(initV)
  const [alpha, setAlpha] = useState(opacity)
  const [hexInput, setHexInput] = useState(color.replace("#", "").toUpperCase())
  const [alphaInput, setAlphaInput] = useState(String(Math.round(opacity)))

  const gradientRef = useRef<HTMLDivElement>(null)
  const gradientDragging = useRef(false)

  // Current computed values
  const [r, g, b] = hsvToRgb(hue, sat, bri)
  const currentHex = toHex(r, g, b)
  const pureHue = toHex(...hsvToRgb(hue, 100, 100))

  function commit(hex: string, a: number) {
    onChange(hex, a)
  }

  function syncFromHsv(h: number, s: number, v: number) {
    const [nr, ng, nb] = hsvToRgb(h, s, v)
    const hex = toHex(nr, ng, nb)
    setHexInput(hex.replace("#", "").toUpperCase())
    commit(hex, alpha)
  }

  // Gradient square interaction
  function readGradient(e: React.PointerEvent) {
    const rect = gradientRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const newSat = x * 100
    const newBri = (1 - y) * 100
    setSat(newSat)
    setBri(newBri)
    syncFromHsv(hue, newSat, newBri)
  }

  // Opacity slider track: checkerboard + gradient overlay via multiple backgrounds
  const opacityTrackStyle: React.CSSProperties = {
    backgroundImage: [
      `linear-gradient(to right, rgba(${r},${g},${b},0), rgba(${r},${g},${b},1))`,
      `linear-gradient(45deg, #d4d4d4 25%, transparent 25%)`,
      `linear-gradient(-45deg, #d4d4d4 25%, transparent 25%)`,
      `linear-gradient(45deg, transparent 75%, #d4d4d4 75%)`,
      `linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)`,
    ].join(", "),
    backgroundSize: `100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px`,
    backgroundPosition: `0 0, 0 0, 0 4px, 4px -4px, -4px 0px`,
  }

  return (
    <div className="w-[240px] rounded-xl bg-popover p-3 shadow-md ring-1 ring-foreground/10 space-y-3 overflow-hidden">
      {/* Gradient square */}
      <div
        ref={gradientRef}
        className="relative w-full rounded-lg cursor-crosshair overflow-hidden select-none"
        style={{
          height: 148,
          background: `linear-gradient(to right, white, ${pureHue})`,
        }}
        onPointerDown={(e) => {
          gradientDragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          readGradient(e)
        }}
        onPointerMove={(e) => {
          if (gradientDragging.current) readGradient(e)
        }}
        onPointerUp={(e) => {
          gradientDragging.current = false
          readGradient(e)
        }}
      >
        {/* Darkness overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, black)" }}
        />
        {/* Cursor dot */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
          style={{
            left: `${sat}%`,
            top: `${100 - bri}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: currentHex,
          }}
        />
      </div>

      {/* Hue slider */}
      <Slider
        value={hue / 360}
        onChange={(v) => {
          const newHue = v * 360
          setHue(newHue)
          syncFromHsv(newHue, sat, bri)
        }}
        trackStyle={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        thumbBg={pureHue}
      />

      {/* Opacity slider */}
      <Slider
        value={alpha / 100}
        onChange={(v) => {
          const newAlpha = Math.round(v * 100)
          setAlpha(newAlpha)
          setAlphaInput(String(newAlpha))
          commit(currentHex, newAlpha)
        }}
        trackStyle={opacityTrackStyle}
        thumbBg={`rgba(${r},${g},${b},${alpha / 100})`}
      />

      {/* Inputs row */}
      <div className="flex items-center gap-2">
        {/* Hex input */}
        <div className="flex items-center gap-1 flex-1 min-w-0 bg-muted rounded-md px-2 py-1">
          <span className="text-xs text-muted-foreground font-mono">#</span>
          <input
            className="flex-1 min-w-0 text-xs font-mono bg-transparent outline-none uppercase"
            value={hexInput}
            maxLength={6}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={() => {
              const rgb = parseHex(hexInput)
              if (rgb) {
                const [nr, ng, nb] = rgb
                const [nh, ns, nv] = rgbToHsv(nr, ng, nb)
                setHue(nh)
                setSat(ns)
                setBri(nv)
                const hex = toHex(nr, ng, nb)
                commit(hex, alpha)
              } else {
                // Reset to current valid hex
                setHexInput(currentHex.replace("#", "").toUpperCase())
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
          />
        </div>

        {/* Opacity input */}
        <div className="flex-none flex items-center gap-0.5 bg-muted rounded-md px-2 py-1">
          <input
            className="w-8 text-xs font-mono bg-transparent outline-none text-right"
            value={alphaInput}
            onChange={(e) => setAlphaInput(e.target.value)}
            onBlur={() => {
              const v = Math.max(0, Math.min(100, parseInt(alphaInput) || 0))
              setAlpha(v)
              setAlphaInput(String(v))
              commit(currentHex, v)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">Recent colors</p>
          <div className="flex gap-1.5">
            {recentColors.map((c, i) => (
              <button
                key={i}
                title={c}
                className="w-6 h-6 rounded-full border border-foreground/10 cursor-pointer hover:scale-110 hover:ring-2 hover:ring-zinc-400 hover:ring-offset-1 transition-all flex-none"
                style={{ backgroundColor: c }}
                onMouseDown={(e) => {
                  // Handle on mousedown (not click) so the action fires before
                  // Base UI's dismiss handler can close the popup.
                  e.stopPropagation()
                  e.preventDefault()
                  const rgb = parseHex(c)
                  if (!rgb) return
                  const [nr, ng, nb] = rgb
                  const [nh, ns, nv] = rgbToHsv(nr, ng, nb)
                  setHue(nh)
                  setSat(ns)
                  setBri(nv)
                  setHexInput(c.replace("#", "").toUpperCase())
                  commit(c, alpha)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
