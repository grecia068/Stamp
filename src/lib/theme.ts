import { useState, useEffect } from "react"

export type Theme = "light" | "dark"

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem("tilepress-theme")
    if (v === "light" || v === "dark") return v
  } catch { /* localStorage unavailable */ }
  return null
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark")
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = readStored() ?? systemTheme()
    applyTheme(t)
    return t
  })

  // Keep in sync with OS preference changes when no explicit preference is stored
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      if (!readStored()) {
        const t: Theme = e.matches ? "dark" : "light"
        applyTheme(t)
        setThemeState(t)
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  function setTheme(t: Theme) {
    try { localStorage.setItem("tilepress-theme", t) } catch { /* ignore */ }
    applyTheme(t)
    setThemeState(t)
  }

  return { theme, setTheme }
}
