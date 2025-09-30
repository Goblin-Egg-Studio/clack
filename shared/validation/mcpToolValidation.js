// MCP Tool schemas
export const MCP_TOOL_SCHEMAS = [
  {
    name: 'send_message',
    description: 'Send a message between two users',
    inputSchema: {
      type: 'object',
      properties: {
        otherUserId: { 
          type: 'number', 
          description: 'ID of the other user',
          minimum: 1
        },
        content: { 
          type: 'string', 
          description: 'Message content',
          minLength: 1,
          maxLength: 1000
        }
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
        name: { 
          type: 'string', 
          description: 'Room name',
          minLength: 1,
          maxLength: 100
        },
        description: { 
          type: 'string', 
          description: 'Room description',
          maxLength: 500
        }
      },
      required: ['name', 'description']
    }
  },
  {
    name: 'join_room',
    description: 'Join a chat room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { 
          type: 'number', 
          description: 'ID of the room to join',
          minimum: 1
        }
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
        roomId: { 
          type: 'number', 
          description: 'ID of the room to leave',
          minimum: 1
        }
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
        roomId: { 
          type: 'number', 
          description: 'ID of the room',
          minimum: 1
        },
        content: { 
          type: 'string', 
          description: 'Message content',
          minLength: 1,
          maxLength: 1000
        }
      },
      required: ['roomId', 'content']
    }
  },
  {
    name: 'get_messages_by_index_range',
    description: 'Get messages by index range',
    inputSchema: {
      type: 'object',
      properties: {
        startIndex: { 
          type: 'number', 
          description: 'Start index (0-based)',
          minimum: 0
        },
        endIndex: { 
          type: 'number', 
          description: 'End index (exclusive)',
          minimum: 1
        },
        userId: { 
          type: 'number', 
          description: 'User ID to filter messages for',
          minimum: 1
        }
      },
      required: ['startIndex', 'endIndex', 'userId']
    }
  },
  {
    name: 'get_room_messages_by_index_range',
    description: 'Get room messages by index range',
    inputSchema: {
      type: 'object',
      properties: {
        startIndex: { 
          type: 'number', 
          description: 'Start index (0-based)',
          minimum: 0
        },
        endIndex: { 
          type: 'number', 
          description: 'End index (exclusive)',
          minimum: 1
        },
        roomId: { 
          type: 'number', 
          description: 'Room ID to filter messages for',
          minimum: 1
        }
      },
      required: ['startIndex', 'endIndex', 'roomId']
    }
  },
  {
    name: 'get_users_by_time_range',
    description: 'Get users created within a time range',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: { 
          type: 'string', 
          description: 'Start time in ISO format',
          format: 'date-time'
        },
        endTime: { 
          type: 'string', 
          description: 'End time in ISO format',
          format: 'date-time'
        }
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
        startTime: { 
          type: 'string', 
          description: 'Start time in ISO format',
          format: 'date-time'
        },
        endTime: { 
          type: 'string', 
          description: 'End time in ISO format',
          format: 'date-time'
        }
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
        startTime: { 
          type: 'string', 
          description: 'Start time in ISO format',
          format: 'date-time'
        },
        endTime: { 
          type: 'string', 
          description: 'End time in ISO format',
          format: 'date-time'
        },
        userId: { 
          type: 'number', 
          description: 'User ID to filter messages for',
          minimum: 1
        }
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
        startTime: { 
          type: 'string', 
          description: 'Start time in ISO format',
          format: 'date-time'
        },
        endTime: { 
          type: 'string', 
          description: 'End time in ISO format',
          format: 'date-time'
        },
        roomId: { 
          type: 'number', 
          description: 'Room ID to filter messages for',
          minimum: 1
        }
      },
      required: ['startTime', 'endTime', 'roomId']
    }
  },
  {
    name: 'get_users_by_index_range',
    description: 'Get users by index range (for pagination)',
    inputSchema: {
      type: 'object',
      properties: {
        startIndex: { 
          type: 'number', 
          description: 'Start index (0-based)',
          minimum: 0
        },
        endIndex: { 
          type: 'number', 
          description: 'End index (exclusive)',
          minimum: 1
        }
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
        startIndex: { 
          type: 'number', 
          description: 'Start index (0-based)',
          minimum: 0
        },
        endIndex: { 
          type: 'number', 
          description: 'End index (exclusive)',
          minimum: 1
        }
      },
      required: ['startIndex', 'endIndex']
    }
  },
  {
    name: 'get_user_rooms',
    description: 'Get rooms that a user is a member of',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { 
          type: 'number', 
          description: 'User ID',
          minimum: 1
        }
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
        roomId: { 
          type: 'number', 
          description: 'Room ID',
          minimum: 1
        },
        newOwnerId: { 
          type: 'number', 
          description: 'New owner user ID',
          minimum: 1
        },
        currentOwnerId: { 
          type: 'number', 
          description: 'Current owner user ID (for verification)',
          minimum: 1
        }
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
        roomId: { 
          type: 'number', 
          description: 'Room ID',
          minimum: 1
        },
        ownerId: { 
          type: 'number', 
          description: 'Owner user ID (for verification)',
          minimum: 1
        }
      },
      required: ['roomId', 'ownerId']
    }
  }
];

// Validation functions
export function validateMCPToolArguments(toolName, args) {
  const schema = MCP_TOOL_SCHEMAS.find(s => s.name === toolName);
  if (!schema) {
    return {
      isValid: false,
      errors: [{ field: 'toolName', message: `Unknown tool: ${toolName}` }]
    };
  }

  const errors = [];
  const { properties, required = [] } = schema.inputSchema;

  // Check required fields
  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      errors.push({
        field,
        message: `Missing required field: ${field}`
      });
    }
  }

  // Validate each provided field
  for (const [field, value] of Object.entries(args)) {
    const fieldSchema = properties[field];
    if (!fieldSchema) {
      errors.push({
        field,
        message: `Unknown field: ${field}`
      });
      continue;
    }

    const fieldErrors = validateField(field, value, fieldSchema);
    errors.push(...fieldErrors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateField(field, value, schema) {
  const errors = [];

  // Type validation
  if (schema.type === 'string' && typeof value !== 'string') {
    errors.push({
      field,
      message: `Field ${field} must be a string`
    });
  } else if (schema.type === 'number' && typeof value !== 'number') {
    errors.push({
      field,
      message: `Field ${field} must be a number`
    });
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push({
        field,
        message: `Field ${field} must be at least ${schema.minLength} characters long`
      });
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({
        field,
        message: `Field ${field} must be at most ${schema.maxLength} characters long`
      });
    }
  }

  // Number validations
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field,
        message: `Field ${field} must be at least ${schema.minimum}`
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field,
        message: `Field ${field} must be at most ${schema.maximum}`
      });
    }
  }

  return errors;
}

// Helper function to get tool schema
export function getMCPToolSchema(toolName) {
  return MCP_TOOL_SCHEMAS.find(s => s.name === toolName);
}

// Helper function to get all tool schemas
export function getAllMCPToolSchemas() {
  return MCP_TOOL_SCHEMAS;
}
