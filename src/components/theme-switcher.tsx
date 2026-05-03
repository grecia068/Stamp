import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/lib/theme"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 4,
        background: isDark ? "#27272a" : "#f4f4f5",
        border: `1px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
        borderRadius: 10,
        boxShadow: "0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.08)",
        zIndex: 50,
      }}
    >
      {/* Sliding highlight indicator */}
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: 32,
          height: 32,
          borderRadius: 7,
          background: isDark ? "#3f3f46" : "#ffffff",
          boxShadow: isDark
            ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
            : "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px rgba(0,0,0,0.06)",
          transform: isDark ? "translateX(34px)" : "translateX(0)",
          transition: "transform 200ms ease-out",
          pointerEvents: "none",
        }}
      />

      {/* Sun — light mode */}
      <button
        onClick={() => setTheme("light")}
        style={{
          position: "relative",
          zIndex: 1,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          borderRadius: 7,
          cursor: "pointer",
        }}
      >
        <Sun
          size={16}
          style={{
            color: isDark ? "#71717a" : "#f59e0b",
            transition: "color 150ms ease-out",
          }}
        />
      </button>

      {/* Moon — dark mode */}
      <button
        onClick={() => setTheme("dark")}
        style={{
          position: "relative",
          zIndex: 1,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          borderRadius: 7,
          cursor: "pointer",
        }}
      >
        <Moon
          size={16}
          style={{
            color: isDark ? "#93c5fd" : "#71717a",
            transition: "color 150ms ease-out",
          }}
        />
      </button>
    </div>
  )
}
