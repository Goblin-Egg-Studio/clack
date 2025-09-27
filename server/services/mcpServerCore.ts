import { getToolsList, executeToolByName, buildRegistry } from './mcpToolRegistry.js';
import { validateToolArguments } from '../validation/mcpToolValidation.js';
import { ProviderRegistry } from './providerRegistry.js';
import {
    JSONRPC_VERSION,
    JSONRPC_METHOD_INITIALIZE,
    JSONRPC_METHOD_TOOLS_LIST,
    JSONRPC_METHOD_TOOLS_CALL,
    JSONRPC_METHOD_PROMPTS_LIST,
    JSONRPC_METHOD_NOTIFICATIONS_INITIALIZED,
    JSONRPC_ERROR_METHOD_NOT_FOUND,
    JSONRPC_ERROR_INVALID_PARAMS,
    JSONRPC_ERROR_INTERNAL,
    MCP_PROTOCOL_VERSION,
    MCP_SERVER_NAME,
    MCP_SERVER_VERSION
} from '../constants/jsonrpc.js';
import { Database } from 'bun:sqlite';

/**
 * Core MCP Server class that handles JSON-RPC protocol and tool execution
 * This class abstracts the core functionality that can be used by different handlers
 */
export class MCPServerCore {
    private db: Database;
    private providerRegistry: ProviderRegistry;

    constructor(db: Database, providerRegistry: ProviderRegistry, options = {}) {
        this.db = db;
        this.providerRegistry = providerRegistry;
        this.options = {
            serverName: MCP_SERVER_NAME,
            serverVersion: MCP_SERVER_VERSION,
            protocolVersion: MCP_PROTOCOL_VERSION,
            ...options
        };
    }

    /**
     * Build a successful JSON-RPC result response
     * @param {string|number} id - Request ID
     * @param {any} result - Result data
     * @returns {Object} JSON-RPC result response
     */
    buildResult(id: string | number, result: any) {
        return { jsonrpc: JSONRPC_VERSION, id, result };
    }

    /**
     * Build a JSON-RPC error response
     * @param {string|number} id - Request ID
     * @param {number} code - Error code
     * @param {string} message - Error message
     * @returns {Object} JSON-RPC error response
     */
    buildError(id: string | number, code: number, message: string) {
        return { jsonrpc: JSONRPC_VERSION, id, error: { code, message } };
    }

    /**
     * Wrap arbitrary tool payloads into MCP Tool Result format
     * @param {any} payload - Tool execution result
     * @returns {Object} MCP Tool Result format
     */
    wrapAsMcpToolResult(payload: any) {
        // If already in MCP Tool Result shape, return as-is
        if (payload && typeof payload === 'object' && Array.isArray(payload.content)) {
            return { content: payload.content, isError: !!payload.isError };
        }

        // Strings become text content
        if (typeof payload === 'string') {
            return {
                content: [{ type: 'text', text: payload }],
                isError: false,
            };
        }

        // Default: serialize JSON as text for broad client support
        let text: string;
        try {
            text = JSON.stringify(payload);
        } catch {
            // Fallback to string coercion
            text = String(payload);
        }

        return {
            content: [
                {
                    type: 'text',
                    text,
                },
            ],
            isError: !!(payload && payload.isError),
        };
    }

    /**
     * Validate tool arguments using shared validation library
     * @param {string} toolName - Name of the tool
     * @param {Object} toolArgs - Arguments provided for the tool
     * @returns {Promise<string|null>} - Error message if validation fails, null if valid
     */
    async validateToolArgumentsForServer(toolName: string, toolArgs: Record<string, any> = {}) {
        const registry = await buildRegistry(this.db);
        const tool = registry.byName.get(toolName);

        if (!tool) {
            return `Unknown tool: ${toolName}`;
        }

        // Use shared validation library
        return validateToolArguments(tool.inputSchema, toolArgs);
    }

