import React from "react"

// Stable module-level constants so <image href> is never recomputed
const T6  = "/assets/Tile6%20new.svg"
const T1  = "/assets/Tile1%20new.svg"
const T2  = "/assets/Tile2%20new.svg"
const T11 = "/assets/Tile11%20new.svg"
const T7  = "/assets/Tile7%20new.svg"
const T9  = "/assets/Tile9%20new.svg"
const T8  = "/assets/Tile8%20new.svg"
const T10 = "/assets/Tile10%20new.svg"
const T4  = "/assets/Tile4%20new.svg"
const T3  = "/assets/Tile3%20new.svg"
const T5  = "/assets/Tile5%20new.svg"

export interface TileShape {
  id: string
  name: string
  pxW: number
  pxH: number
  textureUrl: string
  viewBox: string
  render: (color: string) => React.ReactNode
}

// Picker order matches Figma layout (4 cols, row by row):
// Row 1: tile6, tile1, tile2, tile11
// Row 2: tile7, tile9, tile8, tile10
// Row 3: tile4, tile3, tile5
export const TILE_SHAPES: TileShape[] = [
  // ── Row 1 ────────────────────────────────────────────────────────────────
  {
    id: "tile6-new",
    name: "Square",
    pxW: 58,
    pxH: 58,
    textureUrl: T6,
    viewBox: "0 0 58 58",
    render: (color) => (
      <svg viewBox="0 0 58 58" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M1 1H57V57H1V1Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile1-new",
    name: "Circle",
    pxW: 58,
    pxH: 58,
    textureUrl: T1,
    viewBox: "0 0 58 58",
    render: (color) => (
      <svg viewBox="0 0 58 58" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <circle cx="29" cy="29" r="28" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile2-new",
    name: "Semicircle",
    pxW: 58,
    pxH: 29,
    textureUrl: T2,
    viewBox: "0 0 58 29",
    render: (color) => (
      <svg viewBox="0 0 58 29" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M57 28C57 24.4543 56.2758 20.9433 54.8686 17.6675C53.4615 14.3918 51.399 11.4153 48.799 8.90812C46.1989 6.40093 43.1123 4.41213 39.7151 3.05525C36.318 1.69838 32.677 1 29 1C25.323 1 21.682 1.69838 18.2849 3.05525C14.8877 4.41213 11.801 6.40094 9.20101 8.90812C6.60097 11.4153 4.5385 14.3918 3.13137 17.6675C1.72424 20.9433 1 24.4543 1 28L57 28Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile11-new",
    name: "Triangle",
    pxW: 58,
    pxH: 58,
    textureUrl: T11,
    viewBox: "0 0 58 58",
    render: (color) => (
      <svg viewBox="0 0 58 58" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M1 57H57L1 1V57Z" fill={color} />
      </svg>
    ),
  },

  // ── Row 2 ────────────────────────────────────────────────────────────────
  {
    id: "tile7-new",
    name: "Rectangle",
    pxW: 116,
    pxH: 58,
    textureUrl: T7,
    viewBox: "0 0 116 58",
    render: (color) => (
      <svg viewBox="0 0 116 58" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M115 1L115 57L0.999998 57L1 0.999995L115 1Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile9-new",
    name: "Quarter Circle",
    pxW: 58,
    pxH: 58,
    textureUrl: T9,
    viewBox: "0 0 58 58",
    render: (color) => (
      <svg viewBox="0 0 58 58" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M57 1C57 8.35402 55.5515 15.636 52.7373 22.4303C49.923 29.2245 45.7981 35.3979 40.598 40.598C35.3979 45.7981 29.2245 49.923 22.4303 52.7373C15.636 55.5515 8.35402 57 1 57L1 1H57Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile8-new",
    name: "Bowl",
    pxW: 58,
    pxH: 58,
    textureUrl: T8,
    viewBox: "0 0 58 58",
    render: (color) => (
      <svg viewBox="0 0 58 58" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M1 1H57V29C57 44.464 44.464 57 29 57C13.536 57 1 44.464 1 29V1Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile10-new",
    name: "Thin Rectangle",
    pxW: 116,
    pxH: 29,
    textureUrl: T10,
    viewBox: "0 0 116 29",
    render: (color) => (
      <svg viewBox="0 0 116 29" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M115 1L115 28L0.999999 28L1 0.999995L115 1Z" fill={color} />
      </svg>
    ),
  },

  // ── Row 3 ────────────────────────────────────────────────────────────────
  {
    id: "tile4-new",
    name: "Bowl Wide",
    pxW: 116,
    pxH: 59,
    textureUrl: T4,
    viewBox: "0 0 116 59",
    render: (color) => (
      <svg viewBox="0 0 116 59" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M115 1C115 8.48535 113.526 15.8974 110.661 22.813C107.797 29.7285 103.598 36.0122 98.3051 41.3051C93.0121 46.598 86.7285 50.7966 79.813 53.6611C72.8974 56.5257 65.4853 58 58 58C50.5147 58 43.1026 56.5256 36.187 53.6611C29.2715 50.7966 22.9879 46.598 17.6949 41.3051C12.402 36.0121 8.20338 29.7285 5.33887 22.813C2.47435 15.8974 0.999999 8.48534 1 1L115 1Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile3-new",
    name: "Quarter Circle Large",
    pxW: 116,
    pxH: 116,
    textureUrl: T3,
    viewBox: "0 0 116 116",
    render: (color) => (
      <svg viewBox="0 0 116 116" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M115 1C115 15.9707 112.051 30.7948 106.322 44.6259C100.593 58.457 92.196 71.0243 81.6102 81.6102C71.0243 92.196 58.457 100.593 44.6259 106.322C30.7948 112.051 15.9707 115 1 115V59C8.48295 59 17.0867 57.8636 24 55C30.9133 52.1364 36.7088 47.2912 42 42C47.2912 36.7088 52.1364 29.9133 55 23C57.8636 16.0867 59 8.48295 59 1H115Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "tile5-new",
    name: "Large Arc",
    pxW: 174,
    pxH: 174,
    textureUrl: T5,
    viewBox: "0 0 174 174",
    render: (color) => (
      <svg viewBox="0 0 174 174" width="40" height="40" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M173 1C173 23.5874 168.551 45.9536 159.907 66.8216C151.263 87.6896 138.594 106.651 122.622 122.622C106.651 138.594 87.6896 151.263 66.8216 159.907C45.9536 168.551 23.5874 173 1 173V117C16.0652 117 31.0816 113.765 45 108C58.9184 102.235 72.3473 93.6527 83 83C93.6527 72.3473 102.235 58.9184 108 45C113.765 31.0816 117 16.0652 117 1H173Z" fill={color} />
      </svg>
    ),
  },
]

export const TILE_SHAPE_MAP = new Map(TILE_SHAPES.map((s) => [s.id, s]))
