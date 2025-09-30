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

export interface VersionInfo {
  monorepoVersion: string | null
  frontendVersion: string | null
  sdkVersion: string | null
  name: string | null
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
  'version:received': (version: VersionInfo) => void
}

export interface ClackClientOptions {
  baseUrl?: string
  token?: string
  username?: string
  password?: string
  autoReconnect?: boolean
  reconnectInterval?: number
}


export class ClackClient extends EventEmitter {
  private baseUrl: string
  private token: string | null = null
  private username: string | null = null
  private password: string | null = null
  private eventSource: EventSource | null = null
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
    this.username = options.username || null
    this.password = options.password || null
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

  setCredentials(username: string, password: string) {
    this.username = username
    this.password = password
    if (this.eventSource) {
      this.disconnect()
      this.connect()
    }
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return this.token !== null || (this.username !== null && this.password !== null)
  }

  // Connection management
  connect(): void {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required to connect')
    }

    this.disconnect() // Close any existing connection

    // SSE connections only support token authentication
    if (!this.token) {
      throw new Error('Token required for SSE connection. Use setToken() for real-time features.')
    }

    const url = `${this.baseUrl}/api/events?token=${this.token}`
    // Use native browser EventSource
    this.eventSource = new EventSource(url)

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
        if (Array.isArray(data)) {
          data.forEach(p => this.handleJSONPatch(p))
          return
        } else if (data.op && data.path && data.value !== undefined) {
          this.handleJSONPatch(data)
          return
        }
        
        // Handle legacy format for backward compatibility
        switch (data.type) {
          case 'connected':
            console.log('ClackClient: Connected as user:', data.user)
            if (data.version) {
              this.emit('version:received', data.version)
            }
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
              this.emit('room:updated', { room: value, joinedUserId: patch.joinedUserId })
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
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required')
    }

    // Validate arguments before sending
    try {
      const { validateBeforeSend, getValidationErrorMessage } = await import('../utils/mcpValidation');
      const validation = validateBeforeSend(method, params);
      if (!validation.isValid) {
        const errorMessage = getValidationErrorMessage(validation);
        throw new Error(`Validation failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Validation error:', error);
      throw error;
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add Bearer token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
      console.log('MCP Request - Token being sent:', this.token.substring(0, 20) + '...')
    } else {
      console.log('MCP Request - No token available')
    }

    // Add username/password authentication in headers
    if (this.username && this.password) {
      headers['X-Username'] = this.username
      headers['X-Password'] = this.password
    }

    console.log('MCP Request →', {
      method,
      params,
      headers: Object.keys(headers)
    })

    const response = await fetch(`${this.baseUrl}/api/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    })

    const responseClone = response.clone()

    if (!response.ok) {
      const errorBody = await responseClone.text()
      console.error('MCP Request failed ←', {
        method,
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      })
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    console.log('MCP Request success ←', {
      method,
      status: response.status,
      statusText: response.statusText
    })

    let jsonResponse
    try {
      jsonResponse = await response.json()
    } catch (error) {
      const errorBody = await responseClone.text()
      console.error('MCP Response JSON parse error ←', {
        method,
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        error
      })
      throw error
    }

    if (jsonResponse.error) {
      throw new Error(jsonResponse.error.message || 'Unknown MCP error')
    }

    return jsonResponse.result
  }

  // Chat service methods
  async sendMessage(otherUserId: number, content: string): Promise<Message> {
    const result = await this.makeMCPRequest('send_message', { otherUserId, content })
    return result.content[0].text ? JSON.parse(result.content[0].text).message : {} as Message
  }

  async createRoom(name: string, description: string): Promise<Room> {
    const result = await this.makeMCPRequest('create_room', { name, description })
    return result.content[0].text ? JSON.parse(result.content[0].text).room : {} as Room
  }

  async joinRoom(roomId: number): Promise<boolean> {
    const result = await this.makeMCPRequest('join_room', { roomId })
    return result.content[0].text ? JSON.parse(result.content[0].text).success : false
  }

  async leaveRoom(roomId: number): Promise<boolean> {
    const result = await this.makeMCPRequest('leave_room', { roomId })
    return result.content[0].text ? JSON.parse(result.content[0].text).success : false
  }

  async sendRoomMessage(roomId: number, content: string): Promise<Message> {
    const result = await this.makeMCPRequest('send_room_message', { roomId, content })
    return result.content[0].text ? JSON.parse(result.content[0].text).message : {} as Message
  }

  // Utility methods
  isConnected(): boolean {
    return (this.eventSource?.readyState ?? EventSource.CLOSED) === EventSource.OPEN
  }

  getConnectionState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED
  }

