import { Database } from 'bun:sqlite';

export interface Message {
  id: number;
  user_a?: number;
  user_b?: number;
  room_id?: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender_name: string;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Room {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  created_by_username: string;
  member_count: number;
}

export class ChatService {
  private db: Database;
  private broadcastCallback?: (data: any) => void;

  constructor(db: Database) {
    this.db = db;
  }

  // Set the broadcast callback function
  setBroadcastCallback(callback: (data: any) => void) {
    this.broadcastCallback = callback;
  }

  // Send a message between two users
  async sendMessage(senderId: number, otherUserId: number, content: string): Promise<Message> {
    // Ensure consistent ordering (user_a < user_b)
    const [userA, userB] = senderId < otherUserId ? [senderId, otherUserId] : [otherUserId, senderId];
    
    // Insert message into database
    const result = this.db.query('INSERT INTO messages (user_a, user_b, sender_id, content) VALUES (?, ?, ?, ?) RETURNING *').get(userA, userB, senderId, content);
    
    // Get the full message with sender name
    const fullMessage = this.db.query(`
      SELECT m.*, u.username as sender_name 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.id = ?
    `).get(result.id);

    // Broadcast the message only to the two users involved
    if (this.broadcastCallback) {
      this.broadcastCallback({
        type: 'new_message',
        message: fullMessage,
        targetUsers: [senderId, otherUserId]
      });
    }

    return fullMessage;
  }

