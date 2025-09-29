import React from 'react'
import { versionService, VersionInfo } from '../services/versionService'

export function VersionBadge() {
  const [text, setText] = React.useState('')
  const [isVersionMismatch, setIsVersionMismatch] = React.useState(false)
  const [initialVersion, setInitialVersion] = React.useState<VersionInfo | null>(null)

  React.useEffect(() => {
    // Get initial version
    versionService.getVersionInfo().then(v => {
      const parts = []
      if (v.monorepoVersion) parts.push(`repo:${v.monorepoVersion}`)
      if (v.frontendVersion) parts.push(`frontend:${v.frontendVersion}`)
      if (v.sdkVersion) parts.push(`sdk:${v.sdkVersion}`)
      setText(parts.length > 0 ? parts.join(' | ') : '')
      setInitialVersion(v)
    }).catch(() => setText(''))

    // Listen for version updates from SSE
    const unsubscribe = versionService.onVersionUpdate((newVersion) => {
      if (initialVersion) {
        const hasVersionChanged = 
          initialVersion.monorepoVersion !== newVersion.monorepoVersion ||
          initialVersion.frontendVersion !== newVersion.frontendVersion ||
          initialVersion.sdkVersion !== newVersion.sdkVersion
        
        setIsVersionMismatch(hasVersionChanged)
      }
    })

    return unsubscribe
  }, [initialVersion])

  if (!text) return null
  return (
    <div className={`px-2 py-1 rounded text-xs ${
      isVersionMismatch 
        ? 'bg-red-100 text-red-600 border border-red-200' 
        : 'bg-gray-100 text-gray-600'
    }`}>
      {text}
    </div>
  )
}
