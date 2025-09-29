import { validateMCPToolArguments, getMCPToolSchema, ValidationResult } from '../../../shared/validation/mcpToolValidation';

// Re-export validation functions for client use
export { validateMCPToolArguments, getMCPToolSchema, ValidationResult };

// Client-side validation helper
export function validateBeforeSend(toolName: string, args: any): ValidationResult {
  return validateMCPToolArguments(toolName, args);
}

// Helper to get user-friendly error messages
export function getValidationErrorMessage(validation: ValidationResult): string {
  if (validation.isValid) {
    return '';
  }
  
  return validation.errors.map(error => `${error.field}: ${error.message}`).join(', ');
}
