import { Database } from 'bun:sqlite';
import { MCPProvider } from './mcpProvider.js';
import { ProviderRegistry } from './providerRegistry.js';

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
    {
      name: 'send_message',
      description: 'Send a message between two users',
      inputSchema: {
        type: 'object',
        properties: {
          otherUserId: { type: 'number', description: 'ID of the other user' },
          content: { type: 'string', description: 'Message content' }
        },
        required: ['otherUserId', 'content']
      }
    },
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
    // Time range getters
    {
      name: 'get_users_by_time_range',
      description: 'Get users created within a time range',
      inputSchema: {
        type: 'object',
        properties: {
          startTime: { type: 'string', description: 'Start time in ISO format' },
          endTime: { type: 'string', description: 'End time in ISO format' }
        },
        required: ['startTime', 'endTime']
      }
    },
    {
      name: 'get_rooms_by_time_range',
      description: 'Get rooms created within a time range',
      inputSchema: {
        type: 'object',
        properties: {
          startTime: { type: 'string', description: 'Start time in ISO format' },
          endTime: { type: 'string', description: 'End time in ISO format' }
        },
        required: ['startTime', 'endTime']
      }
    },
    {
      name: 'get_messages_by_time_range',
      description: 'Get messages sent within a time range',
      inputSchema: {
        type: 'object',
        properties: {
          startTime: { type: 'string', description: 'Start time in ISO format' },
          endTime: { type: 'string', description: 'End time in ISO format' },
          userId: { type: 'number', description: 'User ID to filter messages for' }
        },
        required: ['startTime', 'endTime', 'userId']
      }
    },
    {
      name: 'get_room_messages_by_time_range',
      description: 'Get room messages sent within a time range',
      inputSchema: {
        type: 'object',
        properties: {
          startTime: { type: 'string', description: 'Start time in ISO format' },
          endTime: { type: 'string', description: 'End time in ISO format' },
          roomId: { type: 'number', description: 'Room ID to filter messages for' }
        },
        required: ['startTime', 'endTime', 'roomId']
      }
    },
    // Index range getters
    {
      name: 'get_users_by_index_range',
      description: 'Get users by index range (for pagination)',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' }
        },
        required: ['startIndex', 'endIndex']
      }
    },
    {
      name: 'get_rooms_by_index_range',
      description: 'Get rooms by index range (for pagination)',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' }
        },
        required: ['startIndex', 'endIndex']
      }
    },
    {
      name: 'get_messages_by_index_range',
      description: 'Get messages by index range (for pagination)',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' },
          userId: { type: 'number', description: 'User ID to filter messages for' }
        },
        required: ['startIndex', 'endIndex', 'userId']
      }
    },
    {
      name: 'get_messages_between_users_by_index_range',
      description: 'Get messages between two specific users by index range (for pagination)',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' },
          userA: { type: 'number', description: 'First user ID' },
          userB: { type: 'number', description: 'Second user ID' }
        },
        required: ['startIndex', 'endIndex', 'userA', 'userB']
      }
    },
    {
      name: 'get_room_messages_by_index_range',
      description: 'Get room messages by index range (for pagination)',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'Start index (0-based)' },
          endIndex: { type: 'number', description: 'End index (exclusive)' },
          roomId: { type: 'number', description: 'Room ID to filter messages for' }
        },
        required: ['startIndex', 'endIndex', 'roomId']
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
    }
  ];
}

