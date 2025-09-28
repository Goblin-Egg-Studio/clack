export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'clack-theme'

class ThemeService {
  private currentTheme: ThemeMode = 'dark'

  init(): void {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
      if (saved === 'dark' || saved === 'light') {
        this.currentTheme = saved
      } else {
        this.currentTheme = 'dark'
      }
    } catch {
      this.currentTheme = 'dark'
    }
    this.applyTheme(this.currentTheme)
  }

  getTheme(): ThemeMode {
    return this.currentTheme
  }

  isDark(): boolean {
    return this.currentTheme === 'dark'
  }

  setTheme(mode: ThemeMode): void {
    this.currentTheme = mode
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {}
    this.applyTheme(mode)
  }

  toggleTheme(): ThemeMode {
    const next: ThemeMode = this.currentTheme === 'dark' ? 'light' : 'dark'
    this.setTheme(next)
    return next
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', mode)
  }
}

export const themeService = new ThemeService()
