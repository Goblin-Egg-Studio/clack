import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function ChatView() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [newMessage, setNewMessage] = useState('')
  const messageInputRef = useRef<HTMLInputElement>(null)

  const {
    currentUser,
    currentChatUser,
    users,
    messages,
    dataTree,
    usernameToId,
    isLoading,
    isSendingMessage,
    isLoadingMore,
    sendMessage,
    selectChat,
    startChat,
    startChatByUsername,
    loadMoreMessages
  } = useClackContext()

  // Load chat when username changes
  useEffect(() => {
    if (username && users.length > 0) {
      // Use the human-friendly helper to start chat by username
      startChatByUsername(username).catch(error => {
        console.error('Failed to start chat with username:', username, error)
        // If user doesn't exist, navigate back to users page
        navigate('/users')
      })
    }
  }, [username, startChatByUsername, users, navigate])

  // Handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop === 0 && !isLoadingMore) {
      loadMoreMessages()
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentChatUser) return
    
    const messageContent = newMessage.trim()
    setNewMessage('')
    
    try {
      await sendMessage(messageContent)
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.message || 'Failed to send message')
    } finally {
      // Always focus the input field after sending (success or error)
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus()
        }
      }, 0)
    }
  }

  // Show loading state if users haven't been loaded yet
  if (users.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  // If no chat user is selected, show the user list
  if (!username) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a User to Chat</h2>
          <p className="text-gray-600">Choose a user from the sidebar or start a new chat</p>
        </div>
      </div>
    )
  }

  // If chat user is loading or not found
  if (!currentChatUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600">This user doesn't exist or you don't have access to chat with them</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Chat with {currentChatUser.username}
        </h2>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" onScroll={handleScroll}>
        {isLoadingMore && (
          <div className="text-center text-gray-500 py-4">
            <p>Loading more messages...</p>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
          </div>
        )}
        {messages.map((msg) => {
          // Get sender name from dataTree or fallback to sender_name
          const senderName = dataTree.users[String(msg.sender_id)]?.name || msg.sender_name || 'Unknown'
          return (
            <div key={msg.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-blue-600">{senderName}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{msg.content}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-6">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <input
            ref={messageInputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSendingMessage}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button 
            type="submit" 
            disabled={isSendingMessage || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSendingMessage ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
