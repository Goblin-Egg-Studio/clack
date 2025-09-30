import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function RoomsPage() {
  const navigate = useNavigate()
  const { currentUser, users, rooms, userRooms, createRoom, joinRoom, leaveRoom, changeRoomOwner, deleteRoom, isLoading } = useClackContext()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [transferRoomId, setTransferRoomId] = useState<number | null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null)


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
        // The room list will update automatically via SSE
        console.log('Successfully joined room')
      } else {
        alert('Failed to join room')
      }
    } catch (error: any) {
      console.error('Failed to join room:', error)
      alert(error.message || 'Failed to join room')
    }
  }

  const handleLeaveRoom = async (roomId: number) => {
    try {
      const success = await leaveRoom(roomId)
      if (success) {
        // The room list will update automatically via SSE
        console.log('Successfully left room')
      } else {
        alert('Failed to leave room')
      }
    } catch (error: any) {
      console.error('Failed to leave room:', error)
      alert(error.message || 'Failed to leave room')
    }
  }

  const isUserInRoom = (roomId: number) => {
    return userRooms.filter(room => room && room.id).some(room => room.id === roomId)
  }

  const isUserOwner = (room: any) => {
    return currentUser && room && room.created_by === currentUser.id
  }

  const handleChangeOwner = async (roomId: number, newOwnerId: number) => {
    try {
      await changeRoomOwner(roomId, newOwnerId)
      setTransferRoomId(null)
      setSelectedOwnerId(null)
      alert('Room ownership changed successfully')
    } catch (error: any) {
      console.error('Failed to change room owner:', error)
      alert(error.message || 'Failed to change room owner')
    }
  }

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return
    }

    try {
      await deleteRoom(roomId)
      alert('Room deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete room:', error)
      alert(error.message || 'Failed to delete room')
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat Rooms</h2>
          <p className="text-sm text-gray-600">Browse and manage available chat rooms</p>
        </div>
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <form onSubmit={handleCreateRoom} className="max-w-md">
            <div className="flex space-x-3">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                disabled={isLoading || !roomName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create'}
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
      
      {/* Rooms Table */}
      <div className="flex-1 overflow-y-auto">
        {!rooms || rooms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms found</h3>
              <p className="text-gray-600 mb-4">Be the first to create a room!</p>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Room
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms && rooms.filter(room => room && room.id).map((room) => {
                    const userInRoom = isUserInRoom(room.id)
                    return (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">
                              {userInRoom ? '🟢' : '🔵'}
                            </span>
                            <div className="text-sm font-medium text-gray-900">
                              {room.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {room.member_count} member{room.member_count !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {room.created_by_username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userInRoom 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {userInRoom ? 'Joined' : 'Not Joined'}
                            </span>
                            {isUserOwner(room) && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Owner
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col space-y-2">
                            {/* Regular user actions */}
                            {userInRoom ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => navigate(`/room/${room.name}`)}
                                  className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md transition-colors"
                                >
                                  Enter
                                </button>
                                <button
                                  onClick={() => handleLeaveRoom(room.id)}
                                  disabled={isLoading}
                                  className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Leave
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleJoinRoom(room.id)}
                                disabled={isLoading}
                                className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Join
                              </button>
                            )}
                            
                            {/* Owner actions */}
                            {isUserOwner(room) && (
                              <div className="flex flex-col space-y-2">
                                {transferRoomId === room.id ? (
                                  <div className="flex items-center space-x-2">
                                    <select
                                      value={selectedOwnerId ?? ''}
                                      onChange={(e) => setSelectedOwnerId(Number(e.target.value))}
                                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                    >
                                      <option value="" disabled>Select new owner</option>
                                      {users
                                        .filter(u => u && u.id && u.id !== currentUser?.id)
                                        .map(u => (
                                          <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                    <button
                                      onClick={() => selectedOwnerId ? handleChangeOwner(room.id, selectedOwnerId) : null}
                                      disabled={isLoading || !selectedOwnerId}
                                      className="px-2 py-1 bg-purple-600 text-white rounded-md text-xs disabled:opacity-50"
                                    >
                                      OK
                                    </button>
                                    <button
                                      onClick={() => { setTransferRoomId(null); setSelectedOwnerId(null) }}
                                      className="px-2 py-1 bg-gray-200 text-gray-800 rounded-md text-xs"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => { setTransferRoomId(room.id); setSelectedOwnerId(null) }}
                                      disabled={isLoading}
                                      className="text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                    >
                                      Transfer Ownership
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRoom(room.id)}
                                      disabled={isLoading}
                                      className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                    >
                                      Delete Room
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
