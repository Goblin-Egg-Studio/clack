import { ChatService } from './chatService.js';

export interface MCPProvider {
  sendMessage(senderId: number, otherUserId: number, content: string): Promise<any>;
  createRoom(name: string, description: string, createdBy: number): Promise<any>;
  joinRoom(roomId: number, userId: number): Promise<any>;
  leaveRoom(roomId: number, userId: number): Promise<any>;
  sendRoomMessage(senderId: number, roomId: number, content: string): Promise<any>;
  // Time range getters
  getUsersByTimeRange(startTime: string, endTime: string): Promise<any>;
  getRoomsByTimeRange(startTime: string, endTime: string): Promise<any>;
  getMessagesByTimeRange(startTime: string, endTime: string, userId: number): Promise<any>;
  getRoomMessagesByTimeRange(startTime: string, endTime: string, roomId: number): Promise<any>;
  // Index range getters
  getUsersByIndexRange(startIndex: number, endIndex: number): Promise<any>;
  getRoomsByIndexRange(startIndex: number, endIndex: number): Promise<any>;
  getMessagesByIndexRange(startIndex: number, endIndex: number, userId: number): Promise<any>;
  getRoomMessagesByIndexRange(startIndex: number, endIndex: number, roomId: number): Promise<any>;
  getUserRooms(userId: number): Promise<any>;
  changeRoomOwner(roomId: number, newOwnerId: number, currentOwnerId: number): Promise<any>;
  deleteRoom(roomId: number, ownerId: number): Promise<any>;
}

export class ChatMCPProvider implements MCPProvider {
  private chatService: ChatService;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
  }

  async sendMessage(senderId: number, otherUserId: number, content: string): Promise<any> {
    const message = await this.chatService.sendMessage(senderId, otherUserId, content);
    return {
      success: true,
      message
    };
  }

  async createRoom(name: string, description: string, createdBy: number): Promise<any> {
    const room = await this.chatService.createRoom(name, description, createdBy);
    return {
      success: true,
      room
    };
  }

  async joinRoom(roomId: number, userId: number): Promise<any> {
    const success = await this.chatService.joinRoom(roomId, userId);
    return {
      success,
      message: success ? 'Joined room successfully' : 'Failed to join room'
    };
  }

  async leaveRoom(roomId: number, userId: number): Promise<any> {
    const success = await this.chatService.leaveRoom(roomId, userId);
    return {
      success,
      message: success ? 'Left room successfully' : 'Failed to leave room'
    };
  }

  async sendRoomMessage(senderId: number, roomId: number, content: string): Promise<any> {
    const message = await this.chatService.sendRoomMessage(senderId, roomId, content);
    return {
      success: true,
      message
    };
  }

  // Time range getters
  async getUsersByTimeRange(startTime: string, endTime: string): Promise<any> {
    const users = await this.chatService.getUsersByTimeRange(startTime, endTime);
    return {
      success: true,
      users
    };
  }

  async getRoomsByTimeRange(startTime: string, endTime: string): Promise<any> {
    const rooms = await this.chatService.getRoomsByTimeRange(startTime, endTime);
    return {
      success: true,
      rooms
    };
  }

  async getMessagesByTimeRange(startTime: string, endTime: string, userId: number): Promise<any> {
    const messages = await this.chatService.getMessagesByTimeRange(startTime, endTime, userId);
    return {
      success: true,
      messages
    };
  }

  async getRoomMessagesByTimeRange(startTime: string, endTime: string, roomId: number): Promise<any> {
    const messages = await this.chatService.getRoomMessagesByTimeRange(startTime, endTime, roomId);
    return {
      success: true,
      messages
    };
  }

  // Index range getters
  async getUsersByIndexRange(startIndex: number, endIndex: number): Promise<any> {
    const users = await this.chatService.getUsersByIndexRange(startIndex, endIndex);
    return {
      success: true,
      users
    };
  }

  async getRoomsByIndexRange(startIndex: number, endIndex: number): Promise<any> {
    const rooms = await this.chatService.getRoomsByIndexRange(startIndex, endIndex);
    return {
      success: true,
      rooms
    };
  }

  async getMessagesByIndexRange(startIndex: number, endIndex: number, userId: number): Promise<any> {
    const messages = await this.chatService.getMessagesByIndexRange(startIndex, endIndex, userId);
    return {
      success: true,
      messages
    };
  }

  async getRoomMessagesByIndexRange(startIndex: number, endIndex: number, roomId: number): Promise<any> {
    const messages = await this.chatService.getRoomMessagesByIndexRange(startIndex, endIndex, roomId);
    return {
      success: true,
      messages
    };
  }

  async getUserRooms(userId: number): Promise<any> {
    const rooms = await this.chatService.getUserRooms(userId);
    return {
      success: true,
      rooms
    };
  }

  async changeRoomOwner(roomId: number, newOwnerId: number, currentOwnerId: number): Promise<any> {
    const result = await this.chatService.changeRoomOwner(roomId, newOwnerId, currentOwnerId);
    return {
      success: true,
      ...result
    };
  }

  async deleteRoom(roomId: number, ownerId: number): Promise<any> {
    const result = await this.chatService.deleteRoom(roomId, ownerId);
    return {
      success: true,
      ...result
    };
  }
}