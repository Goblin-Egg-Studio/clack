import React, { createContext, useContext } from 'react'
import { useClack } from '../hooks/useClack'
import { Message, User, Room } from '../sdk/clackClient'

interface ClackContextType {
  currentUser: User | null
  currentChatUser: User | null
  currentRoom: Room | null
  users: User[]
  rooms: Room[]
  userRooms: Room[]
  messages: Message[]
  allMessages: Map<string, Message[]>
  allRoomMessages: Map<number, Message[]>
  isConnected: boolean
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  startChat: (otherUserId: number) => Promise<void>
  selectChat: (otherUser: User) => Promise<void>
  createRoom: (name: string, description: string) => Promise<Room>
  joinRoom: (roomId: number) => Promise<boolean>
  leaveRoom: (roomId: number) => Promise<boolean>
  selectRoom: (room: Room) => Promise<void>
  sendRoomMessage: (content: string) => Promise<void>
  authenticate: (token: string, user: User) => Promise<void>
  loadMessages: (otherUserId: number) => Promise<void>
  refreshUsers: () => Promise<void>
  client: any
}

const ClackContext = createContext<ClackContextType | null>(null)

export function ClackProvider({ children }: { children: React.ReactNode }) {
  const clackData = useClack()
  
  return (
    <ClackContext.Provider value={clackData}>
      {children}
    </ClackContext.Provider>
  )
}

export function useClackContext() {
  const context = useContext(ClackContext)
  if (!context) {
    throw new Error('useClackContext must be used within a ClackProvider')
  }
  return context
}