export async function getToolsList(db: Database): Promise<MCPTool[]> {
  return createChatTools(db);
}

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

      switch (toolName) {
        case 'send_message': {
          const { otherUserId, content } = toolArgs;
          const senderId = headers.userId;
          console.log(`[MCP-Tools] Headers received:`, JSON.stringify(headers, null, 2));
          console.log(`[MCP-Tools] send_message - senderId: ${senderId}, otherUserId: ${otherUserId}, content: ${content}`);
          console.log(`[MCP-Tools] headers.userId: ${headers.userId}`);
          console.log(`[MCP-Tools] headers.username: ${headers.username}`);
          if (!senderId || !otherUserId || !content) {
            throw new Error('Missing required field: senderId from authentication or otherUserId/content');
          }
          
          return await provider.sendMessage(senderId, otherUserId, content);
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

        // Time range getters
        case 'get_users_by_time_range': {
          const { startTime, endTime } = toolArgs;
          if (!startTime || !endTime) {
            throw new Error('startTime and endTime are required');
          }
          
          return await provider.getUsersByTimeRange(startTime, endTime);
        }

        case 'get_rooms_by_time_range': {
          const { startTime, endTime } = toolArgs;
          if (!startTime || !endTime) {
            throw new Error('startTime and endTime are required');
          }
          
          return await provider.getRoomsByTimeRange(startTime, endTime);
        }

        case 'get_messages_by_time_range': {
          const { startTime, endTime, userId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (!startTime || !endTime || !userId) {
            throw new Error('startTime, endTime and userId are required');
          }
          
          // Security: Only allow users to access their own messages
          if (!authenticatedUserId || authenticatedUserId !== userId) {
            throw new Error('Unauthorized: You can only access your own messages');
          }
          
          return await provider.getMessagesByTimeRange(startTime, endTime, userId);
        }

        case 'get_room_messages_by_time_range': {
          const { startTime, endTime, roomId } = toolArgs;
          if (!startTime || !endTime || !roomId) {
            throw new Error('startTime, endTime and roomId are required');
          }
          
          return await provider.getRoomMessagesByTimeRange(startTime, endTime, roomId);
        }

        // Index range getters
        case 'get_users_by_index_range': {
          const { startIndex, endIndex } = toolArgs;
          if (startIndex === undefined || endIndex === undefined) {
            throw new Error('startIndex and endIndex are required');
          }
          
          return await provider.getUsersByIndexRange(startIndex, endIndex);
        }

        case 'get_rooms_by_index_range': {
          const { startIndex, endIndex } = toolArgs;
          if (startIndex === undefined || endIndex === undefined) {
            throw new Error('startIndex and endIndex are required');
          }
          
          return await provider.getRoomsByIndexRange(startIndex, endIndex);
        }

        case 'get_messages_by_index_range': {
          const { startIndex, endIndex, userId } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (startIndex === undefined || endIndex === undefined || !userId) {
            throw new Error('startIndex, endIndex and userId are required');
          }
          
          // Security: Only allow users to access their own messages
          if (!authenticatedUserId || authenticatedUserId !== userId) {
            throw new Error('Unauthorized: You can only access your own messages');
          }
          
          return await provider.getMessagesByIndexRange(startIndex, endIndex, userId);
        }

        case 'get_messages_between_users_by_index_range': {
          const { startIndex, endIndex, userA, userB } = toolArgs;
          const authenticatedUserId = headers.userId;
          
          if (startIndex === undefined || endIndex === undefined || !userA || !userB) {
            throw new Error('startIndex, endIndex, userA and userB are required');
          }
          
          // Security: Only allow users to access messages in conversations they're part of
          if (!authenticatedUserId || (authenticatedUserId !== userA && authenticatedUserId !== userB)) {
            throw new Error('Unauthorized: You can only access messages in conversations you participate in');
          }
          
          return await provider.getMessagesBetweenUsersByIndexRange(startIndex, endIndex, userA, userB);
        }

        case 'get_room_messages_by_index_range': {
          const { startIndex, endIndex, roomId } = toolArgs;
          if (startIndex === undefined || endIndex === undefined || !roomId) {
            throw new Error('startIndex, endIndex and roomId are required');
          }
          
          return await provider.getRoomMessagesByIndexRange(startIndex, endIndex, roomId);
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

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
}

export async function buildRegistry(db: Database): Promise<MCPToolRegistry> {
  const tools = await getToolsList(db);
  const byName = new Map(tools.map(tool => [tool.name, tool]));
  
  return { byName, tools };
}
