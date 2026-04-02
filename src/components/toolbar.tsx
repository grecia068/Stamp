import { useState } from "react"
import { MousePointer2, Shapes } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ShapePicker } from "./shape-picker"
import { ColorPicker } from "./color-picker"

interface ToolbarProps {
  activeTool: "select" | "shapes"
  onToolChange: (tool: "select" | "shapes") => void
  selectedShapeId: string
  onShapeSelect: (id: string) => void
  inkColor: string
  inkOpacity: number
  onColorChange: (hex: string, opacity: number) => void
  shapesOpen: boolean
  onShapesOpenChange: (open: boolean) => void
  colorOpen: boolean
  onColorOpenChange: (open: boolean) => void
}

export function Toolbar({
  activeTool,
  onToolChange,
  selectedShapeId,
  onShapeSelect,
  inkColor,
  inkOpacity,
  onColorChange,
  shapesOpen,
  onShapesOpenChange,
  colorOpen,
  onColorOpenChange,
}: ToolbarProps) {
  const [recentColors, setRecentColors] = useState<string[]>([])

  function handleAddRecent(hex: string) {
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c !== hex)
      return [hex, ...filtered].slice(0, 6)
    })
  }

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-lg bg-popover p-2 shadow-md ring-1 ring-foreground/10">
      {/* Select tool */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              pressed={activeTool === "select" && !shapesOpen}
              onPressedChange={() => {
                onToolChange("select")
                onShapesOpenChange(false)
              }}
              size="sm"
              className="h-8 w-8 p-0"
            />
          }
        >
          <MousePointer2 className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Select (V)
        </TooltipContent>
      </Tooltip>

      {/* Shape picker */}
      <Tooltip>
        <Popover open={shapesOpen} onOpenChange={onShapesOpenChange}>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Toggle
                    pressed={activeTool === "shapes" || shapesOpen}
                    onPressedChange={() => {
                      onToolChange("shapes")
                      onShapesOpenChange(true)
                    }}
                    size="sm"
                    className="h-8 w-8 p-0"
                  />
                }
              />
            }
          >
            <Shapes className="h-4 w-4" />
          </TooltipTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-auto p-0 ring-0 shadow-none bg-transparent"
          >
            <ShapePicker
              selectedShapeId={selectedShapeId}
              inkColor={inkColor}
              onSelectShape={(id) => {
                onShapeSelect(id)
                onToolChange("shapes")
              }}
            />
          </PopoverContent>
        </Popover>
        <TooltipContent side="right" className="text-xs">
          Shapes (S)
        </TooltipContent>
      </Tooltip>

      {/* Color picker */}
      <Tooltip>
        <Popover
          open={colorOpen}
          onOpenChange={(open) => {
            if (!open) handleAddRecent(inkColor)
            onColorOpenChange(open)
          }}
        >
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Toggle
                    pressed={colorOpen}
                    size="sm"
                    className="h-8 w-8 p-0"
                  />
                }
              />
            }
          >
            <div
              className="h-5 w-5 rounded-[4px] border border-foreground/10"
              style={{ backgroundColor: inkColor }}
            />
          </TooltipTrigger>
          <PopoverContent
            side="right"
            align="center"
            sideOffset={12}
            className="w-auto p-0 ring-0 shadow-none bg-transparent"
          >
            <ColorPicker
              color={inkColor}
              opacity={inkOpacity}
              recentColors={recentColors}
              onChange={onColorChange}
            />
          </PopoverContent>
        </Popover>
        <TooltipContent side="right" className="text-xs">
          Color (C)
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
