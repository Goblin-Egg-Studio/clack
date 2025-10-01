import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'

export function ContextualRightSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { 
    currentUser, 
    currentChatUser, 
    currentRoom, 
    users, 
    rooms, 
    userRooms, 
    dataTree,
    leaveRoom,
    changeRoomOwner,
    deleteRoom
  } = useClackContext()
  
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false)
  const [showTransferOwnership, setShowTransferOwnership] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null)
  const [registrationData, setRegistrationData] = useState({
    username: '',
    password: ''
  })
  const [roomName, setRoomName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [registrationError, setRegistrationError] = useState('')

  // Check if user is owner of current room
  const isUserOwner = currentRoom && currentUser && currentRoom.created_by === currentUser.id
  const isUserInRoom = currentRoom && userRooms.some(room => room.id === currentRoom.id)

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRegistering(true)
    setRegistrationError('')

    try {
      const { AuthService } = await import('../services/authService')
      const authService = new AuthService()
      const result = await authService.register(registrationData, false)
      
      setRegistrationData({ username: '', password: '' })
      setShowRegistrationForm(false)
      
      console.log('User registered successfully:', result.user)
    } catch (error: any) {
      setRegistrationError(error.message || 'Registration failed')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) return

    try {
      setIsCreatingRoom(true)
      const { createRoom } = await import('../contexts/ClackContext')
      await createRoom(roomName.trim(), '')
      setRoomName('')
      setShowCreateRoomForm(false)
    } catch (error: any) {
      console.error('Failed to create room:', error)
      alert(error.message || 'Failed to create room')
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const handleTransferOwnership = async () => {
    if (!currentRoom || !selectedOwnerId) return
    
    try {
      await changeRoomOwner(currentRoom.id, selectedOwnerId)
      setShowTransferOwnership(false)
      setSelectedOwnerId(null)
      alert('Room ownership changed successfully')
    } catch (error: any) {
      console.error('Failed to change room owner:', error)
      alert(error.message || 'Failed to change room owner')
    }
  }

  const handleDeleteRoom = async () => {
    if (!currentRoom) return
    
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return
    }

    try {
      await deleteRoom(currentRoom.id)
      alert('Room deleted successfully')
      navigate('/rooms')
    } catch (error: any) {
      console.error('Failed to delete room:', error)
      alert(error.message || 'Failed to delete room')
    }
  }

  const handleLeaveRoom = async () => {
    if (!currentRoom) return
    
    try {
      await leaveRoom(currentRoom.id)
      navigate('/rooms')
    } catch (error: any) {
      console.error('Failed to leave room:', error)
      alert(error.message || 'Failed to leave room')
    }
  }

  // Chat page - show user profile
  if (location.pathname.startsWith('/chat/')) {
    const username = location.pathname.split('/chat/')[1]
    const chatUser = users.find(u => u.username === username)
    
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">User Profile</h3>
        </div>
        
        <div className="flex-1 p-6">
          {chatUser ? (
            <div className="space-y-6">
              {/* User Avatar and Name */}
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {chatUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{chatUser.username}</h4>
                  <p className="text-sm text-gray-500 font-medium">Active User</p>
                </div>
              </div>
              
              {/* User Details */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 font-medium">Joined:</span>
                  <span className="font-semibold text-gray-900">{new Date(chatUser.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 font-medium">User ID:</span>
                  <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">{chatUser.id}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600">Loading user profile...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Room chat page - show room info and controls
  if (location.pathname.startsWith('/room/')) {
    const roomName = location.pathname.split('/room/')[1]
    const room = rooms.find(r => r.name === roomName)
    
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Room Info</h3>
        </div>
        
        <div className="flex-1 p-4 space-y-4">
          {room ? (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{room.name}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Members: {room.member_count}</div>
                  <div>Created by: {room.created_by_username}</div>
                  <div>Created: {new Date(room.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Room Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Room Actions</h4>
                <div className="space-y-2">
                  {isUserInRoom && (
                    <button
                      onClick={handleLeaveRoom}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Leave Room
                    </button>
                  )}
                  
                  {isUserOwner && (
                    <>
                      <button
                        onClick={() => setShowTransferOwnership(!showTransferOwnership)}
                        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Transfer Ownership
                      </button>
                      
                      <button
                        onClick={handleDeleteRoom}
                        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Delete Room
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Transfer Ownership Form */}
              {showTransferOwnership && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Transfer Ownership</h4>
                  <div className="space-y-3">
                    <select
                      value={selectedOwnerId ?? ''}
                      onChange={(e) => setSelectedOwnerId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="" disabled>Select new owner</option>
                      {users
                        .filter(u => u && u.id && u.id !== currentUser?.id)
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                    </select>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleTransferOwnership}
                        disabled={!selectedOwnerId}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => { setShowTransferOwnership(false); setSelectedOwnerId(null) }}
                        className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600">Loading room info...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Users page - show create user form
  if (location.pathname === '/users') {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        </div>
        
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Create New User</h4>
              <button
                onClick={() => setShowRegistrationForm(!showRegistrationForm)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                {showRegistrationForm ? 'Cancel' : '+ New User'}
              </button>
            </div>
            
            {showRegistrationForm && (
              <form onSubmit={handleRegistrationSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={registrationData.username}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, username: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={registrationData.password}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                </div>
                {registrationError && (
                  <div className="text-red-600 text-xs">{registrationError}</div>
                )}
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    {isRegistering ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegistrationForm(false)}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Rooms page - show create room form
  if (location.pathname === '/rooms') {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Room Management</h3>
        </div>
        
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Create New Room</h4>
              <button
                onClick={() => setShowCreateRoomForm(!showCreateRoomForm)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                {showCreateRoomForm ? 'Cancel' : '+ New Room'}
              </button>
            </div>
            
            {showCreateRoomForm && (
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter room name"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={isCreatingRoom || !roomName.trim()}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    {isCreatingRoom ? 'Creating...' : 'Create Room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoomForm(false)}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default sidebar for other pages
  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
        <p className="text-sm text-gray-600">Quick actions and tools</p>
      </div>
      
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">ℹ️ System Info</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Logged in as: <span className="font-medium">{currentUser?.username}</span></div>
            <div>Users online: <span className="font-medium">{users.length}</span></div>
            <div>Rooms available: <span className="font-medium">{rooms.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
