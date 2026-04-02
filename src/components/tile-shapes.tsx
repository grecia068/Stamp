import React from "react"

export interface TileShape {
  id: string
  name: string
  pxW: number                                 // texture SVG width (includes filter bleed)
  pxH: number                                 // texture SVG height (includes filter bleed)
  textureUrl: string                          // path to baked texture SVG (served from /assets/)
  viewBox: string                             // viewBox of the plain shape (for ghost preview)
  inner: (color: string) => React.ReactNode  // raw SVG child elements for ghost preview
  render: (color: string) => React.ReactNode // 32x32 thumbnail for the shape picker
}

// Tiles in Figma grid order: tile6, Tile, Tile2, Tile7, Tile9, Tile8, Tile4, Tile3, Tile5
export const TILE_SHAPES: TileShape[] = [
  {
    id: "square",
    name: "Square",
    pxW: 58,
    pxH: 58,
    textureUrl: "/assets/Tile6-texture.svg",
    viewBox: "0 0 56 56",
    inner: (color) => <rect width="56" height="56" fill={color} />,
    render: (color) => (
      <svg viewBox="0 0 56 56" width="32" height="32" fill="none">
        <rect width="56" height="56" fill={color} />
      </svg>
    ),
  },
  {
    id: "circle",
    name: "Circle",
    pxW: 58,
    pxH: 58,
    textureUrl: "/assets/Tile-texture.svg",
    viewBox: "0 0 56 56",
    inner: (color) => <circle cx="28" cy="28" r="28" fill={color} />,
    render: (color) => (
      <svg viewBox="0 0 56 56" width="32" height="32" fill="none">
        <circle cx="28" cy="28" r="28" fill={color} />
      </svg>
    ),
  },
  {
    id: "half-circle",
    name: "Half Circle",
    pxW: 58,
    pxH: 30,
    textureUrl: "/assets/Tile2-texture.svg",
    viewBox: "0 0 56 28",
    inner: (color) => (
      <path d="M56 28C56 24.323 55.2758 20.682 53.8686 17.2849C52.4615 13.8877 50.399 10.8011 47.799 8.20101C45.1989 5.60097 42.1123 3.5385 38.7151 2.13137C35.318 0.724241 31.677 0 28 0C24.323 0 20.682 0.724242 17.2849 2.13137C13.8877 3.53851 10.801 5.60097 8.20101 8.20101C5.60097 10.8011 3.5385 13.8877 2.13137 17.2849C0.724241 20.682 0 24.323 0 28L28 28H56Z" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 56 28" width="32" height="32" preserveAspectRatio="xMidYMid meet" fill="none">
        <path d="M56 28C56 24.323 55.2758 20.682 53.8686 17.2849C52.4615 13.8877 50.399 10.8011 47.799 8.20101C45.1989 5.60097 42.1123 3.5385 38.7151 2.13137C35.318 0.724241 31.677 0 28 0C24.323 0 20.682 0.724242 17.2849 2.13137C13.8877 3.53851 10.801 5.60097 8.20101 8.20101C5.60097 10.8011 3.5385 13.8877 2.13137 17.2849C0.724241 20.682 0 24.323 0 28L28 28H56Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "rectangle",
    name: "Rectangle",
    pxW: 116,
    pxH: 59,
    textureUrl: "/assets/Tile7-texture.svg",
    viewBox: "0 0 112 56",
    inner: (color) => (
      <rect x="112" width="56" height="112" transform="rotate(90 112 0)" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 112 56" width="32" height="32" preserveAspectRatio="xMidYMid meet" fill="none">
        <rect x="112" width="56" height="112" transform="rotate(90 112 0)" fill={color} />
      </svg>
    ),
  },
  {
    id: "quarter-circle",
    name: "Quarter Circle",
    pxW: 58,
    pxH: 58,
    textureUrl: "/assets/Tile9-texture.svg",
    viewBox: "0 0 56 56",
    inner: (color) => (
      <path d="M56 56C25.0721 56 0 30.9279 0 0H56V56Z" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 56 56" width="32" height="32" fill="none">
        <path d="M56 56C25.0721 56 0 30.9279 0 0H56V56Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "stadium",
    name: "Stadium",
    pxW: 58,
    pxH: 58,
    textureUrl: "/assets/Tile8-texture.svg",
    viewBox: "0 0 56 56",
    inner: (color) => (
      <path d="M0 0H56V28C56 43.464 43.464 56 28 56C12.536 56 0 43.464 0 28V0Z" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 56 56" width="32" height="32" fill="none">
        <path d="M0 0H56V28C56 43.464 43.464 56 28 56C12.536 56 0 43.464 0 28V0Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "wide-half-dome",
    name: "Wide Half Dome",
    pxW: 118,
    pxH: 60,
    textureUrl: "/assets/Tile4-texture.svg",
    viewBox: "0 0 112 56",
    inner: (color) => (
      <path d="M112 0C112 7.35403 110.552 14.636 107.737 21.4303C104.923 28.2245 100.798 34.3979 95.598 39.598C90.3979 44.7981 84.2245 48.923 77.4303 51.7373C70.636 54.5515 63.354 56 56 56C48.646 56 41.364 54.5515 34.5697 51.7373C27.7755 48.923 21.6021 44.7981 16.402 39.598C11.2019 34.3979 7.07701 28.2245 4.26274 21.4303C1.44848 14.636 -6.42909e-07 7.35402 0 -3.8147e-06L56 0H112Z" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 112 56" width="32" height="32" preserveAspectRatio="xMidYMid meet" fill="none">
        <path d="M112 0C112 7.35403 110.552 14.636 107.737 21.4303C104.923 28.2245 100.798 34.3979 95.598 39.598C90.3979 44.7981 84.2245 48.923 77.4303 51.7373C70.636 54.5515 63.354 56 56 56C48.646 56 41.364 54.5515 34.5697 51.7373C27.7755 48.923 21.6021 44.7981 16.402 39.598C11.2019 34.3979 7.07701 28.2245 4.26274 21.4303C1.44848 14.636 -6.42909e-07 7.35402 0 -3.8147e-06L56 0H112Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "quarter-arc",
    name: "Quarter Arc",
    pxW: 126,
    pxH: 126,
    textureUrl: "/assets/Tile3-texture.svg",
    viewBox: "0 0 124 124",
    inner: (color) => (
      <path d="M124 0C124 16.2839 120.793 32.4084 114.561 47.4527C108.329 62.4971 99.1957 76.1668 87.6812 87.6812C76.1668 99.1957 62.4971 108.329 47.4527 114.561C32.4084 120.793 16.2839 124 0 124L2.44445e-06 68.0775C8.94006 68.0775 17.7926 66.3166 26.0521 62.8954C34.3117 59.4742 41.8165 54.4596 48.1381 48.138C54.4596 41.8165 59.4742 34.3117 62.8954 26.0521C66.3166 17.7926 68.0775 8.94006 68.0775 0H124Z" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 124 124" width="32" height="32" fill="none">
        <path d="M124 0C124 16.2839 120.793 32.4084 114.561 47.4527C108.329 62.4971 99.1957 76.1668 87.6812 87.6812C76.1668 99.1957 62.4971 108.329 47.4527 114.561C32.4084 120.793 16.2839 124 0 124L2.44445e-06 68.0775C8.94006 68.0775 17.7926 66.3166 26.0521 62.8954C34.3117 59.4742 41.8165 54.4596 48.1381 48.138C54.4596 41.8165 59.4742 34.3117 62.8954 26.0521C66.3166 17.7926 68.0775 8.94006 68.0775 0H124Z" fill={color} />
      </svg>
    ),
  },
  {
    id: "concentric-arc",
    name: "Concentric Arc",
    pxW: 182,
    pxH: 182,
    textureUrl: "/assets/Tile5-texture.svg",
    viewBox: "0 0 180 180",
    inner: (color) => (
      <path d="M180 0C180 23.6379 175.344 47.0444 166.298 68.883C157.252 90.7216 143.994 110.565 127.279 127.279C110.565 143.994 90.7216 157.252 68.883 166.298C47.0444 175.344 23.6379 180 0 180L2.45311e-06 123.879C16.2681 123.879 32.3769 120.675 47.4066 114.45C62.4363 108.224 76.0927 99.0992 87.596 87.596C99.0992 76.0927 108.224 62.4363 114.45 47.4066C120.675 32.3769 123.879 16.2681 123.879 0H180Z" fill={color} />
    ),
    render: (color) => (
      <svg viewBox="0 0 180 180" width="32" height="32" fill="none">
        <path d="M180 0C180 23.6379 175.344 47.0444 166.298 68.883C157.252 90.7216 143.994 110.565 127.279 127.279C110.565 143.994 90.7216 157.252 68.883 166.298C47.0444 175.344 23.6379 180 0 180L2.45311e-06 123.879C16.2681 123.879 32.3769 120.675 47.4066 114.45C62.4363 108.224 76.0927 99.0992 87.596 87.596C99.0992 76.0927 108.224 62.4363 114.45 47.4066C120.675 32.3769 123.879 16.2681 123.879 0H180Z" fill={color} />
      </svg>
    ),
  },
]
