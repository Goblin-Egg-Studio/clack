#!/usr/bin/env node

/**
 * HTTP MCP Server for Clack Chat
 * This server implements the MCP protocol over HTTP for Cursor
 */

const http = require('http');
const https = require('https');
const url = require('url');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://172.235.32.76/api/mcp';
const AUTH_TYPE = process.env.MCP_AUTH_TYPE || 'username_password';
const USERNAME = process.env.MCP_USERNAME;
const PASSWORD = process.env.MCP_PASSWORD;
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

let requestId = 0;

// Make HTTP request to Clack MCP server
async function makeMCPRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: ++requestId,
    method: method,
    params: params
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  // Add authentication headers
  if (AUTH_TYPE === 'token' && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  if (AUTH_TYPE === 'username_password' && USERNAME && PASSWORD) {
    headers['X-Username'] = USERNAME;
    headers['X-Password'] = PASSWORD;
  }

  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MCP request error:', error);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32603, message: error.message }
    };
  }
}

// Handle stdio communication with Cursor
process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  
  // Process complete JSON-RPC messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line);
        const response = await makeMCPRequest(request.method, request.params);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: request?.id || null,
          error: { code: -32700, message: 'Parse error' }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

console.error('HTTP MCP Server started - connecting to:', MCP_SERVER_URL);
