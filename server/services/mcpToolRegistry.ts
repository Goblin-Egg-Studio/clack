import { Database } from 'bun:sqlite';
import { MCPProvider } from './mcpProvider.js';
import { ProviderRegistry } from './providerRegistry.js';
import type { Message, User, Room } from './chatService.js'

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolRegistry {
  byName: Map<string, MCPTool>;
  tools: MCPTool[];
}

// Chat-specific MCP tools
export function createChatTools(db: Database): MCPTool[] {
  return [
    // Index shortcuts (renames)
    {
      name: 'get_users_by_index',
      description: 'Get users by index range',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number' },
          endIndex: { type: 'number' }
        },
        required: ['startIndex', 'endIndex']
      }
    },
    {
      name: 'get_rooms_by_index',
      description: 'Get rooms by index range',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number' },
          endIndex: { type: 'number' }
        },
        required: ['startIndex', 'endIndex']
      }
    },
    { name: 'send_user_message_by_id', description: 'Send DM to user by ID', inputSchema: { type: 'object', properties: { otherUserId: { type: 'number' }, content: { type: 'string' } }, required: ['otherUserId', 'content'] } },
    { name: 'send_user_message_by_username', description: 'Send DM to user by username', inputSchema: { type: 'object', properties: { otherUsername: { type: 'string' }, content: { type: 'string' } }, required: ['otherUsername', 'content'] } },
    { name: 'send_message', description: 'Send message to user (legacy)', inputSchema: { type: 'object', properties: { otherUserId: { type: 'number' }, content: { type: 'string' } }, required: ['otherUserId', 'content'] } },
    {
      name: 'create_room',
      description: 'Create a new chat room',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Room name' },
          description: { type: 'string', description: 'Room description' }
        },
        required: ['name']
      }
    },
    {
      name: 'join_room',
      description: 'Join a chat room',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'number', description: 'ID of the room to join' }
        },
        required: ['roomId']
      }
    },
    {
      name: 'leave_room',
      description: 'Leave a chat room',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'number', description: 'ID of the room to leave' }
        },
        required: ['roomId']
      }
    },
    {
      name: 'send_room_message',
      description: 'Send a message to a room',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'number', description: 'ID of the room' },
          content: { type: 'string', description: 'Message content' }
        },
        required: ['roomId', 'content']
      }
    },
    // Index range getters
    // keep old names for compatibility (temporarily)
    { name: 'get_users_by_index_range', description: 'Deprecated: use get_users_by_index', inputSchema: { type: 'object', properties: { startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['startIndex', 'endIndex'] } },
    { name: 'get_rooms_by_index_range', description: 'Deprecated: use get_rooms_by_index', inputSchema: { type: 'object', properties: { startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['startIndex', 'endIndex'] } },
    { name: 'debug_test_tool', description: 'Debug tool to test server updates', inputSchema: { type: 'object', properties: {}, required: [] } },
    { name: 'get_user_messages_latest', description: 'Get latest messages with specific user', inputSchema: { type: 'object', properties: { otherUserId: { type: 'number' }, limit: { type: 'number', description: 'Number of messages to return (default: 50)' } }, required: ['otherUserId'] } },
    { name: 'get_user_messages_latest_by_id_by_index_range', description: 'DMs with otherUserId latest-first by range', inputSchema: { type: 'object', properties: { otherUserId: { type: 'number' }, startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['otherUserId', 'startIndex', 'endIndex'] } },
    { name: 'get_user_messages_latest_by_username_by_index_range', description: 'DMs with otherUsername latest-first by range', inputSchema: { type: 'object', properties: { otherUsername: { type: 'string' }, startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['otherUsername', 'startIndex', 'endIndex'] } },
    { name: 'get_room_messages_latest_by_id_by_index_range', description: 'Room messages latest-first by range', inputSchema: { type: 'object', properties: { roomId: { type: 'number' }, startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['roomId', 'startIndex', 'endIndex'] } },
    { name: 'get_room_messages_latest_by_name_by_index_range', description: 'Room messages by name latest-first by range', inputSchema: { type: 'object', properties: { roomName: { type: 'string' }, startIndex: { type: 'number' }, endIndex: { type: 'number' } }, required: ['roomName', 'startIndex', 'endIndex'] } },
    {
      name: 'get_messages_by_index_range',
      description: 'Get messages by index range for authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' },
          userId: { type: 'number', description: 'User ID to filter messages for' },
          otherUserId: { type: 'number', description: 'Optional: filter to specific conversation' }
        },
        required: ['startIndex', 'endIndex', 'userId']
      }
    },
    {
      name: 'get_messages_with_user',
      description: 'Get messages between authenticated user and specific other user (secure)',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' },
          otherUserId: { type: 'number', description: 'Other user ID' }
        },
        required: ['startIndex', 'endIndex', 'otherUserId']
      }
    },
    {
      name: 'get_user_rooms',
      description: 'Get rooms that a user is a member of',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'number', description: 'User ID' }
        },
        required: ['userId']
      }
    },
    {
      name: 'change_room_owner',
      description: 'Change the owner of a room (only current owner can do this)',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'number', description: 'Room ID' },
          newOwnerId: { type: 'number', description: 'New owner user ID' },
          currentOwnerId: { type: 'number', description: 'Current owner user ID (for verification)' }
        },
        required: ['roomId', 'newOwnerId', 'currentOwnerId']
      }
    },
    {
      name: 'delete_room',
      description: 'Delete a room (only owner can do this)',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: { type: 'number', description: 'Room ID' },
          ownerId: { type: 'number', description: 'Owner user ID (for verification)' }
        },
        required: ['roomId', 'ownerId']
      }
    },
    {
      name: 'delete_user',
      description: 'Delete a user (only admins can do this)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'number', description: 'User ID to delete' },
          adminId: { type: 'number', description: 'Admin user ID (for verification)' }
        },
        required: ['userId', 'adminId']
      }
    }
  ];
}

