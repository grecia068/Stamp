import type { Stamp } from "@/components/stamp-canvas"

const STORAGE_KEY = "tilepress-pieces"
const MAX_PIECES = 50
const MAX_PIECE_BYTES = 5 * 1024 * 1024

export interface SavedPiece {
  id: string
  title: string
  stamps: Stamp[]
  createdAt: string
  updatedAt: string
  thumbnail: string
}

export type SaveResult =
  | { success: true }
  | { success: false; error: "quota" | "limit" | "size" }

export function generateId(): string {
  return crypto.randomUUID()
}

export function loadPieces(): SavedPiece[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedPiece[]) : []
  } catch {
    return []
  }
}

function writePieces(pieces: SavedPiece[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces))
    return true
  } catch {
    return false
  }
}

export function savePiece(piece: SavedPiece): SaveResult {
  const serialized = JSON.stringify(piece)
  if (serialized.length * 2 > MAX_PIECE_BYTES) {
    return { success: false, error: "size" }
  }
  const pieces = loadPieces()
  const idx = pieces.findIndex((p) => p.id === piece.id)
  if (idx !== -1) {
    pieces[idx] = piece
  } else {
    if (pieces.length >= MAX_PIECES) return { success: false, error: "limit" }
    pieces.push(piece)
  }
  return writePieces(pieces) ? { success: true } : { success: false, error: "quota" }
}

export function deletePiece(id: string): void {
  writePieces(loadPieces().filter((p) => p.id !== id))
}

export function generateThumbnail(canvas: HTMLCanvasElement): string {
  const MAX_W = 200, MAX_H = 150
  const aspect = canvas.width / canvas.height
  const w = aspect > MAX_W / MAX_H ? MAX_W : Math.round(MAX_H * aspect)
  const h = aspect > MAX_W / MAX_H ? Math.round(MAX_W / aspect) : MAX_H
  const thumb = document.createElement("canvas")
  thumb.width = w
  thumb.height = h
  const ctx = thumb.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(canvas, 0, 0, w, h)
  return thumb.toDataURL("image/png")
}
