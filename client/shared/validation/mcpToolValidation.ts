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
    required: ['name', 'description']
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