  // Get all methods that use index range getters under the hood
  async getAllUsers(): Promise<User[]> {
    console.log('🔍 ClackClient: Getting all users...')
    console.log('📦 Client version: 0.6.28 (with server-side filtering)')
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

      if (unwrappedResult.patches) {
        // Convert patches back to users array for compatibility
        const users = unwrappedResult.patches.map((patch: any) => ({
          id: parseInt(patch.path.split('/')[2]),
          username: patch.value.name,
          created_at: new Date().toISOString()
        }))
        allUsers.push(...users)
      } else if (unwrappedResult.users) {
        // Handle old format for backward compatibility
        allUsers.push(...unwrappedResult.users)
      }
      
      if (!unwrappedResult.success || (unwrappedResult.users && unwrappedResult.users.length === 0) || (unwrappedResult.patches && unwrappedResult.patches.length === 0)) {
        break
      }
      
      const userCount = unwrappedResult.users ? unwrappedResult.users.length : (unwrappedResult.patches ? unwrappedResult.patches.length : 0)
      if (userCount < batchSize) {
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
      
      if (unwrappedResult.patches) {
        // Convert patches back to rooms array for compatibility
        const rooms = unwrappedResult.patches.map((patch: any) => ({
          id: parseInt(patch.path.split('/')[2]),
          name: patch.value.name,
          description: '',
          created_by: patch.value.ownerId,
          created_at: new Date().toISOString(),
          created_by_username: 'Unknown',
          member_count: 0
        }))
        allRooms.push(...rooms)
        console.log(`ClackClient: Added ${rooms.length} rooms, total: ${allRooms.length}`)
      } else if (unwrappedResult.rooms) {
        // Handle old format for backward compatibility
        allRooms.push(...unwrappedResult.rooms)
        console.log(`ClackClient: Added ${unwrappedResult.rooms.length} rooms, total: ${allRooms.length}`)
      }
      
      if (!unwrappedResult.success || (unwrappedResult.rooms && unwrappedResult.rooms.length === 0) || (unwrappedResult.patches && unwrappedResult.patches.length === 0)) {
        console.log('ClackClient: No more rooms, breaking')
        break
      }
      
      const roomCount = unwrappedResult.rooms ? unwrappedResult.rooms.length : (unwrappedResult.patches ? unwrappedResult.patches.length : 0)
      if (roomCount < batchSize) {
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

  async getMessagesBetweenUsersPage(authenticatedUserId: number, otherUserId: number, startIndex: number, batchSize: number = 50): Promise<Message[]> {
    console.log('🔍 getMessagesBetweenUsersPage Debug:')
    console.log('- Authenticated user:', authenticatedUserId)
    console.log('- Other user:', otherUserId)
    console.log('- Start index:', startIndex)
    console.log('- Batch size:', batchSize)
    console.log('- Using server-side filtering with otherUserId parameter')
    
    // Use the existing tool with otherUserId parameter for server-side filtering
    const result = await this.makeMCPRequest('get_messages_by_index_range', {
      startIndex,
      endIndex: startIndex + batchSize,
      userId: authenticatedUserId,
      otherUserId
    })
    
    console.log('📡 MCP Request result:', result)
    
    // Unwrap MCP response format
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    console.log('📦 Unwrapped result:', unwrappedResult)
    
    if (!unwrappedResult.success || !unwrappedResult.messages) {
      console.log('❌ No messages returned')
      return []
    }
    
    console.log('✅ Server returned', unwrappedResult.messages.length, 'messages')
    console.log('📝 Sample message:', unwrappedResult.messages[0])
    
    // No client-side filtering needed - server returns exactly what we want
    return unwrappedResult.messages
  }

  // Human-friendly MCP helpers using usernames and room names
  async sendMessageByUsername(username: string, content: string): Promise<void> {
    const result = await this.makeMCPRequest('send_user_message_by_username', {
      otherUserName: username,
      content
    })
    
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success) {
      throw new Error(unwrappedResult.error || 'Failed to send message')
    }
  }

  async getMessagesByUsername(username: string, startIndex: number, endIndex: number): Promise<Message[]> {
    const result = await this.makeMCPRequest('get_user_messages_latest_by_username_by_index_range', {
      otherUserName: username,
      startIndex,
      endIndex
    })
    
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success || !unwrappedResult.messages) {
      return []
    }
    
    return unwrappedResult.messages
  }

  async joinRoomByName(roomName: string): Promise<boolean> {
    const result = await this.makeMCPRequest('join_room_by_name', {
      roomName
    })
    
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    return unwrappedResult.success || false
  }

  async leaveRoomByName(roomName: string): Promise<boolean> {
    const result = await this.makeMCPRequest('leave_room_by_name', {
      roomName
    })
    
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    return unwrappedResult.success || false
  }

  async sendRoomMessageByName(roomName: string, content: string): Promise<void> {
    const result = await this.makeMCPRequest('send_room_message_by_name', {
      roomName,
      content
    })
    
    const unwrappedResult = result.content && result.content[0] && result.content[0].text 
      ? JSON.parse(result.content[0].text) 
      : result
    
    if (!unwrappedResult.success) {
      throw new Error(unwrappedResult.error || 'Failed to send room message')
    }
  }

  async getRoomMessagesByName(roomName: string, startIndex: number, endIndex: number): Promise<Message[]> {
    const result = await this.makeMCPRequest('get_room_messages_latest_by_name_by_index_range', {
      roomName,
      startIndex,
      endIndex
    })
    
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