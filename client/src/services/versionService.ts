export interface VersionInfo {
  monorepoVersion: string | null
  clientVersion: string | null
  name: string | null
}

class VersionService {
  private cached: VersionInfo | null = null
  private inflight: Promise<VersionInfo> | null = null

  async getVersion(): Promise<VersionInfo> {
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
}

export const versionService = new VersionService()
