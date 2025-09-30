import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function RoomListView() {
  const navigate = useNavigate()
  const { currentUser, rooms, userRooms, createRoom, joinRoom, isLoading } = useClackContext()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [roomName, setRoomName] = useState('')

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) return

    try {
      await createRoom(roomName.trim(), '')
      setRoomName('')
      setShowCreateForm(false)
    } catch (error: any) {
      console.error('Failed to create room:', error)
      alert(error.message || 'Failed to create room')
    }
  }

  const handleJoinRoom = async (roomId: number) => {
    try {
      const success = await joinRoom(roomId)
      if (success) {
        // Navigate to the room
        navigate(`/room/${roomId}`)
      } else {
        alert('Failed to join room')
      }
    } catch (error: any) {
      console.error('Failed to join room:', error)
      alert(error.message || 'Failed to join room')
    }
  }

  const isUserInRoom = (roomId: number) => {
    return userRooms.some(room => room.id === roomId)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat Rooms</h2>
            <p className="text-sm text-gray-600">Join existing rooms or create new ones</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Create Room'}
          </button>
        </div>
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading || !roomName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto p-6">
        {rooms.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No rooms found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{room.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {room.member_count} member{room.member_count !== 1 ? 's' : ''}
                      </span>
                      {isUserInRoom(room.id) && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Joined
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Created by {room.created_by_username} • {new Date(room.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {isUserInRoom(room.id) ? (
                      <button
                        onClick={() => navigate(`/room/${room.name}`)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        Enter Room
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Join Room
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
