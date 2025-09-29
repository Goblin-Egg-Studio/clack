export interface VersionInfo {
  monorepoVersion: string | null
  frontendVersion: string | null
  sdkVersion: string | null
  name: string | null
}

class VersionService {
  private cached: VersionInfo | null = null
  private inflight: Promise<VersionInfo> | null = null
  private listeners: Set<(version: VersionInfo) => void> = new Set()

  async getVersionInfo(): Promise<VersionInfo> {
    if (this.cached) return this.cached
    if (this.inflight) return this.inflight
    this.inflight = fetch('/__version')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to fetch version')
        return r.json()
      })
      .then((data: VersionInfo) => {
        this.cached = data
        return data
      })
      .finally(() => {
        this.inflight = null
      })
    return this.inflight
  }

  // Method to update version from SSE stream
  updateVersionFromSSE(version: VersionInfo): void {
    this.cached = version
    this.listeners.forEach(listener => listener(version))
  }

  // Method to subscribe to version updates
  onVersionUpdate(listener: (version: VersionInfo) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export const versionService = new VersionService()
