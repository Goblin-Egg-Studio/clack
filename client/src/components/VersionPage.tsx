import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { versionService } from '../services/versionService'

export function VersionPage() {
  const [versionInfo, setVersionInfo] = useState<{
    monorepoVersion: string | null
    clientVersion: string | null
    name: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const info = await versionService.getVersionInfo()
        setVersionInfo(info)
      } catch (err) {
        setError('Failed to load version information')
        console.error('Version fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVersion()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading version information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700">← Back to Chat</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Version Information</h2>
            <p className="text-sm text-gray-600">Application and system details</p>
          </div>
          <Link to="/" className="text-blue-600 hover:text-blue-700">← Back to Chat</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-semibold text-gray-900">Application Versions</h3>
        </div>
        <div className="px-6 py-6">
          {versionInfo ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-900">Application Name</span>
                <span className="text-sm text-gray-600">{versionInfo.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-900">Monorepo Version</span>
                <span className="text-sm text-gray-600">{versionInfo.monorepoVersion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-900">Frontend Version</span>
                <span className="text-sm text-gray-600">{versionInfo.frontendVersion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-900">SDK Version</span>
                <span className="text-sm text-gray-600">{versionInfo.sdkVersion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-900">Last Updated</span>
                <span className="text-sm text-gray-600">{new Date().toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No version information available</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-semibold text-gray-900">System Information</h3>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">User Agent</span>
              <span className="text-sm text-gray-600 font-mono text-xs break-all">{navigator.userAgent}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">Platform</span>
              <span className="text-sm text-gray-600">{navigator.platform}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">Language</span>
              <span className="text-sm text-gray-600">{navigator.language}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-900">Online Status</span>
              <span className="text-sm text-gray-600">{navigator.onLine ? '🟢 Online' : '🔴 Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