  // Get all messages for a user (with all other users)
  async getUserMessages(userId: number, limit: number = 100): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.*, u.username as sender_name 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.user_a = ? OR m.user_b = ?
      ORDER BY m.created_at ASC 
      LIMIT ?
    `).all(userId, userId, limit);
    
    return messages;
  }

  // Get messages between two specific users
  async getMessagesBetweenUsers(userA: number, userB: number, limit: number = 50): Promise<Message[]> {
    // Ensure consistent ordering (user_a < user_b)
    const [user1, user2] = userA < userB ? [userA, userB] : [userB, userA];
    
    const messages = this.db.query(`
      SELECT m.*, u.username as sender_name 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.user_a = ? AND m.user_b = ?
      ORDER BY m.created_at ASC 
      LIMIT ?
    `).all(user1, user2, limit);
    
    return messages;
  }

  // Get all users
  async getUsers(): Promise<User[]> {
    const users = this.db.query('SELECT id, username, created_at FROM users ORDER BY created_at DESC').all();
    return users;
  }

  // Lookup helpers
  async getUserByUsername(username: string): Promise<User | null> {
    const user = this.db.query('SELECT id, username, created_at FROM users WHERE username = ?').get(username);
    return user || null;
  }

  async getRoomByName(name: string): Promise<Room | null> {
    const room = this.db.query(`
      SELECT r.*, u.username as created_by_username,
             (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      WHERE r.name = ?
    `).get(name);
    return room || null;
  }

  // Get a specific user by ID
  async getUserById(userId: number): Promise<User | null> {
    const user = this.db.query('SELECT id, username, created_at FROM users WHERE id = ?').get(userId);
    return user || null;
  }

  // Room management methods
  async createRoom(name: string, description: string, createdBy: number): Promise<Room> {
    console.log('ChatService: Creating room:', { name, description, createdBy });
    
    const result = this.db.query(`
      INSERT INTO rooms (name, description, created_by) 
      VALUES (?, ?, ?) 
      RETURNING *
    `).get(name, description, createdBy);

    console.log('ChatService: Room created with ID:', result.id);

    // Add creator as first member
    this.db.query(`
      INSERT INTO room_members (room_id, user_id) 
      VALUES (?, ?)
    `).run(result.id, createdBy);

    console.log('ChatService: Added creator as room member');

    // Get room with creator info
    const room = this.db.query(`
      SELECT r.*, u.username as created_by_username, 
             (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `).get(result.id);

    console.log('ChatService: Final room object:', room);

    // Broadcast new room to all users
    if (this.broadcastCallback) {
      console.log('ChatService: Broadcasting new room event');
      this.broadcastCallback({
        type: 'new_room',
        room
      });
    } else {
      console.log('ChatService: No broadcast callback set');
    }

    return room;
  }

  async joinRoom(roomId: number, userId: number): Promise<boolean> {
    try {
      this.db.query(`
        INSERT INTO room_members (room_id, user_id) 
        VALUES (?, ?)
      `).run(roomId, userId);

      // Get updated room info
      const room = this.db.query(`
        SELECT r.*, u.username as created_by_username,
               (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
        FROM rooms r
        JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `).get(roomId);

      // Broadcast room update
      if (this.broadcastCallback) {
        this.broadcastCallback({
          type: 'room_updated',
          room,
          joinedUserId: userId
        });
      }

      return true;
    } catch (error) {
      // User already in room or room doesn't exist
      return false;
    }
  }

  async leaveRoom(roomId: number, userId: number): Promise<boolean> {
    const result = this.db.query(`
      DELETE FROM room_members 
      WHERE room_id = ? AND user_id = ?
    `).run(roomId, userId);

    if (result.changes > 0) {
      // Get updated room info
      const room = this.db.query(`
        SELECT r.*, u.username as created_by_username,
               (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
        FROM rooms r
        JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `).get(roomId);

      // Broadcast room update
      if (this.broadcastCallback) {
        this.broadcastCallback({
          type: 'room_updated',
          room
        });
      }

      return true;
    }

    return false;
  }

  async getRooms(): Promise<Room[]> {
    const rooms = this.db.query(`
      SELECT r.*, u.username as created_by_username,
             (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC
    `).all();

    return rooms;
  }

  async getUserRooms(userId: number): Promise<Room[]> {
    const rooms = this.db.query(`
      SELECT r.*, u.username as created_by_username,
             (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      JOIN room_members rm ON r.id = rm.room_id
      WHERE rm.user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    return rooms;
  }

  async sendRoomMessage(senderId: number, roomId: number, content: string): Promise<Message> {
    // Insert message into database
    const result = this.db.query(`
      INSERT INTO messages (room_id, sender_id, content) 
      VALUES (?, ?, ?) 
      RETURNING *
    `).get(roomId, senderId, content);
    
    // Get the full message with sender name
    const fullMessage = this.db.query(`
      SELECT m.*, u.username as sender_name 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.id = ?
    `).get(result.id);

    // Broadcast the message to all room members
    if (this.broadcastCallback) {
      this.broadcastCallback({
        type: 'new_room_message',
        message: fullMessage,
        targetRoom: roomId
      });
    }

    return fullMessage;
  }

  async getRoomMessages(roomId: number, limit: number = 50): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.*, u.username as sender_name 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC 
      LIMIT ?
    `).all(roomId, limit);
    
    return messages;
  }

  // Time range getters
  async getUsersByTimeRange(startTime: string, endTime: string): Promise<User[]> {
    const users = this.db.query(`
      SELECT id, username, created_at 
      FROM users 
      WHERE created_at BETWEEN ? AND ? 
      ORDER BY created_at ASC
    `).all(startTime, endTime);
    
    return users;
  }

  async getRoomsByTimeRange(startTime: string, endTime: string): Promise<Room[]> {
    const rooms = this.db.query(`
      SELECT r.id, r.name, r.description, r.created_by, r.created_at, u.username as created_by_username,
             COUNT(rm.user_id) as member_count
      FROM rooms r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN room_members rm ON r.id = rm.room_id
      WHERE r.created_at BETWEEN ? AND ?
      GROUP BY r.id, r.name, r.description, r.created_by, r.created_at, u.username
      ORDER BY r.created_at ASC
    `).all(startTime, endTime);
    
    return rooms;
  }

  async getMessagesByTimeRange(startTime: string, endTime: string, userId: number): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.id, m.user_a, m.user_b, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.created_at BETWEEN ? AND ? 
        AND (m.user_a = ? OR m.user_b = ?)
      ORDER BY m.created_at ASC
    `).all(startTime, endTime, userId, userId);
    
    return messages;
  }

  async getRoomMessagesByTimeRange(startTime: string, endTime: string, roomId: number): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.id, m.room_id, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.created_at BETWEEN ? AND ? 
        AND m.room_id = ?
      ORDER BY m.created_at ASC
    `).all(startTime, endTime, roomId);
    
    return messages;
  }

  // Index range getters
  async getUsersByIndexRange(startIndex: number, endIndex: number): Promise<User[]> {
    const users = this.db.query(`
      SELECT id, username, created_at 
      FROM users 
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `).all(endIndex - startIndex, startIndex);
    
    return users;
  }

  async getRoomsByIndexRange(startIndex: number, endIndex: number): Promise<Room[]> {
    const rooms = this.db.query(`
      SELECT r.id, r.name, r.description, r.created_by, r.created_at, u.username as created_by_username,
             COUNT(rm.user_id) as member_count
      FROM rooms r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN room_members rm ON r.id = rm.room_id
      GROUP BY r.id, r.name, r.description, r.created_by, r.created_at, u.username
      ORDER BY r.created_at ASC
      LIMIT ? OFFSET ?
    `).all(endIndex - startIndex, startIndex);
    
    return rooms;
  }

  async getMessagesByIndexRange(startIndex: number, endIndex: number, userId: number): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.id, m.user_a, m.user_b, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.user_a = ? OR m.user_b = ?)
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `).all(userId, userId, endIndex - startIndex, startIndex);
    
    return messages;
  }

  async getMessagesBetweenUsersByIndexRange(startIndex: number, endIndex: number, userA: number, userB: number): Promise<Message[]> {
    // Ensure consistent ordering (user_a < user_b)
    const [userAId, userBId] = userA < userB ? [userA, userB] : [userB, userA];
    
    const messages = this.db.query(`
      SELECT m.id, m.user_a, m.user_b, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.user_a = ? AND m.user_b = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `).all(userAId, userBId, endIndex - startIndex, startIndex);
    
    return messages;
  }

  // Latest-first variants (DESC)
  async getMessagesBetweenUsersByIndexRangeLatest(startIndex: number, endIndex: number, userA: number, userB: number): Promise<Message[]> {
    const [userAId, userBId] = userA < userB ? [userA, userB] : [userB, userA];
    const messages = this.db.query(`
      SELECT m.id, m.user_a, m.user_b, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.user_a = ? AND m.user_b = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userAId, userBId, endIndex - startIndex, startIndex);
    return messages;
  }

  async getRoomMessagesByIndexRange(startIndex: number, endIndex: number, roomId: number): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.id, m.room_id, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `).all(roomId, endIndex - startIndex, startIndex);
    
    return messages;
  }

  async getRoomMessagesByIndexRangeLatest(startIndex: number, endIndex: number, roomId: number): Promise<Message[]> {
    const messages = this.db.query(`
      SELECT m.id, m.room_id, m.sender_id, m.content, m.created_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(roomId, endIndex - startIndex, startIndex);
    return messages;
  }

  async changeRoomOwner(roomId: number, newOwnerId: number, currentOwnerId: number): Promise<any> {
    // Verify current owner
    const room = this.db.query(`
      SELECT created_by FROM rooms WHERE id = ?
    `).get(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.created_by !== currentOwnerId) {
      throw new Error('Only the current owner can change room ownership');
    }

    // Verify new owner exists
    const newOwner = this.db.query(`
      SELECT id FROM users WHERE id = ?
    `).get(newOwnerId);

    if (!newOwner) {
      throw new Error('New owner not found');
    }

    // Update room owner
    this.db.query(`
      UPDATE rooms SET created_by = ? WHERE id = ?
    `).run(newOwnerId, roomId);

    // Get updated room info
    const updatedRoom = this.db.query(`
      SELECT r.*, u.username as created_by_username,
             (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `).get(roomId);

    // Broadcast room update
    if (this.broadcastCallback) {
      this.broadcastCallback({
        type: 'room_owner_changed',
        room: updatedRoom,
        oldOwnerId: currentOwnerId,
        newOwnerId: newOwnerId
      });
    }

    return {
      success: true,
      room: updatedRoom,
      message: 'Room ownership changed successfully'
    };
  }

  async deleteRoom(roomId: number, ownerId: number): Promise<any> {
    // Verify owner
    const room = this.db.query(`
      SELECT created_by FROM rooms WHERE id = ?
    `).get(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.created_by !== ownerId) {
      throw new Error('Only the room owner can delete the room');
    }

    // Delete room and all related data
    this.db.query(`DELETE FROM messages WHERE room_id = ?`).run(roomId);
    this.db.query(`DELETE FROM room_members WHERE room_id = ?`).run(roomId);
    this.db.query(`DELETE FROM rooms WHERE id = ?`).run(roomId);

    // Broadcast room deletion
    if (this.broadcastCallback) {
      this.broadcastCallback({
        type: 'room_deleted',
        roomId: roomId,
        deletedBy: ownerId
      });
    }

    return {
      success: true,
      message: 'Room deleted successfully'
    };
  }
}