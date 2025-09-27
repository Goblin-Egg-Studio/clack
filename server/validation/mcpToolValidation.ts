/**
 * Validate tool arguments against their input schema
 * @param {Object} inputSchema - JSON Schema for tool input validation
 * @param {Object} toolArgs - Arguments provided for the tool
 * @returns {Promise<string|null>} - Error message if validation fails, null if valid
 */
export async function validateToolArguments(
  inputSchema: any, 
  toolArgs: Record<string, any> = {}
): Promise<string | null> {
  // Basic validation - check required fields
  const required = inputSchema.required || [];
  
  for (const field of required) {
    if (!(field in toolArgs)) {
      return `Missing required field: ${field}`;
    }
  }
  
  // Type validation for basic types
  for (const [key, value] of Object.entries(toolArgs)) {
    const property = inputSchema.properties?.[key];
    if (!property) continue;
    
    const expectedType = property.type;
    const actualType = typeof value;
    
    // Handle type mismatches
    if (expectedType === 'number' && actualType !== 'number') {
      return `Field '${key}' must be a number, got ${actualType}`;
    }
    
    if (expectedType === 'string' && actualType !== 'string') {
      return `Field '${key}' must be a string, got ${actualType}`;
    }
    
    if (expectedType === 'boolean' && actualType !== 'boolean') {
      return `Field '${key}' must be a boolean, got ${actualType}`;
    }
  }
  
  return null; // Valid
}


