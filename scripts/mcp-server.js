#!/usr/bin/env node

/**
 * Proper MCP Server for Clack Chat
 * This is a real stdio MCP server that Cursor can connect to directly
 */

import { Database } from 'bun:sqlite';
import { MCPServerCore } from '../server/services/mcpServerCore.js';
import { ChatService } from '../server/services/chatService.js';
import { ChatMCPProvider } from '../server/services/mcpProvider.js';
import { MCPProviderRegistry } from '../server/services/providerRegistry.js';
import bcrypt from 'bcryptjs';

// Initialize database and services
const db = new Database('./data/chat.db');
const chatService = new ChatService(db);
const providerRegistry = new MCPProviderRegistry();
providerRegistry.addProvider('chat', new ChatMCPProvider(chatService));

const mcpServer = new MCPServerCore(db, providerRegistry);

// Authentication state
let authenticatedUser = null;

// Handle authentication
async function authenticateUser(username, password) {
  try {
    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Handle stdio communication
process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  
  // Process complete JSON-RPC messages (one per line)
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line);
        const response = await handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  }
});

async function handleRequest(request) {
  const { id, method, params } = request;

  // Handle authentication
  if (method === 'initialize') {
    // Check for authentication in params
    if (params.username && params.password) {
      const user = await authenticateUser(params.username, params.password);
      if (user) {
        authenticatedUser = user;
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'clack-chat',
              version: '1.0.0'
            },
            capabilities: {
              tools: {},
              resources: {},
              prompts: {}
            }
          }
        };
      } else {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32001, message: 'Authentication failed' }
        };
      }
    } else {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32001, message: 'Authentication required' }
      };
    }
  }

  // Check authentication for other methods
  if (!authenticatedUser) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32001, message: 'Not authenticated' }
    };
  }

  // Handle other MCP methods
  try {
    const response = await mcpServer.processRequest(
      id,
      method,
      params || {},
      {
        userId: authenticatedUser.id,
        username: authenticatedUser.username
      }
    );
    return response;
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error.message }
    };
  }
}

process.stdin.on('end', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

console.error('Clack MCP Server started');
