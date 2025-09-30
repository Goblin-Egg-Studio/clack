export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// MCP tool schemas - these should match the server-side schemas
const MCP_TOOL_SCHEMAS: Record<string, any> = {
  'send_message': {
    type: 'object',
    properties: {
      otherUserId: { type: 'number', description: 'ID of the other user' },
      content: { type: 'string', description: 'Message content' }
    },
    required: ['otherUserId', 'content']
  },
  'send_room_message': {
    type: 'object',
    properties: {
      roomId: { type: 'number', description: 'ID of the room' },
      content: { type: 'string', description: 'Message content' }
    },
    required: ['roomId', 'content']
  },
  'create_room': {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Room name' },
      description: { type: 'string', description: 'Room description' }
    },
    required: ['name']
  },
  'join_room': {
    type: 'object',
    properties: {
      roomId: { type: 'number', description: 'ID of the room to join' }
    },
    required: ['roomId']
  },
  'leave_room': {
    type: 'object',
    properties: {
      roomId: { type: 'number', description: 'ID of the room to leave' }
    },
    required: ['roomId']
  },
  'get_users_by_time_range': {
    type: 'object',
    properties: {
      startTime: { type: 'string', description: 'Start time in ISO format' },
      endTime: { type: 'string', description: 'End time in ISO format' }
    },
    required: ['startTime', 'endTime']
  },
  'get_rooms_by_time_range': {
    type: 'object',
    properties: {
      startTime: { type: 'string', description: 'Start time in ISO format' },
      endTime: { type: 'string', description: 'End time in ISO format' }
    },
    required: ['startTime', 'endTime']
  },
  'get_messages_by_time_range': {
    type: 'object',
    properties: {
      startTime: { type: 'string', description: 'Start time in ISO format' },
      endTime: { type: 'string', description: 'End time in ISO format' },
      userId: { type: 'number', description: 'User ID to filter messages for' }
    },
    required: ['startTime', 'endTime', 'userId']
  },
  'get_room_messages_by_time_range': {
    type: 'object',
    properties: {
      startTime: { type: 'string', description: 'Start time in ISO format' },
      endTime: { type: 'string', description: 'End time in ISO format' },
      roomId: { type: 'number', description: 'Room ID to filter messages for' }
    },
    required: ['startTime', 'endTime', 'roomId']
  },
  'get_users_by_index_range': {
    type: 'object',
    properties: {
      startIndex: { type: 'number', description: 'Start index (0-based)' },
      endIndex: { type: 'number', description: 'End index (exclusive)' }
    },
    required: ['startIndex', 'endIndex']
  },
  'get_rooms_by_index_range': {
    type: 'object',
    properties: {
      startIndex: { type: 'number', description: 'Start index (0-based)' },
      endIndex: { type: 'number', description: 'End index (exclusive)' }
    },
    required: ['startIndex', 'endIndex']
  },
  'get_messages_by_index_range': {
    type: 'object',
    properties: {
      startIndex: { type: 'number', description: 'Start index (0-based)' },
      endIndex: { type: 'number', description: 'End index (exclusive)' },
      userId: { type: 'number', description: 'User ID to filter messages for' }
    },
    required: ['startIndex', 'endIndex', 'userId']
  },
  'get_room_messages_by_index_range': {
    type: 'object',
    properties: {
      startIndex: { type: 'number', description: 'Start index (0-based)' },
      endIndex: { type: 'number', description: 'End index (exclusive)' },
      roomId: { type: 'number', description: 'Room ID to filter messages for' }
    },
    required: ['startIndex', 'endIndex', 'roomId']
  },
  'get_user_rooms': {
    type: 'object',
    properties: {
      userId: { type: 'number', description: 'User ID' }
    },
    required: ['userId']
  },
  'change_room_owner': {
    type: 'object',
    properties: {
      roomId: { type: 'number', description: 'Room ID' },
      newOwnerId: { type: 'number', description: 'New owner user ID' },
      currentOwnerId: { type: 'number', description: 'Current owner user ID' }
    },
    required: ['roomId', 'newOwnerId', 'currentOwnerId']
  },
  'delete_room': {
    type: 'object',
    properties: {
      roomId: { type: 'number', description: 'Room ID' },
      ownerId: { type: 'number', description: 'Owner user ID' }
    },
    required: ['roomId', 'ownerId']
  }
};

export function getMCPToolSchema(toolName: string): any {
  return MCP_TOOL_SCHEMAS[toolName];
}

export function validateMCPToolArguments(toolName: string, args: any): ValidationResult {
  const schema = getMCPToolSchema(toolName);
  if (!schema) {
    return {
      isValid: false,
      errors: [{ field: 'toolName', message: `Unknown tool: ${toolName}` }]
    };
  }

  const errors: ValidationError[] = [];
  const required = schema.required || [];
  
  // Check required fields
  for (const field of required) {
    if (!(field in args)) {
      errors.push({ field, message: `Missing required field: ${field}` });
    }
  }
  
  // Type validation for basic types
  for (const [key, value] of Object.entries(args)) {
    const property = schema.properties?.[key];
    if (!property) continue;
    
    const expectedType = property.type;
    const actualType = typeof value;
    
    // Handle type mismatches
    if (expectedType === 'number' && actualType !== 'number') {
      errors.push({ field: key, message: `Field '${key}' must be a number, got ${actualType}` });
    }
    
    if (expectedType === 'string' && actualType !== 'string') {
      errors.push({ field: key, message: `Field '${key}' must be a string, got ${actualType}` });
    }
    
    if (expectedType === 'boolean' && actualType !== 'boolean') {
      errors.push({ field: key, message: `Field '${key}' must be a boolean, got ${actualType}` });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
