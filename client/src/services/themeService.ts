export type ThemeMode = 'dark' | 'light'
export type ThemeColor = 'blue' | 'red' | 'green' | 'yellow' | 'purple'

const THEME_MODE_STORAGE_KEY = 'clack-theme-mode'
const THEME_COLOR_STORAGE_KEY = 'clack-theme-color'

class ThemeService {
  private currentMode: ThemeMode = 'dark'
  private currentColor: ThemeColor = 'blue'

  init(): void {
    try {
      const savedMode = localStorage.getItem(THEME_MODE_STORAGE_KEY) as ThemeMode | null
      if (savedMode === 'dark' || savedMode === 'light') {
        this.currentMode = savedMode
      } else {
        this.currentMode = 'dark'
      }

      const savedColor = localStorage.getItem(THEME_COLOR_STORAGE_KEY) as ThemeColor | null
      if (savedColor && ['blue', 'red', 'green', 'yellow', 'purple'].includes(savedColor)) {
        this.currentColor = savedColor
      } else {
        this.currentColor = 'blue'
      }
    } catch {
      this.currentMode = 'dark'
      this.currentColor = 'blue'
    }
    this.applyTheme(this.currentMode, this.currentColor)
  }

  getMode(): ThemeMode {
    return this.currentMode
  }

  getColor(): ThemeColor {
    return this.currentColor
  }

  isDark(): boolean {
    return this.currentMode === 'dark'
  }

  setMode(mode: ThemeMode): void {
    this.currentMode = mode
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
    } catch {}
    this.applyTheme(this.currentMode, this.currentColor)
  }

  setColor(color: ThemeColor): void {
    this.currentColor = color
    try {
      localStorage.setItem(THEME_COLOR_STORAGE_KEY, color)
    } catch {}
    this.applyTheme(this.currentMode, this.currentColor)
  }

  toggleMode(): ThemeMode {
    const next: ThemeMode = this.currentMode === 'dark' ? 'light' : 'dark'
    this.setMode(next)
    return next
  }

  private applyTheme(mode: ThemeMode, color: ThemeColor): void {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.setAttribute('data-color', color)
  }
}

export const themeService = new ThemeService()

