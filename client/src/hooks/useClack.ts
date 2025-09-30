import { useState, useEffect, useCallback, useRef } from 'react'
import { ClackClient, Message, User, Room, VersionInfo } from '../sdk/clackClient'
import { soundService } from '../services/soundService'
import { versionService } from '../services/versionService'

// Lightweight home-grown normalized data tree to mirror JSON patch shape
interface DataTreeUserMessage {
  timestamp: string
  message: string
  sender: number
}

interface DataTreeUser {
  name: string
  messages: Record<string, DataTreeUserMessage>
}

interface DataTreeRoomMessage {
  timestamp: string
  message: string
  sender: number
}

interface DataTreeRoom {
  name: string
  ownerId: number
  messages: Record<string, DataTreeRoomMessage>
}

interface DataTree {
  users: Record<string, DataTreeUser>
  rooms: Record<string, DataTreeRoom>
}

export function useClack() {
  const [client] = useState(() => new ClackClient({
    baseUrl: '',
    autoReconnect: true
  }))

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentChatUser, setCurrentChatUser] = useState<User | null>(null)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [userRooms, setUserRooms] = useState<Room[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [allMessages, setAllMessages] = useState<Map<string, Message[]>>(new Map()) // Store messages by user pair key
  const [allRoomMessages, setAllRoomMessages] = useState<Map<number, Message[]>>(new Map()) // Store room messages by room ID
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  // Home-grown normalized store + name indexes
  const [dataTree, setDataTree] = useState<DataTree>({ users: {}, rooms: {} })
  const [usernameToId, setUsernameToId] = useState<Record<string, number>>({})
  const [roomNameToId, setRoomNameToId] = useState<Record<string, number>>({})

  // Pagination state
  const [messagePagination, setMessagePagination] = useState<Map<string, { startIndex: number, hasMore: boolean }>>(new Map()) // Track pagination for each chat/room
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Refs to avoid stale closures
  const currentChatUserRef = useRef<User | null>(null)
  const currentUserRef = useRef<User | null>(null)
  const currentRoomRef = useRef<Room | null>(null)
  const lastVersionRef = useRef<VersionInfo | null>(null)

  // Update refs when state changes
  useEffect(() => {
    currentChatUserRef.current = currentChatUser
  }, [currentChatUser])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    currentRoomRef.current = currentRoom
  }, [currentRoom])

  // Helper function to create a consistent key for user pairs
  const getUserPairKey = (userA: number, userB: number): string => {
    return userA < userB ? `${userA}-${userB}` : `${userB}-${userA}`
  }

  // JSON Patch applier for dataTree
  const applyJSONPatch = useCallback((patches: any[]) => {
    setDataTree(prev => {
      let next = { ...prev }
      patches.forEach(patch => {
        if (patch.op === 'add' && patch.path && patch.value !== undefined) {
          const pathParts = patch.path.split('/').filter(Boolean)
          if (pathParts.length >= 2) {
            const [type, id] = pathParts
            if (type === 'users' && pathParts.length === 2) {
              next.users = { ...next.users, [id]: patch.value }
            } else if (type === 'rooms' && pathParts.length === 2) {
              next.rooms = { ...next.rooms, [id]: patch.value }
            } else if (type === 'users' && pathParts.length === 4 && pathParts[2] === 'messages') {
              const userId = pathParts[1]
              const messageId = pathParts[3]
              if (next.users[userId]) {
                next.users = {
                  ...next.users,
                  [userId]: {
                    ...next.users[userId],
                    messages: { ...next.users[userId].messages, [messageId]: patch.value }
                  }
                }
              }
            } else if (type === 'rooms' && pathParts.length === 4 && pathParts[2] === 'messages') {
              const roomId = pathParts[1]
              const messageId = pathParts[3]
              if (next.rooms[roomId]) {
                next.rooms = {
                  ...next.rooms,
                  [roomId]: {
                    ...next.rooms[roomId],
                    messages: { ...next.rooms[roomId].messages, [messageId]: patch.value }
                  }
                }
              }
            }
          }
        }
      })
      return next
    })
  }, [])

  // Set up event listeners
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      console.log('🔔 handleNewMessage called:', {
        messageId: message.id,
        content: message.content.substring(0, 50) + '...',
        senderId: message.sender_id,
        userA: message.user_a,
        userB: message.user_b,
        currentUserId: currentUserRef.current?.id,
        currentChatUserId: currentChatUserRef.current?.id
      })

      // Mirror into dataTree for each participant
      setDataTree(prev => {
        const next: DataTree = { ...prev, users: { ...prev.users } }
        const participants: number[] = [message.user_a, message.user_b]
        const msgIdKey = String(message.id)
        const payload: DataTreeUserMessage = {
          timestamp: message.created_at,
          message: message.content,
          sender: message.sender_id
        }
        participants.forEach(uid => {
          const key = String(uid)
          const existingUser = next.users[key]
          if (existingUser) {
            next.users[key] = {
              ...existingUser,
              messages: { ...existingUser.messages, [msgIdKey]: payload }
            }
          }
        })
        return next
      })

      // Update the allMessages map
      setAllMessages(prev => {
        const newMap = new Map(prev)
        const pairKey = getUserPairKey(message.user_a, message.user_b)
        const conversationMessages = newMap.get(pairKey) || []
        
        // Check for duplicates (optimistic updates)
        const exists = conversationMessages.some(msg => 
          msg.content === message.content && 
          msg.sender_id === message.sender_id &&
          Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 1000
        )
        
        if (!exists) {
          newMap.set(pairKey, [...conversationMessages, message])
        }
        
        return newMap
      })
      
      // Only add message to current view if it's for the current chat user
      const isForCurrentChat = currentUserRef.current && currentChatUserRef.current && 
          ((message.user_a === currentUserRef.current.id && message.user_b === currentChatUserRef.current.id) ||
           (message.user_b === currentUserRef.current.id && message.user_a === currentChatUserRef.current.id))
      
      console.log('🔍 Message visibility check:', {
        isForCurrentChat,
        messageUserA: message.user_a,
        messageUserB: message.user_b,
        currentUserId: currentUserRef.current?.id,
        currentChatUserId: currentChatUserRef.current?.id
      })
      
      if (isForCurrentChat) {
        console.log('✅ Adding message to current view')
        setMessages(prev => {
          // Check for duplicates (optimistic updates)
          const exists = prev.some(msg => 
            msg.content === message.content && 
            msg.sender_id === message.sender_id &&
            Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 1000
          )
          if (!exists) {
            console.log('📝 Adding new message to messages array')
            return [...prev, message]
          }
          console.log('⚠️ Message already exists, skipping')
          return prev
        })
      } else {
        console.log('❌ Message not for current chat, not adding to view')
      }

      // Play sound notification for direct message (only if not from current user)
      if (currentUserRef.current && message.sender_id !== currentUserRef.current.id) {
        soundService.playNotification('dm')
      }
    }

    const handleNewUser = (user: User) => {
      setUsers(prev => {
        const exists = prev.some(u => u.id === user.id)
        if (!exists) {
          return [...prev, user]
        }
        return prev
      })

      // Insert into dataTree and username index
      setDataTree(prev => {
        const key = String(user.id)
        if (prev.users[key]) return prev
        return {
          ...prev,
          users: {
            ...prev.users,
            [key]: { name: user.username, messages: {} }
          }
        }
      })
      setUsernameToId(prev => ({ ...prev, [user.username]: user.id }))
    }

    const handleInitialUsers = (users: User[]) => {
      setUsers(users)
      // Seed dataTree users and username index
      setDataTree(prev => {
        const nextUsers: Record<string, DataTreeUser> = { ...prev.users }
        const idx: Record<string, number> = { ...usernameToId }
        users.forEach(u => {
          const key = String(u.id)
          if (!nextUsers[key]) {
            nextUsers[key] = { name: u.username, messages: {} }
          }
          idx[u.username] = u.id
        })
        setUsernameToId(idx)
        return { ...prev, users: nextUsers }
      })
    }

        const handleInitialMessages = (messages: Message[]) => {
          setAllMessages(prev => {
            const newMap = new Map(prev)
            // Group messages by user pairs
            messages.forEach(message => {
              const pairKey = getUserPairKey(message.user_a, message.user_b)
              const existingMessages = newMap.get(pairKey) || []
              newMap.set(pairKey, [...existingMessages, message])
            })
            return newMap
          })

          // Mirror into dataTree for both participants
          setDataTree(prev => {
            const next: DataTree = { ...prev, users: { ...prev.users } }
            messages.forEach(m => {
              const msgIdKey = String(m.id)
              const payload: DataTreeUserMessage = {
                timestamp: m.created_at,
                message: m.content,
                sender: m.sender_id
              }
              ;[m.user_a, m.user_b].forEach(uid => {
                const key = String(uid)
                const existingUser = next.users[key]
                if (existingUser) {
                  next.users[key] = {
                    ...existingUser,
                    messages: { ...existingUser.messages, [msgIdKey]: payload }
                  }
                }
              })
            })
            return next
          })
        }

        const handleNewRoom = (room: Room) => {
          console.log('handleNewRoom called with:', room)
          if (!room || !room.id) return
          
          setRooms(prev => {
            const filtered = prev.filter(r => r && r.id)
            const exists = filtered.some(r => r.id === room.id)
            if (!exists) {
              console.log('Adding new room to rooms list')
              return [...filtered, room]
            }
            return filtered
          })

          // Insert into dataTree rooms and room name index
          setDataTree(prev => {
            const key = String(room.id)
            if (prev.rooms[key]) return prev
            return {
              ...prev,
              rooms: {
                ...prev.rooms,
                [key]: { name: room.name, ownerId: room.created_by, messages: {} }
              }
            }
          })
          setRoomNameToId(prev => ({ ...prev, [room.name]: room.id }))
          
          // If the current user created this room, add it to their userRooms
          if (currentUserRef.current && room.created_by === currentUserRef.current.id) {
            console.log('Adding room to userRooms for creator')
            setUserRooms(prev => {
              const filtered = prev.filter(r => r && r.id)
              const exists = filtered.some(r => r.id === room.id)
              if (!exists) {
                return [...filtered, room]
              }
              return filtered
            })
          }

          // Play sound notification for room creation (only if not created by current user)
          if (currentUserRef.current && room.created_by !== currentUserRef.current.id) {
            soundService.playNotification('room_created')
          }
        }

        const handleRoomUpdated = (data: { room: Room, joinedUserId?: number }) => {
          const { room, joinedUserId } = data
          if (!room || !room.id) return
          
          setRooms(prev => {
            const filtered = prev.filter(r => r && r.id)
            return filtered.map(r => r.id === room.id ? room : r)
          })
          
          // Only add room to userRooms if the current user is the one who joined
          if (currentUserRef.current && joinedUserId === currentUserRef.current.id) {
            setUserRooms(prev => {
              const filtered = prev.filter(r => r && r.id)
              const existingRoom = filtered.find(r => r.id === room.id)
              if (existingRoom) {
                // Update existing room
                return filtered.map(r => r.id === room.id ? room : r)
              } else {
                // Add new room to user's rooms (user joined)
                return [...filtered, room]
              }
            })
          }
        }

        const handleRoomOwnerChanged = (data: { room: Room, oldOwnerId: number, newOwnerId: number }) => {
          const { room, oldOwnerId, newOwnerId } = data
          if (!room || !room.id) return
          
          console.log('useClack: Room owner changed:', { room: room.name, oldOwnerId, newOwnerId })
          
          // Update the room in the rooms list
          setRooms(prev => {
            const filtered = prev.filter(r => r && r.id)
            return filtered.map(r => r.id === room.id ? room : r)
          })
          
          // Update user rooms if the current user is involved
          if (currentUserRef.current && (currentUserRef.current.id === oldOwnerId || currentUserRef.current.id === newOwnerId)) {
            setUserRooms(prev => {
              const filtered = prev.filter(r => r && r.id)
              return filtered.map(r => r.id === room.id ? room : r)
            })
          }
        }

        const handleRoomDeleted = (data: { roomId: number, deletedBy: number }) => {
          const { roomId } = data
          
          console.log('useClack: Room deleted:', roomId)
          
          // Remove room from all lists
          setRooms(prev => prev.filter(r => r && r.id !== roomId))
          setUserRooms(prev => prev.filter(r => r && r.id !== roomId))
          
          // Clear room messages if this was the current room
          if (currentRoomRef.current && currentRoomRef.current.id === roomId) {
            setCurrentRoom(null)
            setMessages([])
            setAllRoomMessages(prev => {
              const newMap = new Map(prev)
              newMap.delete(roomId)
              return newMap
            })
          }
        }

        const handleInitialRooms = (rooms: Room[]) => {
          if (Array.isArray(rooms)) {
            const clean = rooms.filter(room => room && room.id)
            setRooms(clean)
            // Seed dataTree rooms and index
            setDataTree(prev => {
              const nextRooms: Record<string, DataTreeRoom> = { ...prev.rooms }
              const idx: Record<string, number> = { ...roomNameToId }
              clean.forEach(r => {
                const key = String(r.id)
                if (!nextRooms[key]) {
                  nextRooms[key] = { name: r.name, ownerId: r.created_by, messages: {} }
                }
                idx[r.name] = r.id
              })
              setRoomNameToId(idx)
              return { ...prev, rooms: nextRooms }
            })
          }
        }

        const handleInitialUserRooms = (rooms: Room[]) => {
          if (Array.isArray(rooms)) {
            setUserRooms(rooms.filter(room => room && room.id))
          }
        }

        const handleInitialRoomMessages = (data: { roomId: number, messages: Message[] }) => {
          setAllRoomMessages(prev => {
            const newMap = new Map(prev)
            newMap.set(data.roomId, data.messages)
            return newMap
          })

          // Mirror into dataTree
          setDataTree(prev => {
            const key = String(data.roomId)
            const room = prev.rooms[key]
            if (!room) return prev
            const nextMessages: Record<string, DataTreeRoomMessage> = { ...room.messages }
            data.messages.forEach(m => {
              nextMessages[String(m.id)] = {
                timestamp: m.created_at,
                message: m.content,
                sender: m.sender_id
              }
            })
            return {
              ...prev,
              rooms: {
                ...prev.rooms,
                [key]: { ...room, messages: nextMessages }
              }
            }
          })
        }

        const handleNewRoomMessage = (message: Message & { room_id: number }) => {
          setAllRoomMessages(prev => {
            const newMap = new Map(prev)
            const roomMessages = newMap.get(message.room_id) || []
            
            // Check for duplicates (optimistic updates)
            const exists = roomMessages.some(msg => 
              msg.content === message.content && 
              msg.sender_id === message.sender_id &&
              Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 1000
            )
            
            if (!exists) {
              newMap.set(message.room_id, [...roomMessages, message])
            }
            
            return newMap
          })

          // Mirror into dataTree
          setDataTree(prev => {
            const key = String(message.room_id)
            const room = prev.rooms[key]
            if (!room) return prev
            return {
              ...prev,
              rooms: {
                ...prev.rooms,
                [key]: {
                  ...room,
                  messages: {
                    ...room.messages,
                    [String(message.id)]: {
                      timestamp: message.created_at,
                      message: message.content,
                      sender: message.sender_id
                    }
                  }
                }
              }
            }
          })
          
          // Only add message to current view if it's for the current room
          if (currentRoom && message.room_id === currentRoom.id) {
            setMessages(prev => {
              // Check for duplicates (optimistic updates)
              const exists = prev.some(msg => 
                msg.content === message.content && 
                msg.sender_id === message.sender_id &&
                Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 1000
              )
              if (!exists) {
                return [...prev, message]
              }
              return prev
            })
          }

          // Play sound notification for room message (only if not from current user)
          if (currentUserRef.current && message.sender_id !== currentUserRef.current.id) {
            soundService.playNotification('room_message')
          }
        }

    const handleConnectionOpen = () => {
      setIsConnected(true)
    }

    const handleConnectionClose = () => {
      setIsConnected(false)
    }

    const handleVersionReceived = (version: VersionInfo) => {
      console.log('useClack: Version received from SSE:', version)
      
      // Update version service with SSE data
      versionService.updateVersionFromSSE(version)
      
      // Check if this is a reconnection with different version
      if (lastVersionRef.current) {
        const hasVersionChanged = 
          lastVersionRef.current.monorepoVersion !== version.monorepoVersion ||
          lastVersionRef.current.frontendVersion !== version.frontendVersion ||
          lastVersionRef.current.sdkVersion !== version.sdkVersion
        
        if (hasVersionChanged) {
          console.log('useClack: Version changed after reconnection, reloading page...')
          console.log('Previous version:', lastVersionRef.current)
          console.log('New version:', version)
          // Reload the page to get the new version
          window.location.reload()
          return
        }
      }
      
      // Store the current version for future comparisons
      lastVersionRef.current = version
    }

        // Register event listeners
        client.on('message:new', handleNewMessage)
        client.on('user:new', handleNewUser)
        client.on('users:initial', handleInitialUsers)
        client.on('messages:initial', handleInitialMessages)
        client.on('room:new', handleNewRoom)
        client.on('room:updated', handleRoomUpdated)
        client.on('room:owner_changed', handleRoomOwnerChanged)
        client.on('room:deleted', handleRoomDeleted)
        client.on('rooms:initial', handleInitialRooms)
        client.on('user_rooms:initial', handleInitialUserRooms)
        client.on('room_messages:initial', handleInitialRoomMessages)
        client.on('room_message:new', handleNewRoomMessage)
        client.on('connection:open', handleConnectionOpen)
        client.on('connection:close', handleConnectionClose)
        client.on('connection:error', (error: any) => {
          console.error('useClack: SSE connection error:', error)
          setIsConnected(false)
        })
        client.on('version:received', handleVersionReceived)

        return () => {
          client.off('message:new', handleNewMessage)
          client.off('user:new', handleNewUser)
          client.off('users:initial', handleInitialUsers)
          client.off('messages:initial', handleInitialMessages)
          client.off('room:new', handleNewRoom)
          client.off('room:updated', handleRoomUpdated)
          client.off('room:owner_changed', handleRoomOwnerChanged)
          client.off('room:deleted', handleRoomDeleted)
          client.off('rooms:initial', handleInitialRooms)
          client.off('user_rooms:initial', handleInitialUserRooms)
          client.off('room_messages:initial', handleInitialRoomMessages)
          client.off('room_message:new', handleNewRoomMessage)
          client.off('connection:open', handleConnectionOpen)
          client.off('connection:close', handleConnectionClose)
          client.off('connection:error', (error: any) => {
            console.error('useClack: SSE connection error:', error)
            setIsConnected(false)
          })
          client.off('version:received', handleVersionReceived)
          client.disconnect()
        }
  }, [client])

  // Service methods
  const loadMessages = useCallback(async (otherUserId: number) => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      const pairKey = getUserPairKey(currentUser.id, otherUserId)
      
      // Check if we already have messages for this chat
      setAllMessages(prev => {
        const existingMessages = prev.get(pairKey) || []
        if (existingMessages.length > 0) {
          setMessages(existingMessages)
          setIsLoading(false)
          return prev // Return unchanged map
        }
        return prev
      })
      
      // Use new MCP tool for latest-first messages between users
      const messages = await client.getMessagesBetweenUsersPage(currentUser.id, otherUserId, 0, 10)
      
      // Store messages in allMessages map
      setAllMessages(prev => {
        const newMap = new Map(prev)
        newMap.set(pairKey, messages)
        return newMap
      })
      
      setMessages(messages)
      
      // Update pagination state
      setMessagePagination(prev => {
        const newMap = new Map(prev)
        newMap.set(pairKey, { startIndex: messages.length, hasMore: messages.length === 10 })
        return newMap
      })
      
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, client])

  const loadMoreMessages = useCallback(async () => {
    if (!currentUser || !currentChatUser || isLoadingMore) return
    
    try {
      setIsLoadingMore(true)
      const pairKey = getUserPairKey(currentUser.id, currentChatUser.id)
      const pagination = messagePagination.get(pairKey)
      
      if (!pagination || !pagination.hasMore) {
        return
      }
      
      // Use new MCP tool for latest-first messages between users
      const newMessages = await client.getMessagesBetweenUsersPage(currentUser.id, currentChatUser.id, pagination.startIndex, 10)
      
      if (newMessages.length === 0) {
        // No more messages
        setMessagePagination(prev => {
          const newMap = new Map(prev)
          newMap.set(pairKey, { ...pagination, hasMore: false })
          return newMap
        })
        return
      }
      
      // Prepend new messages to existing ones (older messages go first)
      setAllMessages(prev => {
        const newMap = new Map(prev)
        const existingMessages = newMap.get(pairKey) || []
        newMap.set(pairKey, [...newMessages, ...existingMessages])
        return newMap
      })
      
      setMessages(prev => [...newMessages, ...prev])
      
      // Update pagination state
      setMessagePagination(prev => {
        const newMap = new Map(prev)
        newMap.set(pairKey, { 
          startIndex: pagination.startIndex + newMessages.length, 
          hasMore: newMessages.length === 10 
        })
        return newMap
      })
      
    } catch (error) {
      console.error('Failed to load more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentUser, currentChatUser, messagePagination, isLoadingMore, client])

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!currentUser || !currentChatUser) return

    setIsSendingMessage(true)
    
    try {
      await client.sendMessage(currentChatUser.id, content)
      // Message will come via SSE
    } catch (error) {
      throw error
    } finally {
      setIsSendingMessage(false)
    }
  }, [client, currentUser, currentChatUser])

  const startChat = useCallback(async (otherUserId: number): Promise<void> => {
    if (!currentUser) return

    try {
      console.log('Starting chat with user ID:', otherUserId)
      console.log('Available users:', users)
      
      // Find the other user
      const otherUser = users.find(u => u.id === otherUserId)
      if (!otherUser) {
        console.error('User not found. Available users:', users.map(u => ({ id: u.id, username: u.username })))
        throw new Error(`User with ID ${otherUserId} not found`)
      }
      
      setCurrentChatUser(otherUser)
      
      // Load messages for this chat
      await loadMessages(otherUserId)
    } catch (error) {
      console.error('Failed to start chat:', error)
      throw error
    }
  }, [currentUser, users, loadMessages])

  const selectChat = useCallback(async (otherUser: User): Promise<void> => {
    setCurrentChatUser(otherUser)
    await loadMessages(otherUser.id)
  }, [loadMessages])

  // Human-friendly helpers
  const startChatByUsername = useCallback(async (username: string): Promise<void> => {
    let id = usernameToId[username]
    
    // Fallback: if not in index, try to find in users array
    if (!id) {
      const user = users.find(u => u.username === username)
      if (user) {
        id = user.id
        // Update the index for future lookups
        setUsernameToId(prev => ({ ...prev, [username]: user.id }))
      }
    }
    
    if (!id) throw new Error(`Unknown user: ${username}`)
    await startChat(id)
  }, [usernameToId, users, startChat])

  const selectChatByUsername = useCallback(async (username: string): Promise<void> => {
    let id = usernameToId[username]
    
    // Fallback: if not in index, try to find in users array
    if (!id) {
      const user = users.find(u => u.username === username)
      if (user) {
        id = user.id
        // Update the index for future lookups
        setUsernameToId(prev => ({ ...prev, [username]: user.id }))
      }
    }
    
    if (!id) throw new Error(`Unknown user: ${username}`)
    const user = users.find(u => u.id === id)
    if (!user) throw new Error(`User not loaded: ${username}`)
    await selectChat(user)
  }, [usernameToId, users, selectChat])

  // Human-friendly MCP helpers using usernames and room names
  const sendMessageByUsername = useCallback(async (username: string, content: string): Promise<void> => {
    await client.sendMessageByUsername(username, content)
  }, [client])

  const getMessagesByUsername = useCallback(async (username: string, startIndex: number, endIndex: number): Promise<Message[]> => {
    return await client.getMessagesByUsername(username, startIndex, endIndex)
  }, [client])

  const joinRoomByName = useCallback(async (roomName: string): Promise<boolean> => {
    return await client.joinRoomByName(roomName)
  }, [client])

  const leaveRoomByName = useCallback(async (roomName: string): Promise<boolean> => {
    return await client.leaveRoomByName(roomName)
  }, [client])

  const sendRoomMessageByName = useCallback(async (roomName: string, content: string): Promise<void> => {
    await client.sendRoomMessageByName(roomName, content)
  }, [client])

  const getRoomMessagesByName = useCallback(async (roomName: string, startIndex: number, endIndex: number): Promise<Message[]> => {
    return await client.getRoomMessagesByName(roomName, startIndex, endIndex)
  }, [client])

      const createRoom = useCallback(async (name: string, description: string): Promise<Room> => {
        if (!currentUser) throw new Error('User not authenticated')
        
        setIsLoading(true)
        try {
          const room = await client.createRoom(name, description)
          return room
        } finally {
          setIsLoading(false)
        }
      }, [client, currentUser])

      const joinRoom = useCallback(async (roomId: number): Promise<boolean> => {
        if (!currentUser) throw new Error('User not authenticated')
        
        setIsLoading(true)
        try {
          const success = await client.joinRoom(roomId)
          return success
        } finally {
          setIsLoading(false)
        }
      }, [client, currentUser])

      const leaveRoom = useCallback(async (roomId: number): Promise<boolean> => {
        if (!currentUser) throw new Error('User not authenticated')
        
        setIsLoading(true)
        try {
          const success = await client.leaveRoom(roomId)
          return success
        } finally {
          setIsLoading(false)
        }
      }, [client, currentUser])

      const selectRoom = useCallback(async (room: Room): Promise<void> => {
        setCurrentRoom(room)
        setCurrentChatUser(null) // Clear direct chat when selecting room
        
        try {
          setIsLoading(true)
          
          // Check if we already have messages for this room
          const existingMessages = allRoomMessages.get(room.id) || []
          if (existingMessages.length > 0) {
            setMessages(existingMessages)
            setIsLoading(false)
            return
          }
          
          // Load first page of room messages
          const messages = await client.getRoomMessagesPage(room.id, 0, 10)
          
          // Store messages in allRoomMessages map
          setAllRoomMessages(prev => {
            const newMap = new Map(prev)
            newMap.set(room.id, messages)
            return newMap
          })
          
          setMessages(messages)
          
          // Update pagination state for room
          const roomKey = `room_${room.id}`
          setMessagePagination(prev => {
            const newMap = new Map(prev)
            newMap.set(roomKey, { startIndex: messages.length, hasMore: messages.length === 10 })
            return newMap
          })
          
        } catch (error) {
          console.error('Failed to load room messages:', error)
        } finally {
          setIsLoading(false)
        }
      }, [allRoomMessages, client])

      const selectRoomByName = useCallback(async (roomName: string): Promise<void> => {
        let id = roomNameToId[roomName]
        
        // Fallback: if not in index, try to find in rooms array
        if (!id) {
          const room = rooms.find(r => r.name === roomName)
          if (room) {
            id = room.id
            // Update the index for future lookups
            setRoomNameToId(prev => ({ ...prev, [roomName]: room.id }))
          }
        }
        
        if (!id) throw new Error(`Unknown room: ${roomName}`)
        const room = rooms.find(r => r.id === id)
        if (!room) throw new Error(`Room not loaded: ${roomName}`)
        await selectRoom(room)
      }, [roomNameToId, rooms, selectRoom])

      const loadMoreRoomMessages = useCallback(async () => {
        if (!currentRoom || isLoadingMore) return
        
        try {
          setIsLoadingMore(true)
          const roomKey = `room_${currentRoom.id}`
          const pagination = messagePagination.get(roomKey)
          
          if (!pagination || !pagination.hasMore) {
            return
          }
          
          // Load next page of room messages
          const newMessages = await client.getRoomMessagesPage(currentRoom.id, pagination.startIndex, 10)
          
          if (newMessages.length === 0) {
            // No more messages
            setMessagePagination(prev => {
              const newMap = new Map(prev)
              newMap.set(roomKey, { ...pagination, hasMore: false })
              return newMap
            })
            return
          }
          
          // Prepend new messages to existing ones (older messages go first)
          setAllRoomMessages(prev => {
            const newMap = new Map(prev)
            const existingMessages = newMap.get(currentRoom.id) || []
            newMap.set(currentRoom.id, [...newMessages, ...existingMessages])
            return newMap
          })
          
          setMessages(prev => [...newMessages, ...prev])
          
          // Update pagination state
          setMessagePagination(prev => {
            const newMap = new Map(prev)
            newMap.set(roomKey, { 
              startIndex: pagination.startIndex + newMessages.length, 
              hasMore: newMessages.length === 10 
            })
            return newMap
          })
          
        } catch (error) {
          console.error('Failed to load more room messages:', error)
        } finally {
          setIsLoadingMore(false)
        }
      }, [currentRoom, messagePagination, isLoadingMore, client])

      const changeRoomOwner = useCallback(async (roomId: number, newOwnerId: number): Promise<boolean> => {
        if (!currentUser) return false

        try {
          await client.changeRoomOwner(roomId, newOwnerId, currentUser.id)
          return true
        } catch (error) {
          console.error('Failed to change room owner:', error)
          throw error
        }
      }, [client, currentUser])

      const deleteRoom = useCallback(async (roomId: number): Promise<boolean> => {
        if (!currentUser) return false

        try {
          await client.deleteRoom(roomId, currentUser.id)
          return true
        } catch (error) {
          console.error('Failed to delete room:', error)
          throw error
        }
      }, [client, currentUser])

      const sendRoomMessage = useCallback(async (content: string): Promise<void> => {
        if (!currentUser || !currentRoom) return

        setIsSendingMessage(true)
        
        try {
          await client.sendRoomMessage(currentRoom.id, content)
          // Message will come via SSE
        } catch (error) {
          throw error
        } finally {
          setIsSendingMessage(false)
        }
      }, [client, currentUser, currentRoom])

      const refreshUsers = useCallback(async (): Promise<void> => {
        try {
          const users = await client.getAllUsers()
          setUsers(users)
          console.log('useClack: Refreshed users:', users.length)
        } catch (error) {
          console.error('Failed to refresh users:', error)
        }
      }, [client])

      const authenticate = useCallback(async (token: string, user: User): Promise<void> => {
        client.setToken(token)
        setCurrentUser(user)
        client.connect()
        
        // Load initial data using MCP getters (only users and rooms, not messages)
        try {
          console.log('Loading initial data...')
          
          // Load users, rooms, and user's rooms
          const [users, rooms, userRooms] = await Promise.all([
            client.getAllUsers(),
            client.getAllRooms(),
            client.getUserRooms(user.id)
          ])
          
          console.log('useClack: Loaded users:', users.length)
          console.log('useClack: Loaded rooms:', rooms.length, rooms)
          console.log('useClack: Loaded user rooms:', userRooms.length, userRooms)
          
          setUsers(users)
          setRooms(rooms)
          setUserRooms(userRooms)
          
          // For now, set empty arrays for messages
          // These will be populated when user opens specific chats/rooms
          setMessages([])
          
          console.log('Initial data loaded successfully')
        } catch (error) {
          console.error('Failed to load initial data:', error)
        }
      }, [client])

  // Auto-load messages when chat user changes
  useEffect(() => {
    if (currentChatUser && currentUser) {
      loadMessages(currentChatUser.id)
    }
  }, [currentChatUser, currentUser, loadMessages])

      return {
        // State
        currentUser,
        currentChatUser,
        currentRoom,
        users,
        rooms,
        userRooms,
        messages,
        allMessages,
        allRoomMessages,
        dataTree,
        usernameToId,
        roomNameToId,
        isConnected,
        isLoading,
        isSendingMessage,
        isLoadingMore,
        
        // Actions
        sendMessage,
        startChat,
        selectChat,
        startChatByUsername,
        selectChatByUsername,
        createRoom,
        joinRoom,
        leaveRoom,
        selectRoom,
        selectRoomByName,
        sendRoomMessage,
        authenticate,
        loadMessages,
        loadMoreMessages,
        loadMoreRoomMessages,
        changeRoomOwner,
        deleteRoom,
        refreshUsers,
        applyJSONPatch,
        
        // Human-friendly MCP helpers
        sendMessageByUsername,
        getMessagesByUsername,
        joinRoomByName,
        leaveRoomByName,
        sendRoomMessageByName,
        getRoomMessagesByName,
        
        // Client
        client
      }
}