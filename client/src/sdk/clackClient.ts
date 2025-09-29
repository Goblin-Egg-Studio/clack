// Simple EventEmitter implementation for browser
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  off(event: string, listener: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener)
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }
}

export interface Message {
  id: number
  user_a: number
  user_b: number
  sender_id: number
  content: string
  created_at: string
  sender_name: string
}

export interface User {
  id: number
  username: string
  created_at: string
}

export interface Room {
  id: number
  name: string
  description?: string
  created_by: number
  created_at: string
  created_by_username: string
  member_count: number
}

export interface ClackEvents {
  'message:new': (message: Message) => void
  'user:new': (user: User) => void
  'users:initial': (users: User[]) => void
  'messages:initial': (messages: Message[]) => void
  'room:new': (room: Room) => void
  'room:updated': (room: Room) => void
  'room:owner_changed': (data: { room: Room, oldOwnerId: number, newOwnerId: number }) => void
  'room:deleted': (data: { roomId: number, deletedBy: number }) => void
  'rooms:initial': (rooms: Room[]) => void
  'user_rooms:initial': (rooms: Room[]) => void
  'room_message:new': (message: Message) => void
  'room_messages:initial': (data: { roomId: number, messages: Message[] }) => void
  'connection:open': () => void
  'connection:close': () => void
  'connection:error': (error: Event) => void
}

export interface ClackClientOptions {
  baseUrl?: string
  token?: string
  autoReconnect?: boolean
  reconnectInterval?: number
}

import { EventSource as LDEventSource } from 'launchdarkly-eventsource'

export class ClackClient extends EventEmitter {
  private baseUrl: string
  private token: string | null = null
  private eventSource: LDEventSource | null = null
  private autoReconnect: boolean
  private reconnectInterval: number
  private reconnectTimer: NodeJS.Timeout | null = null
  private requestId: number = 0

  constructor(options: ClackClientOptions = {}) {
    super()
    // Ensure absolute base URL: default to current origin in browser
    const origin = typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : ''
    this.baseUrl = options.baseUrl && options.baseUrl.trim().length > 0 ? options.baseUrl : origin
    this.token = options.token || null
    this.autoReconnect = options.autoReconnect ?? true
    this.reconnectInterval = options.reconnectInterval || 3000
  }

  // Authentication
  setToken(token: string) {
    this.token = token
    if (this.eventSource) {
      this.disconnect()
      this.connect()
    }
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return this.token !== null
  }

  // Connection management
  connect(): void {
    if (!this.token) {
      throw new Error('Token required to connect')
    }

    this.disconnect() // Close any existing connection

    const url = `${this.baseUrl}/api/events?token=${this.token}`
    const headers: Record<string, string> = {}
    // The token is already in querystring but preserve header if server supports
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    this.eventSource = new LDEventSource(url, { headers, readTimeoutMillis: 60000 })

    this.eventSource.onopen = () => {
      console.log('ClackClient: SSE connection opened')
      this.emit('connection:open')
      this.clearReconnectTimer()
    }

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleSSEEvent(data)
      } catch (error) {
        console.error('ClackClient: Failed to parse SSE data:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('ClackClient: SSE connection error:', error)
      this.emit('connection:error', error)
      
      if (this.autoReconnect) {
        this.scheduleReconnect()
      }
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.clearReconnectTimer()
    this.emit('connection:close')
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      console.log('ClackClient: Attempting to reconnect...')
      this.connect()
    }, this.reconnectInterval)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

      private handleSSEEvent(data: any): void {
        // Handle JSON patch format
        if (data.op && data.path && data.value !== undefined) {
          this.handleJSONPatch(data)
          return
        }
        
        // Handle legacy format for backward compatibility
        switch (data.type) {
          case 'connected':
            console.log('ClackClient: Connected as user:', data.user)
            break
          case 'room_owner_changed':
            this.emit('room:owner_changed', data)
            break
          case 'room_deleted':
            this.emit('room:deleted', data)
            break
          default:
            console.log('ClackClient: Unknown SSE event type:', data.type)
        }
      }

