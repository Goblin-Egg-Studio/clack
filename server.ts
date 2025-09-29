import express from 'express';
import serveStatic from 'serve-static';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Database } from 'bun:sqlite';
import { MCPServerCore } from './server/services/mcpServerCore.js';
import { ChatService } from './server/services/chatService.js';
import { ChatMCPProvider } from './server/services/mcpProvider.js';
import { MCPProviderRegistry } from './server/services/providerRegistry.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { WebSocketServer } from 'ws';

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Health check endpoint
app.get('/__health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper function to get version data
async function getVersionData() {
  try {
    const rootPkgPath = path.join(process.cwd(), 'package.json');
    const clientPkgPath = path.join(process.cwd(), 'client', 'package.json');
    const sdkPkgPath = path.join(process.cwd(), 'sdk', 'package.json');
    const [rootPkgRaw, clientPkgRaw, sdkPkgRaw] = await Promise.all([
      fs.readFile(rootPkgPath, 'utf8'),
      fs.readFile(clientPkgPath, 'utf8').catch(() => 'null'),
      fs.readFile(sdkPkgPath, 'utf8').catch(() => 'null')
    ]);
    const rootPkg = JSON.parse(rootPkgRaw);
    const clientPkg = clientPkgRaw !== 'null' ? JSON.parse(clientPkgRaw) : null;
    const sdkPkg = sdkPkgRaw !== 'null' ? JSON.parse(sdkPkgRaw) : null;
    return {
      monorepoVersion: rootPkg.version ?? null,
      frontendVersion: clientPkg?.version ?? null,
      sdkVersion: sdkPkg?.version ?? null,
      name: rootPkg.name ?? 'clack'
    };
  } catch (e) {
    return {
      monorepoVersion: null,
      frontendVersion: null,
      sdkVersion: null,
      name: 'clack'
    };
  }
}

// Version endpoint
app.get('/__version', async (_req, res) => {
  try {
    const versionData = await getVersionData();
    res.json(versionData);
  } catch (e) {
    res.status(500).json({ error: 'version_unavailable' });
  }
});

// Secure deploy endpoint (called by GitHub Action)
app.post('/admin/deploy', async (req, res) => {
  try {
    const headerToken = req.header('x-deploy-token') || req.query.token;
    const expected = process.env.DEPLOY_TOKEN;
    if (!expected || !headerToken || headerToken !== expected) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const cmd = "cd /opt/clack && git fetch origin && git reset --hard origin/main && export PATH=\"$HOME/.bun/bin:$PATH\" && bun install --no-progress --frozen-lockfile && bun run build";
    const proc = Bun.spawn(['bash', '-lc', cmd], { stdout: 'inherit', stderr: 'inherit' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return res.status(500).json({ error: 'deploy_failed', exitCode });
    }

    // Schedule self-restart so backend code updates too (systemd will restart it)
    setTimeout(() => {
      console.log('Restarting service via process.exit for deploy...');
      process.exit(0);
    }, 1000);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'deploy_exception' });
  }
});

// Initialize SQLite database
const db = new Database('chat.db');

// Initialize chat service
const chatService = new ChatService(db);

// Set up broadcast callback for chat service
chatService.setBroadcastCallback((data) => {
  if (data.targetUsers) {
    // Send to specific users only (for direct messages)
    broadcastToUsers(data.targetUsers, data);
  } else if (data.targetRoom) {
    // Send to all users in a specific room
    // For now, we'll broadcast to all users since we need to check room membership
    // In a production system, you'd want to track which users are in which rooms
    broadcastToAllUsers(data);
  } else {
    // Send to all users (for new user registrations, new rooms, etc.)
    broadcastToAllUsers(data);
  }
});

// Initialize provider registry
const providerRegistry = new MCPProviderRegistry();

// Register chat provider
const chatProvider = new ChatMCPProvider(chatService);
providerRegistry.registerProvider('chat', chatProvider);

