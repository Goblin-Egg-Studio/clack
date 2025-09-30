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
  dataTree: any
  usernameToId: Record<string, number>
  roomNameToId: Record<string, number>
  isConnected: boolean
  isLoading: boolean
  isSendingMessage: boolean
  isLoadingMore: boolean
  sendMessage: (content: string) => Promise<void>
  startChat: (otherUserId: number) => Promise<void>
  selectChat: (otherUser: User) => Promise<void>
  // Human-friendly helpers
  startChatByUsername: (username: string) => Promise<void>
  selectChatByUsername: (username: string) => Promise<void>
  createRoom: (name: string, description: string) => Promise<Room>
  joinRoom: (roomId: number) => Promise<boolean>
  leaveRoom: (roomId: number) => Promise<boolean>
  selectRoom: (room: Room) => Promise<void>
  selectRoomByName: (roomName: string) => Promise<void>
  sendRoomMessage: (content: string) => Promise<void>
  authenticate: (token: string, user: User) => Promise<void>
  loadMessages: (otherUserId: number) => Promise<void>
  loadMoreMessages: () => Promise<void>
  loadMoreRoomMessages: () => Promise<void>
  changeRoomOwner: (roomId: number, newOwnerId: number) => Promise<boolean>
  deleteRoom: (roomId: number) => Promise<boolean>
  refreshUsers: () => Promise<void>
  applyJSONPatch: (patches: any[]) => void
  
  // Human-friendly MCP helpers
  sendMessageByUsername: (username: string, content: string) => Promise<void>
  getMessagesByUsername: (username: string, startIndex: number, endIndex: number) => Promise<Message[]>
  joinRoomByName: (roomName: string) => Promise<boolean>
  leaveRoomByName: (roomName: string) => Promise<boolean>
  sendRoomMessageByName: (roomName: string, content: string) => Promise<void>
  getRoomMessagesByName: (roomName: string, startIndex: number, endIndex: number) => Promise<Message[]>
  
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