    /**
     * Process a JSON-RPC request and return the appropriate response
     * @param {string|number} id - Request ID
     * @param {string} method - JSON-RPC method name
     * @param {Object} params - Method parameters
     * @param {Object} headers - Request headers (for authentication and context)
     * @returns {Promise<Object|null>} JSON-RPC response or null for notifications
     */
    async processRequest(id: string | number, method: string, params: Record<string, any>, headers: Record<string, any> = {}) {
        console.log(`[MCP-Core] Processing ${method} request (id: ${id})`);

        if (method === JSONRPC_METHOD_INITIALIZE) {
            return this.buildResult(id, {
                protocolVersion: this.options.protocolVersion,
                serverInfo: {
                    name: this.options.serverName,
                    version: this.options.serverVersion
                },
                capabilities: { tools: {}, resources: {}, prompts: {} },
            });
        }

        if (method === JSONRPC_METHOD_NOTIFICATIONS_INITIALIZED) {
            // Acknowledge without error
            return this.buildResult(id, { acknowledged: true });
        }

        if (method === JSONRPC_METHOD_TOOLS_LIST) {
            const tools = await getToolsList(this.db);
            return this.buildResult(id, { tools });
        }

        if (method === JSONRPC_METHOD_PROMPTS_LIST) {
            // No prompts defined yet; return empty list to avoid client errors
            return this.buildResult(id, { prompts: [] });
        }

        if (method === JSONRPC_METHOD_TOOLS_CALL) {
            const { name, arguments: toolArgs } = params || {};
            if (!name) {
                return this.buildError(id, JSONRPC_ERROR_INVALID_PARAMS, 'Missing tool name');
            }

            try {
                // Validate tool arguments before execution
                const validationError = await this.validateToolArgumentsForServer(name, toolArgs);
                if (validationError) {
                    return this.buildError(id, JSONRPC_ERROR_INVALID_PARAMS, validationError);
                }

                const raw = await executeToolByName(name, toolArgs, this.providerRegistry, headers);
                const wrapped = this.wrapAsMcpToolResult(raw);
                return this.buildResult(id, wrapped);
            } catch (err: any) {
                if (err.message.includes('Unknown tool')) {
                    return this.buildError(id, JSONRPC_ERROR_METHOD_NOT_FOUND, err.message);
                }
                return this.buildError(id, JSONRPC_ERROR_INTERNAL, err?.message || 'Tool failed');
            }
        }

        return this.buildError(id, JSONRPC_ERROR_METHOD_NOT_FOUND, `Unknown method: ${method}`);
    }

    /**
     * Handle a complete request with response formatting
     * This method can be overridden by subclasses for custom response handling
     * @param {Object} requestData - Request data object
     * @returns {Promise<Object>} Formatted response
     */
    async handleRequest(requestData: { id: string | number; method: string; params: Record<string, any>; headers: Record<string, any> }) {
        const { id, method, params, headers } = requestData;

        // Extract role header for service account identification
        const role = headers?.['x-role'] || 'service';
        const enhancedHeaders = { ...headers, role: role };

        const jsonRpcResponse = await this.processRequest(id, method, params, enhancedHeaders);

        // Handle notifications (null response)
        if (jsonRpcResponse === null) {
            console.log(`[MCP-Core] Notification ${method} processed`);
            return this.buildNotificationResponse();
        }

        console.log(`[MCP-Core] Responding to ${method} with ${jsonRpcResponse.result ? 'success' : 'error'}`);
        return this.buildSuccessResponse(jsonRpcResponse);
    }

    /**
     * Build a notification response (204 No Content)
     * Can be overridden by subclasses for custom response formats
     * @returns {Object} Notification response
     */
    buildNotificationResponse() {
        return {
            statusCode: 204,
            body: null,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }

    /**
     * Build a successful response (200 OK)
     * Can be overridden by subclasses for custom response formats
     * @param {Object} jsonRpcResponse - JSON-RPC response object
     * @returns {Object} Success response
     */
    buildSuccessResponse(jsonRpcResponse: any) {
        return {
            statusCode: 200,
            body: JSON.stringify(jsonRpcResponse),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }

    /**
     * Extract data from various event formats
     * Can be overridden by subclasses for custom event parsing
     * @param {Object} event - Raw event object
     * @returns {Object} Extracted request data
     */
    extractRequestData(event: any) {
        // Default implementation assumes event has been pre-processed
        return {
            id: event?.id,
            method: event?.method,
            params: event?.params,
            headers: event?.headers || {}
        };
    }
}