console.log(`📋 Registered ${providerRegistry.getProviderCount()} providers: ${providerRegistry.getProviderNames().join(', ')}`);

// Initialize MCP server
const mcpServer = new MCPServerCore(db, providerRegistry);

// Create tables if they don't exist (preserve existing data)

// Create tables with correct schema (only if they don't exist)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(room_id, user_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER,
    user_b INTEGER,
    room_id INTEGER,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_a) REFERENCES users (id),
    FOREIGN KEY (user_b) REFERENCES users (id),
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (sender_id) REFERENCES users (id),
    CHECK (
      (user_a IS NOT NULL AND user_b IS NOT NULL AND room_id IS NULL) OR
      (user_a IS NULL AND user_b IS NULL AND room_id IS NOT NULL)
    )
  )
`);

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication helper functions
function generateToken(userId: number, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): { userId: number; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
  } catch {
    return null;
  }
}

// Authenticate user with username/password (for AI agents)
async function authenticateUser(username: string, password: string): Promise<{ id: number; username: string } | null> {
  try {
    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username };
  } catch (error) {
    console.error('User authentication error:', error);
    return null;
  }
}

// Authentication middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

// MCP authentication middleware - supports both token and username/password
async function authenticateMCP(req: any, res: any, next: any) {
  try {
    console.log('MCP Auth - Headers:', {
      authorization: req.headers['authorization'],
      'x-username': req.headers['x-username'],
      'x-password': req.headers['x-password'],
      'X-Username': req.headers['X-Username'],
      'X-Password': req.headers['X-Password']
    });

    // Try token authentication first (for SDK access)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
      console.log('MCP Auth - Trying token authentication');
      const decoded = verifyToken(token);
      if (decoded) {
        console.log('MCP Auth - Token authentication successful');
        req.user = decoded;
        return next();
      }
    }

    // Try username/password authentication (for AI agents)
    const username = req.headers['x-username'] || req.headers['X-Username'];
    const password = req.headers['x-password'] || req.headers['X-Password'];
    if (username && password) {
      console.log('MCP Auth - Trying username/password authentication');
      const user = await authenticateUser(username, password);
      if (user) {
        console.log('MCP Auth - Username/password authentication successful');
        req.user = { userId: user.id, username: user.username };
        return next();
      }
    }

    // If neither method worked
    return res.status(401).json({ 
      error: 'Authentication required. Provide either Bearer token or X-Username/X-Password headers' 
    });
  } catch (error) {
    console.error('MCP authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// SSE-specific authentication middleware (handles both header and query param)
function authenticateSSE(req: any, res: any, next: any) {
  // Try to get token from Authorization header first
  let token = req.headers['authorization']?.split(' ')[1];
  
  // If no header token, try query parameter (for EventSource)
  if (!token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

// Middleware
app.use(express.json());

// Store connected SSE clients with user info
const sseClients = new Map<Response, { userId: number, username: string }>();

// Store connected WebSocket clients
const wsClients = new Set<any>();

    // SSE endpoint for real-time updates (requires authentication)
    app.get('/api/events', authenticateSSE, async (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection event with user info and version data
      const versionData = await getVersionData();
      res.write(`data: {"type": "connected", "user": ${JSON.stringify(req.user)}, "version": ${JSON.stringify(versionData)}}\n\n`);
      
      // No initial data sent - client will use MCP getters for historical data
      
      // Add client to map with user info
      sseClients.set(res, { userId: req.user.userId, username: req.user.username });
      
      // Remove client when connection closes
      req.on('close', () => {
        sseClients.delete(res);
      });
    });

// Helper function to broadcast to specific users using JSON patch format
function broadcastToUsers(userIds: number[], data: any) {
  const patch = createJSONPatch(data);
  const message = `data: ${JSON.stringify(patch)}\n\n`;
  sseClients.forEach((userInfo, client) => {
    if (userIds.includes(userInfo.userId)) {
      try {
        client.write(message);
      } catch (error) {
        // Remove dead connections
        sseClients.delete(client);
      }
    }
  });
}

// Helper function to broadcast to all users using JSON patch format
function broadcastToAllUsers(data: any) {
  const patch = createJSONPatch(data);
  const message = `data: ${JSON.stringify(patch)}\n\n`;
  sseClients.forEach((userInfo, client) => {
    try {
      client.write(message);
    } catch (error) {
      // Remove dead connections
      sseClients.delete(client);
    }
  });
}

// Create JSON patch format for SSE events
function createJSONPatch(data: any): any {
  const { type, ...payload } = data;
  
  switch (type) {
    case 'new_user':
      return {
        op: 'add',
        path: '/users',
        value: payload.user
      };
    
    case 'new_room':
      return {
        op: 'add',
        path: '/rooms',
        value: payload.room
      };
    
    case 'room_updated':
      return {
        op: 'replace',
        path: `/rooms/${payload.room.id}`,
        value: payload.room,
        joinedUserId: payload.joinedUserId
      };
    
    case 'new_message':
      return {
        op: 'add',
        path: '/messages',
        value: payload.message
      };
    
    case 'new_room_message':
      return {
        op: 'add',
        path: `/room_messages/${payload.message.room_id}`,
        value: payload.message
      };
    
    default:
      // For unknown types, return the original data
      return data;
  }
}

// Helper function to broadcast to all WebSocket clients
function broadcastToWebSocketClients(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (error) {
        // Remove dead connections
        wsClients.delete(client);
      }
    }
  });
}

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = db.query('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = db.query(`
      INSERT INTO users (username, password_hash) 
      VALUES (?, ?) 
      RETURNING id, username, created_at
    `).get(username, passwordHash);

    // Generate token
    const token = generateToken(result.id, result.username);

        // Broadcast new user registration to all connected clients
        const userData = {
          type: 'new_user',
          user: {
            id: result.id,
            username: result.username,
            created_at: result.created_at
          }
        };
        broadcastToAllUsers(userData);
    broadcastToWebSocketClients(userData);

    res.json({
      success: true,
      token,
      user: {
        id: result.id,
        username: result.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = db.query('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info (requires authentication)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await chatService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// MCP API Routes - Proper MCP HTTP Server
app.post('/api/mcp', authenticateMCP, async (req, res) => {
  try {
    const { jsonrpc, id, method, params } = req.body;
    
    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request' }
      });
    }

    // Process MCP request using the core server
    const response = await mcpServer.processRequest(
      id,
      method,
      params || {},
      {
        userId: req.user.userId,
        username: req.user.username,
        ...req.headers
      }
    );

    // Return proper JSON-RPC response
    res.json(response);
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({ 
      jsonrpc: '2.0', 
      id: req.body.id, 
      error: { code: -32603, message: 'Internal error' } 
    });
  }
});

// Legacy REST endpoints removed - using MCP protocol only

// Serve static React app
const clientPath = path.join(import.meta.dir, 'client', 'dist');
app.use(serveStatic(clientPath));

// Health check
app.get('/health', (_req, res) => res.send('ok'));

// Debug endpoint to check database
app.get('/api/debug/rooms', async (_req, res) => {
  try {
    const rooms = await chatService.getRooms();
    res.json({ 
      success: true, 
      count: rooms.length, 
      rooms: rooms.map(r => ({ id: r.id, name: r.name, created_by: r.created_by }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to check users
app.get('/api/debug/users', async (_req, res) => {
  try {
    const users = await chatService.getUsers();
    res.json({ 
      success: true, 
      count: users.length, 
      users: users.map(u => ({ id: u.id, username: u.username, created_at: u.created_at }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SPA fallback for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const server = app.listen(port, () => {
  console.log(`🚀 Chat app running at http://localhost:${port}`);
  console.log(`📊 SQLite database initialized`);
});

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  // Extract token from query parameters
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }
  
  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    ws.close(1008, 'Invalid token');
    return;
  }
  
  // Add client to set
  wsClients.add(ws);
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    user: decoded
  }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});
