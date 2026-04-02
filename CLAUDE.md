# TilePress

## What this app is
TilePress is a digital illustration tool inspired by LEGO tile 
printmaking — where you ink physical LEGO pieces and press them 
onto paper to create patterns and artwork.

In TilePress, users:
1. Select a tile shape from the tile picker
2. Pick an ink color
3. Stamp tiles onto a canvas to compose digital artwork

## Tech stack
- React + Vite
- Tailwind CSS
- shadcn/ui (already installed — use this for all UI components)
- HTML5 Canvas for tile rendering

## Design
- Figma is the design source of truth
- The main app frame is called "stamp" — always 
  refer to it for layout and visual style
- shadcn/ui was used as the component library in Figma, 
  so match components as closely as possible

## Project structure
- /assets/tiles/ — SVG files for tile shapes
- /src/components/ — React components

## Canvas sizes (at 300 DPI)
- Square 1:1
- A4 Portrait and Landscape
- US Letter Portrait
- Wide Banner 2:1

## Current build priorities
1. Tile shape picker (in progress)
2. Color/ink selector
3. Stamp canvas

## Conventions
- Build one feature at a time
- Match Figma design exactly before adding functionality
- Use shadcn/ui components throughout
- Keep components small and focused