      private handleJSONPatch(patch: any): void {
        console.log('handleJSONPatch called with:', patch)
        const { op, path, value } = patch
        
        switch (op) {
          case 'add':
            if (path === '/users') {
              console.log('Emitting user:new event')
              this.emit('user:new', value)
            } else if (path === '/rooms') {
              console.log('Emitting room:new event')
              this.emit('room:new', value)
            } else if (path === '/messages') {
              this.emit('message:new', value)
            } else if (path.startsWith('/room_messages/')) {
              this.emit('room_message:new', value)
            }
            break
          
          case 'replace':
            if (path.startsWith('/rooms/')) {
              this.emit('room:updated', { room: value })
            }
            break
          
          case 'remove':
            // Handle removals if needed
            break
          
          default:
            console.log('ClackClient: Unknown JSON patch operation:', op)
        }
      }

  // MCP API methods
  private async makeMCPRequest(method: string, params: any = {}): Promise<any> {
    if (!this.token) {
      throw new Error('Authentication required')
    }

    this.requestId++
    const request = {
      jsonrpc: '2.0',
      id: this.requestId,
      method: 'tools/call',
      params: {
        name: method,
        arguments: params
      }
    }

    const response = await fetch(`${this.baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const jsonResponse = await response.json()
    if (jsonResponse.error) {
      throw new Error(jsonResponse.error.message)
    }

    return jsonResponse.result
  }

  // Chat service methods
  async sendMessage(senderId: number, otherUserId: number, content: string): Promise<Message> {
    const result = await this.makeMCPRequest('send_message', { senderId, otherUserId, content })
    return result.content[0].text ? JSON.parse(result.content[0].text).message : null
  }

  async createRoom(name: string, description: string, createdBy: number): Promise<Room> {
    const result = await this.makeMCPRequest('create_room', { name, description, createdBy })
    return result.content[0].text ? JSON.parse(result.content[0].text).room : null
  }

  async joinRoom(roomId: number, userId: number): Promise<boolean> {
    const result = await this.makeMCPRequest('join_room', { roomId, userId })
    return result.content[0].text ? JSON.parse(result.content[0].text).success : false
  }

  async leaveRoom(roomId: number, userId: number): Promise<boolean> {
    const result = await this.makeMCPRequest('leave_room', { roomId, userId })
    return result.content[0].text ? JSON.parse(result.content[0].text).success : false
  }

  async sendRoomMessage(senderId: number, roomId: number, content: string): Promise<Message> {
    const result = await this.makeMCPRequest('send_room_message', { senderId, roomId, content })
    return result.content[0].text ? JSON.parse(result.content[0].text).message : null
  }

  // Utility methods
  isConnected(): boolean {
    return (this.eventSource?.readyState ?? LDEventSource.CLOSED) === LDEventSource.OPEN
  }

  getConnectionState(): number {
    return this.eventSource?.readyState ?? LDEventSource.CLOSED
  }

  // Get all methods that use index range getters under the hood
  async getAllUsers(): Promise<User[]> {
    const allUsers: User[] = []
    const batchSize = 100
    let startIndex = 0
    
    while (true) {
      const endIndex = startIndex + batchSize
      const result = await this.makeMCPRequest('get_users_by_index_range', {
        startIndex,
        endIndex
      })
      
      // Unwrap MCP response format
      const unwrappedResult = result.content && result.content[0] && result.content[0].text 
        ? JSON.parse(result.content[0].text) 
        : result
      
      if (!unwrappedResult.success || !unwrappedResult.users || unwrappedResult.users.length === 0) {
        break
      }
      
      allUsers.push(...unwrappedResult.users)
      
      if (unwrappedResult.users.length < batchSize) {
        break
      }
      
      startIndex = endIndex
    }
    
    return allUsers
  }

  async getAllRooms(): Promise<Room[]> {
    console.log('ClackClient: Getting all rooms...')
    const allRooms: Room[] = []
    const batchSize = 100
    let startIndex = 0
    
    while (true) {
      const endIndex = startIndex + batchSize
      console.log(`ClackClient: Fetching rooms ${startIndex} to ${endIndex}`)
      const result = await this.makeMCPRequest('get_rooms_by_index_range', {
        startIndex,
        endIndex
      })
      
      console.log('ClackClient: get_rooms_by_index_range result:', result)
      
      // Unwrap MCP response format
      const unwrappedResult = result.content && result.content[0] && result.content[0].text 
        ? JSON.parse(result.content[0].text) 
        : result
      
      console.log('ClackClient: Unwrapped result:', unwrappedResult)
      
      if (!unwrappedResult.success || !unwrappedResult.rooms || unwrappedResult.rooms.length === 0) {
        console.log('ClackClient: No more rooms, breaking')
        break
      }
      
      allRooms.push(...unwrappedResult.rooms)
      console.log(`ClackClient: Added ${unwrappedResult.rooms.length} rooms, total: ${allRooms.length}`)
      
      if (unwrappedResult.rooms.length < batchSize) {
        console.log('ClackClient: Less than batch size, breaking')
        break
      }
      
      startIndex = endIndex
    }
    
    console.log('ClackClient: getAllRooms returning:', allRooms.length, 'rooms')
    return allRooms
  }

  async getAllMessages(userId: number): Promise<Message[]> {
    const allMessages: Message[] = []
    const batchSize = 100
    let startIndex = 0
    
    while (true) {
      const endIndex = startIndex + batchSize
      const result = await this.makeMCPRequest('get_messages_by_index_range', {
        startIndex,
        endIndex,
        userId
      })
      
      if (!result.success || !result.messages || result.messages.length === 0) {
        break
      }
      
      allMessages.push(...result.messages)
      
      if (result.messages.length < batchSize) {
        break
      }
      
      startIndex = endIndex
    }
    
    return allMessages
  }

  async getAllRoomMessages(roomId: number): Promise<Message[]> {
    const allMessages: Message[] = []
    const batchSize = 100
    let startIndex = 0
    
    while (true) {
      const endIndex = startIndex + batchSize
      const result = await this.makeMCPRequest('get_room_messages_by_index_range', {
        startIndex,
        endIndex,
        roomId
      })
      
      if (!result.success || !result.messages || result.messages.length === 0) {
        break
      }
      
      allMessages.push(...result.messages)
      
      if (result.messages.length < batchSize) {
        break
      }
      
      startIndex = endIndex
    }
    
    return allMessages
  }

  // Paginated message loading methods
  async getMessagesPage(userId: number, startIndex: number, batchSize: number = 50): Promise<Message[]> {
    const result = await this.makeMCPRequest('get_messages_by_index_range', {
      startIndex,
      endIndex: startIndex + batchSize,
      userId
    })
    
    // Unwrap MCP response format
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success || !unwrappedResult.messages) {
      return []
    }
    
    return unwrappedResult.messages
  }

  async getRoomMessagesPage(roomId: number, startIndex: number, batchSize: number = 50): Promise<Message[]> {
    const result = await this.makeMCPRequest('get_room_messages_by_index_range', {
      startIndex,
      endIndex: startIndex + batchSize,
      roomId
    })
    
    // Unwrap MCP response format
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success || !unwrappedResult.messages) {
      return []
    }
    
    return unwrappedResult.messages
  }

  async getUserRooms(userId: number): Promise<Room[]> {
    const result = await this.makeMCPRequest('get_user_rooms', { userId })
    
    // Unwrap MCP response format
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success || !unwrappedResult.rooms) {
      return []
    }
    
    return unwrappedResult.rooms
  }

  async changeRoomOwner(roomId: number, newOwnerId: number, currentOwnerId: number): Promise<any> {
    const result = await this.makeMCPRequest('change_room_owner', { 
      roomId, 
      newOwnerId, 
      currentOwnerId 
    })
    
    // Unwrap MCP response format
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success) {
      throw new Error(unwrappedResult.message || 'Failed to change room owner')
    }
    
    return unwrappedResult
  }

  async deleteRoom(roomId: number, ownerId: number): Promise<any> {
    const result = await this.makeMCPRequest('delete_room', { 
      roomId, 
      ownerId 
    })
    
    // Unwrap MCP response format
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success) {
      throw new Error(unwrappedResult.message || 'Failed to delete room')
    }
    
    return unwrappedResult
  }
}