export async function getToolsList(db: Database): Promise<MCPTool[]> {
  return createChatTools(db);
}

/**
 * CRITICAL SECURITY PRINCIPLE:
 * ALL MCP TOOLS MUST OPERATE IN THE CONTEXT OF THE AUTHENTICATED USER
 * 
 * This means:
 * - Users can ONLY access their own data
 * - Users can ONLY access conversations they participate in
 * - Users can ONLY access rooms they are members of
 * - Users can ONLY perform actions they are authorized for
 * 
 * NEVER allow users to access other users' data or perform unauthorized actions.
 * Always validate that headers.userId matches the requested user context.
 */
export async function executeToolByName(
  toolName: string, 
  toolArgs: Record<string, any>, 
  providerRegistry: ProviderRegistry,
  headers: Record<string, any> = {}
): Promise<any> {
  console.log(`[MCP-Tools] Executing tool: ${toolName} with args:`, toolArgs);
  console.log(`[MCP-Tools] Headers received:`, headers);

  // For now, we'll use the 'chat' provider by default
  // In the future, tools could specify which provider to use
  const provider = providerRegistry.getProvider('chat');
  if (!provider) {
    throw new Error('Chat provider not found');
  }

      // Helpers to build JSON Patch arrays in the client's dataTree shape
      const addUserPatch = (user: User) => ({
        op: 'add',
        path: `/users/${user.id}`,
        value: { name: user.username, messages: {} }
      })

      const addRoomPatch = (room: Room) => ({
        op: 'add',
        path: `/rooms/${room.id}`,
        value: { name: room.name, ownerId: room.created_by, messages: {} }
      })

      const addDmMessagePatches = (msg: Message) => [
        {
          op: 'add',
          path: `/users/${msg.user_a}/messages/${msg.id}`,
          value: { timestamp: msg.created_at, message: msg.content, sender: msg.sender_id }
        },
        {
          op: 'add',
          path: `/users/${msg.user_b}/messages/${msg.id}`,
          value: { timestamp: msg.created_at, message: msg.content, sender: msg.sender_id }
        }
      ]

      const addRoomMessagePatch = (msg: Message) => ({
        op: 'add',
        path: `/rooms/${msg.room_id}/messages/${msg.id}`,
        value: { timestamp: msg.created_at, message: msg.content, sender: msg.sender_id }
      })

      switch (toolName) {
        // Renamed index tools
        case 'get_users_by_index':
        case 'get_users_by_index_range': {
          const { startIndex, endIndex } = toolArgs;
          if (startIndex === undefined || endIndex === undefined) {
            throw new Error('startIndex and endIndex are required');
          }
          const result = await provider.getUsersByIndexRange(startIndex, endIndex);
          const users: User[] = result.users || result;
          const patches = users.map(addUserPatch)
          return { success: true, patches };
        }

        case 'get_rooms_by_index':
        case 'get_rooms_by_index_range': {
          const { startIndex, endIndex } = toolArgs;
          if (startIndex === undefined || endIndex === undefined) {
            throw new Error('startIndex and endIndex are required');
          }
          const result = await provider.getRoomsByIndexRange(startIndex, endIndex);
          const rooms: Room[] = result.rooms || result;
          const patches = rooms.map(addRoomPatch)
          return { success: true, patches };
        }
        case 'send_user_message_by_id': {
          const { otherUserId, content } = toolArgs;
          const senderId = headers.userId;
          console.log(`[MCP-Tools] Headers received:`, JSON.stringify(headers, null, 2));
          console.log(`[MCP-Tools] send_message - senderId: ${senderId}, otherUserId: ${otherUserId}, content: ${content}`);
          console.log(`[MCP-Tools] headers.userId: ${headers.userId}`);
          console.log(`[MCP-Tools] headers.username: ${headers.username}`);
          if (!senderId || !otherUserId || !content) {
            throw new Error('Missing required field: senderId from authentication or otherUserId/content');
          }
          
          const msg: Message = await provider.sendMessage(senderId, otherUserId, content);
          const patches = addDmMessagePatches(msg)
          return { success: true, patches };
        }

        case 'send_user_message_by_username': {
          const { otherUsername, content } = toolArgs;
          const senderId = headers.userId;
          if (!senderId || !otherUsername || !content) {
            throw new Error('Missing required field: senderId from authentication or otherUsername/content');
          }
          const user = await (provider as any).chatService.getUserByUsername(otherUsername);
          if (!user) throw new Error('User not found');
          const msg: Message = await provider.sendMessage(senderId, user.id, content);
          const patches = addDmMessagePatches(msg)
          return { success: true, patches };
        }

        case 'send_message': {
          const { otherUserId, content } = toolArgs;
          const senderId = headers.userId;
          if (!senderId || !otherUserId || !content) {
            throw new Error('Missing required field: senderId from authentication or otherUserId/content');
          }
          const msg: Message = await provider.sendMessage(senderId, otherUserId, content);
          const patches = addDmMessagePatches(msg)
          return { success: true, patches };
        }

        case 'create_room': {
          const { name, description } = toolArgs;
          const createdBy = headers.userId;
          if (!name || !createdBy) {
            throw new Error('name is required, and user must be authenticated');
          }
          
          return await provider.createRoom(name, description || '', createdBy);
        }

        case 'join_room': {
          const { roomId } = toolArgs;
          const userId = headers.userId;
          if (!roomId || !userId) {
            throw new Error('roomId is required, and user must be authenticated');
          }
          
          return await provider.joinRoom(roomId, userId);
        }

        case 'leave_room': {
          const { roomId } = toolArgs;
          const userId = headers.userId;
          if (!roomId || !userId) {
            throw new Error('roomId is required, and user must be authenticated');
          }
          
          return await provider.leaveRoom(roomId, userId);
        }

        case 'send_room_message': {
          const { roomId, content } = toolArgs;
          const senderId = headers.userId;
          if (!senderId || !roomId || !content) {
            throw new Error('roomId and content are required, and user must be authenticated');
          }
          
          return await provider.sendRoomMessage(senderId, roomId, content);
        }


        // Index range getters
        

        case 'get_messages_by_index_range': {
          const { startIndex, endIndex, userId, otherUserId } = toolArgs;
          const authenticatedUserId = headers.userId;

          if (startIndex === undefined || endIndex === undefined || !userId) {
            throw new Error('startIndex, endIndex and userId are required');
          }

          // Security: Only allow users to access their own messages
          if (!authenticatedUserId || authenticatedUserId !== userId) {
            throw new Error('Unauthorized: You can only access your own messages');
          }
          
          // If otherUserId is provided, filter to specific conversation
          if (otherUserId) {
            return await provider.getMessagesBetweenUsersByIndexRange(startIndex, endIndex, userId, otherUserId);
          } else {
            return await provider.getMessagesByIndexRange(startIndex, endIndex, userId);
          }
        }

        case 'get_messages_with_user': {
          const { startIndex, endIndex, otherUserId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (startIndex === undefined || endIndex === undefined || !otherUserId) {
            throw new Error('startIndex, endIndex and otherUserId are required');
          }
          
          // Security: Only allow users to access conversations they're part of
          if (!authenticatedUserId) {
            throw new Error('Unauthorized: You must be authenticated');
          }
          
          return await provider.getMessagesBetweenUsersByIndexRange(startIndex, endIndex, authenticatedUserId, otherUserId);
        }


        case 'debug_test_tool': {
          return { 
            success: true, 
            message: 'Debug tool working - server updated!',
            timestamp: new Date().toISOString(),
            serverVersion: '0.6.28'
          };
        }

        case 'get_user_messages_latest': {
          const { otherUserId, limit = 50 } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (!otherUserId) {
            throw new Error('otherUserId is required');
          }
          
          // Security: Only allow users to access conversations they're part of
          if (!authenticatedUserId) {
            throw new Error('Unauthorized: You must be authenticated');
          }
          
          // Use the latest-first method so index 0 = newest message
          return await provider.getMessagesBetweenUsersByIndexRangeLatest(0, limit, authenticatedUserId, otherUserId);
        }

        case 'get_user_messages_latest_by_id_by_index_range': {
          const { otherUserId, startIndex, endIndex } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (startIndex === undefined || endIndex === undefined || !otherUserId) {
            throw new Error('startIndex, endIndex and otherUserId are required');
          }
          
          // Security
          if (!authenticatedUserId) {
            throw new Error('Unauthorized: You can only access messages in conversations you participate in');
          }
          
          const msgs: Message[] = await (provider as any).chatService.getMessagesBetweenUsersByIndexRangeLatest(startIndex, endIndex, authenticatedUserId, otherUserId);
          const patches = msgs.flatMap(addDmMessagePatches)
          return { success: true, patches };
        }

        case 'get_user_messages_latest_by_username_by_index_range': {
          const { otherUsername, startIndex, endIndex } = toolArgs;
          const authenticatedUserId = headers.userId;
          if (startIndex === undefined || endIndex === undefined || !otherUsername) {
            throw new Error('startIndex, endIndex and otherUsername are required');
          }
          if (!authenticatedUserId) {
            throw new Error('Unauthorized');
          }
          const user = await (provider as any).chatService.getUserByUsername(otherUsername);
          if (!user) throw new Error('User not found');
          const msgs: Message[] = await (provider as any).chatService.getMessagesBetweenUsersByIndexRangeLatest(startIndex, endIndex, authenticatedUserId, user.id);
          const patches = msgs.flatMap(addDmMessagePatches)
          return { success: true, patches };
        }

        case 'get_room_messages_latest_by_id_by_index_range': {
          const { roomId, startIndex, endIndex } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (startIndex === undefined || endIndex === undefined || !roomId) {
            throw new Error('startIndex, endIndex and roomId are required');
          }
          
          // Security: Only allow authenticated users to access room messages
          if (!authenticatedUserId) {
            throw new Error('Unauthorized: You must be authenticated');
          }
          
          // TODO: Add room membership validation to ensure user is in the room
          const msgs: Message[] = await (provider as any).chatService.getRoomMessagesByIndexRangeLatest(startIndex, endIndex, roomId);
          const patches = msgs.map(addRoomMessagePatch)
          return { success: true, patches };
        }

        case 'get_room_messages_latest_by_name_by_index_range': {
          const { roomName, startIndex, endIndex } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (startIndex === undefined || endIndex === undefined || !roomName) {
            throw new Error('startIndex, endIndex and roomName are required');
          }
          
          // Security: Only allow authenticated users to access room messages
          if (!authenticatedUserId) {
            throw new Error('Unauthorized: You must be authenticated');
          }
          
          const room = await (provider as any).chatService.getRoomByName(roomName);
          if (!room) throw new Error('Room not found');
          
          // TODO: Add room membership validation to ensure user is in the room
          const msgs: Message[] = await (provider as any).chatService.getRoomMessagesByIndexRangeLatest(startIndex, endIndex, room.id);
          const patches = msgs.map(addRoomMessagePatch)
          return { success: true, patches };
        }

        case 'get_user_rooms': {
          const { userId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (!userId) {
            throw new Error('userId is required');
          }
          
          // Security: Only allow users to access their own rooms
          if (!authenticatedUserId || authenticatedUserId !== userId) {
            throw new Error('Unauthorized: You can only access your own rooms');
          }
          
          return await provider.getUserRooms(userId);
        }

        case 'change_room_owner': {
          const { roomId, newOwnerId, currentOwnerId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (!roomId || !newOwnerId || !currentOwnerId) {
            throw new Error('roomId, newOwnerId, and currentOwnerId are required');
          }
          
          // Security: Only allow the current owner to change ownership
          if (!authenticatedUserId || authenticatedUserId !== currentOwnerId) {
            throw new Error('Unauthorized: Only the current room owner can transfer ownership');
          }
          
          return await provider.changeRoomOwner(roomId, newOwnerId, currentOwnerId);
        }

        case 'delete_room': {
          const { roomId, ownerId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (!roomId || !ownerId) {
            throw new Error('roomId and ownerId are required');
          }
          
          // Security: Only allow the room owner to delete the room
          if (!authenticatedUserId || authenticatedUserId !== ownerId) {
            throw new Error('Unauthorized: Only the room owner can delete the room');
          }
          
          return await provider.deleteRoom(roomId, ownerId);
        }

        case 'delete_user': {
          const { userId, adminId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (!userId || !adminId) {
            throw new Error('userId and adminId are required');
          }
          
          // Security: Only allow the authenticated admin to delete users
          if (!authenticatedUserId || authenticatedUserId !== adminId) {
            throw new Error('Unauthorized: Only the authenticated admin can delete users');
          }
          
          return await provider.deleteUser(userId, adminId);
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
}

export async function buildRegistry(db: Database): Promise<MCPToolRegistry> {
  const tools = await getToolsList(db);
  const byName = new Map(tools.map(tool => [tool.name, tool]));
  
  return { byName, tools };
}
