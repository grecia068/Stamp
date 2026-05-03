interface ShortcutRowProps {
  label: string
  hint: string
}

function ShortcutRow({ label, hint }: ShortcutRowProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-[6px] rounded-[4px] w-full">
      <span className="flex-1 text-[14px] leading-[20px] text-foreground" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>
        {label}
      </span>
      <span className="text-[12px] leading-[16px] text-muted-foreground opacity-60 shrink-0" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>
        {hint}
      </span>
    </div>
  )
}

interface SectionProps {
  title: string
  rows: { label: string; hint: string }[]
}

function Section({ title, rows }: SectionProps) {
  return (
    <div className="flex flex-col items-start px-1 py-0 w-full shrink-0">
      <div className="flex items-center gap-2 px-2 py-[6px] w-full">
        <span className="text-[12px] leading-[16px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
          {title}
        </span>
      </div>
      {rows.map((r) => (
        <ShortcutRow key={r.label} label={r.label} hint={r.hint} />
      ))}
    </div>
  )
}

function Separator() {
  return <div className="w-full shrink-0 h-px bg-border" />
}

export function ShortcutsPanel() {
  return (
    <div
      className="flex flex-col gap-2 py-1 rounded-lg border border-border bg-background"
      style={{
        width: 347,
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1), 0px 2px 4px rgba(0,0,0,0.06)",
      }}
    >
      <Section
        title="Tool Shortcuts"
        rows={[
          { label: "Select Tool", hint: "V" },
          { label: "Shape Picker", hint: "S" },
          { label: "Color Picker", hint: "C" },
          { label: "Deselect everything", hint: "Esc" },
        ]}
      />
      <Separator />
      <Section
        title="Edit Shortcuts"
        rows={[
          { label: "Undo last action", hint: "Cmd + Z" },
          { label: "Redo", hint: "Cmd + Shift + Z" },
          { label: "Select all", hint: "Cmd + A" },
          { label: "Copy", hint: "Cmd + C" },
          { label: "Paste", hint: "Cmd + V" },
        ]}
      />
      <Separator />
      <Section
        title="Tile Shortcuts"
        rows={[
          { label: "Rotate tile", hint: "R" },
          { label: "Cycle to previous tile", hint: "[" },
          { label: "Cycle to next tile", hint: "]" },
        ]}
      />
    </div>
  )
}
