import { useState } from "react"
import type { CSSProperties } from "react"
import { Plus, Trash2, X } from "lucide-react"
import type { SavedPiece } from "@/lib/storage"

// ── Layout constants (from Figma) ─────────────────────────────────────────────

const CARD_W   = 328
const CARD_H   = 187
const OVERLAP  = 64
const ROW_SIZE = 5

const SHADOW_MD = "0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.06)"
const SHADOW_LG = "0px 10px 15px rgba(0,0,0,0.1), 0px 4px 6px rgba(16,24,40,0.1)"
const BASE_TR   = "transform 200ms ease-out, box-shadow 200ms ease-out, opacity 200ms ease-out"

// ── Types ─────────────────────────────────────────────────────────────────────

interface HomeScreenProps {
  pieces: SavedPiece[]
  onNewPiece: () => void
  onOpenPiece: (id: string) => void
  onDeletePiece: (id: string) => void
}

type RowItem = { type: "new" } | { type: "piece"; piece: SavedPiece }

// ── HomeScreen ─────────────────────────────────────────────────────────────────

export function HomeScreen({ pieces, onNewPiece, onOpenPiece, onDeletePiece }: HomeScreenProps) {
  const [hoveredCard,    setHoveredCard]    = useState<{ row: number; card: number } | null>(null)
  const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId,     setDeletingId]     = useState<string | null>(null)
  const [openingId,      setOpeningId]      = useState<string | null>(null)

  // Build rows: first item in row 0 is always the "New piece" button
  const allItems: RowItem[] = [
    { type: "new" },
    ...pieces.map((p) => ({ type: "piece" as const, piece: p })),
  ]
  const rows: RowItem[][] = []
  for (let i = 0; i < allItems.length; i += ROW_SIZE) {
    rows.push(allItems.slice(i, i + ROW_SIZE))
  }

  // ── Dynamic card style (hover fan-out, delete, open) ──────────────────────

  function getCardDynStyle(rowIdx: number, cardIdx: number, pieceId?: string): CSSProperties {
    if (pieceId && deletingId === pieceId) {
      return {
        transform: "scale(0.8) rotate(5deg)",
        opacity: 0,
        pointerEvents: "none",
        transition: "transform 300ms ease-in, opacity 300ms ease-in",
      }
    }
    if (pieceId && openingId === pieceId) {
      return {
        transform: "scale(1.08) translateY(-16px)",
        opacity: 0,
        zIndex: 1000,
        transition: "transform 200ms ease-in, opacity 200ms ease-in",
      }
    }
    if (!hoveredCard || hoveredCard.row !== rowIdx || cardIdx !== hoveredCard.card) {
      return { transition: BASE_TR }
    }
    return { transform: "scale(1.04) translateY(-8px)", boxShadow: SHADOW_LG, zIndex: 999, transition: BASE_TR }
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleOpen(id: string) {
    if (openingId || deletingId) return
    setOpeningId(id)
    setTimeout(() => onOpenPiece(id), 200)
  }

  function handleDeleteConfirm() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeletingId(id)
    setTimeout(() => {
      onDeletePiece(id)
      setDeletingId(null)
    }, 300)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#ffffff", overflowX: "hidden", overflowY: "auto" }}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Logo */}
        <img src="/assets/Logo.svg" alt="TilePress" style={{ height: 37, width: "auto", display: "block" }} />

        {/* Stacked rows */}
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{ display: "flex", isolation: "isolate", alignItems: "center", paddingRight: OVERLAP }}
          >
            {row.map((item, cardIdx) => {
              const zBase       = row.length - cardIdx
              const isThisCard  = hoveredCard?.row === rowIdx && hoveredCard?.card === cardIdx

              if (item.type === "new") {
                const dynStyle = getCardDynStyle(rowIdx, cardIdx)
                return (
                  <button
                    key="new"
                    onClick={onNewPiece}
                    onMouseEnter={() => setHoveredCard({ row: rowIdx, card: cardIdx })}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      width: CARD_W, height: CARD_H, flexShrink: 0,
                      marginRight: -OVERLAP, borderRadius: 8,
                      border: "1px solid #e4e4e7", background: "#ffffff",
                      boxShadow: SHADOW_MD, zIndex: zBase,
                      position: "relative", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                      animation: isThisCard ? "none" : "pulse-border 2.5s ease-in-out infinite",
                      ...dynStyle,
                    }}
                  >
                    <Plus size={24} color="#71717a" />
                  </button>
                )
              }

              // ── Piece card ────────────────────────────────────────────────
              const { piece } = item
              const dynStyle  = getCardDynStyle(rowIdx, cardIdx, piece.id)
              const date      = new Date(piece.updatedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })

              return (
                <div
                  key={piece.id}
                  onClick={() => handleOpen(piece.id)}
                  onMouseEnter={() => setHoveredCard({ row: rowIdx, card: cardIdx })}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    width: CARD_W, height: CARD_H, flexShrink: 0,
                    marginRight: -OVERLAP, borderRadius: 8,
                    border: "1px solid #e4e4e7", background: "#f4f4f5",
                    boxShadow: SHADOW_MD, zIndex: zBase,
                    position: "relative", overflow: "hidden",
                    cursor: "pointer", ...dynStyle,
                  }}
                >
                  {/* Cover thumbnail */}
                  {piece.thumbnail && (
                    <img
                      src={piece.thumbnail}
                      alt={piece.title}
                      loading="lazy"
                      style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover", borderRadius: 8,
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Bottom gradient + meta + delete — hidden by default, fades in on card hover */}
                  <div
                    style={{
                      position: "absolute", inset: 0, borderRadius: 8,
                      background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 60%)",
                      display: "flex", alignItems: "flex-end",
                      justifyContent: "space-between", padding: 16,
                      opacity: isThisCard ? 1 : 0,
                      transition: "opacity 150ms ease-out",
                    }}
                  >
                    {/* Title + date */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500,
                        color: "#09090b", lineHeight: "20px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: 220,
                      }}>
                        {piece.title}
                      </span>
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 400,
                        color: "#71717a", lineHeight: "20px",
                      }}>
                        {date}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(piece.id) }}
                      onMouseEnter={() => setHoveredDeleteId(piece.id)}
                      onMouseLeave={() => setHoveredDeleteId(null)}
                      style={{
                        width: 32, height: 32, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: hoveredDeleteId === piece.id ? "#f4f4f5" : "transparent",
                        border: "none", borderRadius: 8,
                        cursor: "pointer", padding: 8,
                        transform: hoveredDeleteId === piece.id ? "scale(1.05)" : "scale(1)",
                        transition: "background 100ms ease-out, transform 100ms ease-out",
                      }}
                    >
                      <Trash2 size={16} color="#71717a" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <DeleteDialog
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}

