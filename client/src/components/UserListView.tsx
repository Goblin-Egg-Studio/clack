import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function UserListView() {
  const navigate = useNavigate()
  const { currentUser, users, startChat } = useClackContext()

  const handleStartChat = async (userId: number) => {
    try {
      await startChat(userId)
      // Navigate to the chat
      navigate(`/chat/${userId}`)
    } catch (error: any) {
      console.error('Failed to start chat:', error)
      alert(error.message || 'Failed to start chat')
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Start New Chat</h2>
        <p className="text-sm text-gray-600">Click on a user to start a conversation</p>
      </div>
      
      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-6">
        {users.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users
              .filter(user => user.id !== currentUser?.id)
              .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleStartChat(user.id)}
                        className="w-full text-left p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
