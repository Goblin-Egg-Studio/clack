import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function RoomChatView() {
  const { roomId } = useParams<{ roomId?: string }>()
  const navigate = useNavigate()
  const [newMessage, setNewMessage] = useState('')
  const messageInputRef = useRef<HTMLInputElement>(null)

  const {
    currentUser,
    currentRoom,
    rooms,
    userRooms,
    messages,
    isLoading,
    isSendingMessage,
    isLoadingMore,
    sendRoomMessage,
    selectRoom,
    joinRoom,
    loadMoreRoomMessages
  } = useClackContext()

  // Load room when roomId changes
  useEffect(() => {
    if (roomId) {
      const id = parseInt(roomId)
      if (!isNaN(id)) {
        const room = rooms.find(r => r.id === id)
        if (room) {
          selectRoom(room)
        } else {
          // If room not found, navigate back to rooms page
          navigate('/rooms')
        }
      }
    } else {
      selectRoom(null as any) // Clear room if no roomId in URL
    }
  }, [roomId, selectRoom, rooms, navigate])

  // Handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop === 0 && !isLoadingMore) {
      loadMoreRoomMessages()
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentRoom) return
    
    const messageContent = newMessage.trim()
    setNewMessage('')
    
    try {
      await sendRoomMessage(messageContent)
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


      // Check if user is in this room
      const isUserInRoom = currentRoom && userRooms.some(room => room.id === currentRoom.id)

      // If no room is selected, show a prompt
      if (!roomId || !currentRoom) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Room to Chat</h2>
              <p className="text-gray-600">Choose a room from the sidebar or browse available rooms</p>
            </div>
          </div>
        )
      }

      // If user is not in the room, show join room button
      if (!isUserInRoom) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{currentRoom.name}</h2>
              <p className="text-gray-600 mb-6">You need to join this room to start chatting</p>
              <button
                onClick={async () => {
                  try {
                    const success = await joinRoom(currentRoom.id)
                    if (success) {
                      // Room will be joined and user will see the chat interface
                    } else {
                      alert('Failed to join room')
                    }
                  } catch (error: any) {
                    console.error('Failed to join room:', error)
                    alert(error.message || 'Failed to join room')
                  }
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        )
      }

  return (
    <div className="flex-1 flex flex-col">
      {/* Room Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentRoom.name}
            </h2>
            <p className="text-sm text-gray-600">
              {currentRoom.member_count} member{currentRoom.member_count !== 1 ? 's' : ''} • 
              Created by {currentRoom.created_by_username}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" onScroll={handleScroll}>
        {!isUserInRoom ? (
          <div className="text-center text-gray-500 py-8">
            <p>You need to join this room to see messages</p>
          </div>
        ) : (
          <>
            {isLoadingMore && (
              <div className="text-center text-gray-500 py-4">
                <p>Loading more messages...</p>
              </div>
            )}
            {!messages || messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages yet</p>
              </div>
            ) : (
          messages.filter(msg => msg && msg.id).map((msg) => (
            <div key={msg.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-blue-600">{msg.sender_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{msg.content}</p>
                </div>
              </div>
            </div>
          ))
            )}
          </>
        )}
      </div>
      
      {/* Message Input */}
      {isUserInRoom && (
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
      )}
    </div>
  )
}