// ── DeleteDialog ───────────────────────────────────────────────────────────────

function DeleteDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 451, background: "#ffffff",
          borderRadius: 8, border: "1px solid #e4e4e7",
          boxShadow: "0px 10px 15px rgba(0,0,0,0.1), 0px 4px 6px rgba(16,24,40,0.1)",
          padding: 24, position: "relative",
          display: "flex", flexDirection: "column", gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={onCancel}
          style={{
            position: "absolute", top: 11, right: 12,
            width: 24, height: 24, padding: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none",
            cursor: "pointer", color: "#71717a",
          }}
        >
          <X size={16} />
        </button>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{
            margin: 0, fontSize: 18, fontWeight: 600,
            color: "#09090b", lineHeight: "28px",
            fontFamily: "'DM Mono', monospace",
          }}>
            Delete this piece?
          </p>
          <p style={{
            margin: 0, fontFamily: "'DM Mono', monospace",
            fontSize: 14, fontWeight: 400,
            color: "#71717a", lineHeight: "20px",
          }}>
            It will be gone forever. Like, actually forever
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: "0 16px",
              background: "transparent", border: "1px solid #e4e4e7",
              borderRadius: 8, fontFamily: "'DM Mono', monospace",
              fontSize: 14, fontWeight: 500,
              color: "#09090b", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: "0 16px",
              background: "#dc2626", border: "none",
              borderRadius: 8, fontFamily: "'DM Mono', monospace",
              fontSize: 14, fontWeight: 500,
              color: "#fafafa", cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
