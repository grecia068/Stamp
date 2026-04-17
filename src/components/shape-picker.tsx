import { cn } from "@/lib/utils"
import { TILE_SHAPES } from "./tile-shapes"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ShapePickerProps {
  selectedShapeId: string
  inkColor: string
  onSelectShape: (shapeId: string) => void
}

export function ShapePicker({ selectedShapeId, inkColor, onSelectShape }: ShapePickerProps) {
  return (
    <div className="rounded-xl bg-popover p-2 shadow-md ring-1 ring-foreground/10">
      <div className="grid grid-cols-4 gap-2">
        {TILE_SHAPES.map((shape) => {
          const isSelected = shape.id === selectedShapeId
          return (
            <Tooltip key={shape.id}>
              <TooltipTrigger
                className={cn(
                  "w-14 h-14 rounded-lg flex items-center justify-center transition-colors cursor-pointer border border-foreground/10",
                  isSelected
                    ? "bg-blue-50 ring-2 ring-blue-400"
                    : "bg-muted hover:bg-foreground/5"
                )}
                onClick={() => onSelectShape(shape.id)}
              >
                {shape.render(inkColor)}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {shape.name}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
