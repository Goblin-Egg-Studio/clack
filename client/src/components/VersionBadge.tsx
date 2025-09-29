import React from 'react'
import { versionService } from '../services/versionService'

export function VersionBadge() {
  const [text, setText] = React.useState('')

  React.useEffect(() => {
    versionService.getVersionInfo().then(v => {
      const parts = []
      if (v.monorepoVersion) parts.push(`repo:${v.monorepoVersion}`)
      if (v.clientVersion) parts.push(`client:${v.clientVersion}`)
      setText(parts.length > 0 ? parts.join(' | ') : '')
    }).catch(() => setText(''))
  }, [])

  if (!text) return null
  return (
    <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
      {text}
    </div>
  )
}
