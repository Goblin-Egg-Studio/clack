import React, { useState } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useClackContext } from '../contexts/ClackContext'
import { ContextualRightSidebar } from './ContextualRightSidebar'

export function ChatLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, users, rooms, userRooms, joinRoom } = useClackContext()
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(false)
  const [isChatRoomsOpen, setIsChatRoomsOpen] = useState(false)

  const handleJoinRoom = async (roomId: number) => {
    try {
      const success = await joinRoom(roomId)
      if (success) {
        // The room list will update automatically via SSE
        console.log('Successfully joined room')
        // Find room by ID to get the name for navigation
        const room = rooms.find(r => r.id === roomId)
        if (room) {
          navigate(`/room/${room.name}`)
        }
      } else {
        alert('Failed to join room')
      }
    } catch (error: any) {
      console.error('Failed to join room:', error)
      alert(error.message || 'Failed to join room')
    }
  }

  const isUserInRoom = (roomId: number) => {
    if (!roomId || !userRooms || !Array.isArray(userRooms)) {
      return false
    }
    return userRooms.filter(room => room && room.id).some(room => room.id === roomId)
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">🚀 Clack Chat</h1>
          <p className="text-sm text-gray-600">Welcome, {currentUser?.username}!</p>
        </div>
        
        {/* Users Section */}
        <div className="border-b border-gray-200">
          <div className="group">
        <div 
          className="flex items-center cursor-pointer px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
          onClick={() => setIsDirectMessagesOpen(!isDirectMessagesOpen)}
        >
          <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex-1">👥 Users</span>
          <span className="text-gray-400 w-4 text-center">
            {isDirectMessagesOpen ? '-' : '+'}
          </span>
              <Link
                to="/users"
                className={`ml-2 px-3 py-1 text-sm font-medium transition-colors rounded ${
                  location.pathname === '/users'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Manage Users"
                onClick={(e) => e.stopPropagation()}
              >
                ⚙️
              </Link>
            </div>
            
            {isDirectMessagesOpen && (
              <div className="px-4 pb-4">
                {users.filter(user => user && user.id && user.id !== currentUser?.id).length > 0 ? (
                  <div className="flex flex-col space-y-1">
                    {users.filter(user => user && user.id && user.id !== currentUser?.id).map((user) => (
                      <Link
                        key={user.id}
                        to={`/chat/${user.username}`}
                        className={`block w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                          location.pathname === `/chat/${user.username}`
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {user.username}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No users yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        <div className="flex-1 flex flex-col">
          <div className="group flex-1 flex flex-col">
        <div 
          className="flex items-center cursor-pointer px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
          onClick={() => setIsChatRoomsOpen(!isChatRoomsOpen)}
        >
          <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex-1">🏠 Rooms</span>
          <span className="text-gray-400 w-4 text-center">
            {isChatRoomsOpen ? '-' : '+'}
          </span>
              <Link
                to="/rooms"
                className={`ml-2 px-3 py-1 text-sm font-medium transition-colors rounded ${
                  location.pathname === '/rooms'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Manage Rooms"
                onClick={(e) => e.stopPropagation()}
              >
                ⚙️
              </Link>
            </div>
            
            {isChatRoomsOpen && (
              <div className="px-4 pb-4 flex-1 overflow-y-auto">
                {rooms.filter(room => room && room.id).length > 0 ? (
                  <div className="space-y-1">
                    {rooms.filter(room => room && room.id).map((room) => (
                      <div key={room.id} className="flex items-center space-x-2">
                        <span className="text-lg">
                          {room && room.id ? (isUserInRoom(room.id) ? '🟢' : '🔵') : '🔵'}
                        </span>
                        <Link
                          to={`/room/${room.name}`}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                            location.pathname === `/room/${room.name}`
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {room.name}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No rooms yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header - spans full width above right sidebar */}
        {location.pathname.startsWith('/chat/') && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Chat with {location.pathname.split('/chat/')[1]}
            </h2>
          </div>
        )}
        
        {/* Room Header - spans full width above right sidebar */}
        {location.pathname.startsWith('/room/') && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {location.pathname.split('/room/')[1]}
                </h2>
                <p className="text-sm text-gray-600">Room Chat</p>
              </div>
            </div>
          </div>
        )}
        
        <Outlet />
      </div>
      
      {/* Contextual Right Sidebar */}
      <ContextualRightSidebar />
    </div>
  )
}
