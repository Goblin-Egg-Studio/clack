import React from 'react'
import { Link } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function ProfilePage() {
  const { currentUser } = useClackContext()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Back to Chat"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
            <p className="text-sm text-gray-600 mt-1">Your account details</p>
          </div>

          <div className="px-6 py-6">
            {currentUser ? (
              <div className="space-y-6">
                {/* Debug info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info</h4>
                  <pre className="text-xs text-yellow-700 overflow-auto">
                    {JSON.stringify(currentUser, null, 2)}
                  </pre>
                </div>
                {/* Display Name */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-semibold text-blue-600">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Display Name</h3>
                    <p className="text-2xl font-semibold text-gray-700">{currentUser.username}</p>
                  </div>
                </div>

                {/* User ID */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User ID
                      </label>
                      <p className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-2 rounded">
                        {currentUser.id}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Member Since
                      </label>
                      <p className="text-sm text-gray-600">
                        {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    {currentUser.is_admin ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        User
                      </span>
                    )}
                  </div>
                  {currentUser.is_admin && (
                    <p className="text-sm text-gray-600 mt-2">
                      You have administrative privileges and can delete users from the Users page.
                    </p>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <span className="text-4xl">👤</span>
                  <p className="mt-2">No user information available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
