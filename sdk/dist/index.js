// src/index.ts
class EventEmitter {
  events = {};
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    }
  }
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener(...args));
    }
  }
}

class ClackClient extends EventEmitter {
  baseUrl;
  token = null;
  eventSource = null;
  autoReconnect;
  reconnectInterval;
  reconnectTimer = null;
  requestId = 0;
  constructor(options = {}) {
    super();
    const origin = typeof window !== "undefined" && window.location && window.location.origin ? window.location.origin : "";
    this.baseUrl = options.baseUrl && options.baseUrl.trim().length > 0 ? options.baseUrl : origin;
    this.token = options.token || null;
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectInterval = options.reconnectInterval || 3000;
  }
  setToken(token) {
    this.token = token;
    if (this.eventSource) {
      this.disconnect();
      this.connect();
    }
  }
  getToken() {
    return this.token;
  }
  isAuthenticated() {
    return this.token !== null;
  }
  connect() {
    if (!this.token) {
      throw new Error("Token required to connect");
    }
    this.disconnect();
    const url = `${this.baseUrl}/api/events?token=${this.token}`;
    this.eventSource = new EventSource(url);
    this.eventSource.onopen = () => {
      console.log("ClackClient: SSE connection opened");
      this.emit("connection:open");
      this.clearReconnectTimer();
    };
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleSSEEvent(data);
      } catch (error) {
        console.error("ClackClient: Failed to parse SSE data:", error);
      }
    };
    this.eventSource.onerror = (error) => {
      console.error("ClackClient: SSE connection error:", error);
      this.emit("connection:error", error);
      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
    };
  }
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.clearReconnectTimer();
    this.emit("connection:close");
  }
  scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      console.log("ClackClient: Attempting to reconnect...");
      this.connect();
    }, this.reconnectInterval);
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  handleSSEEvent(data) {
    if (data.op && data.path && data.value !== undefined) {
      this.handleJSONPatch(data);
      return;
    }
    switch (data.type) {
      case "connected":
        console.log("ClackClient: Connected as user:", data.user);
        if (data.version) {
          this.emit("version:received", data.version);
        }
        break;
      case "room_owner_changed":
        this.emit("room:owner_changed", data);
        break;
      case "room_deleted":
        this.emit("room:deleted", data);
        break;
      default:
        console.log("ClackClient: Unknown SSE event type:", data.type);
    }
  }
  handleJSONPatch(patch) {
    console.log("handleJSONPatch called with:", patch);
    const { op, path, value } = patch;
    switch (op) {
      case "add":
        if (path === "/users") {
          console.log("Emitting user:new event");
          this.emit("user:new", value);
        } else if (path === "/rooms") {
          console.log("Emitting room:new event");
          this.emit("room:new", value);
        } else if (path === "/messages") {
          this.emit("message:new", value);
        } else if (path.startsWith("/room_messages/")) {
          this.emit("room_message:new", value);
        }
        break;
      case "replace":
        if (path.startsWith("/rooms/")) {
          this.emit("room:updated", { room: value });
        }
        break;
      case "remove":
        break;
      default:
        console.log("ClackClient: Unknown JSON patch operation:", op);
    }
  }
  async makeMCPRequest(method, params = {}) {
    if (!this.token) {
      throw new Error("Authentication required");
    }
    this.requestId++;
    const request = {
      jsonrpc: "2.0",
      id: this.requestId,
      method: "tools/call",
      params: {
        name: method,
        arguments: params
      }
    };
    const response = await fetch(`${this.baseUrl}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    if (jsonResponse.error) {
      throw new Error(jsonResponse.error.message);
    }
    return jsonResponse.result;
  }
  async sendMessage(senderId, otherUserId, content) {
    const result = await this.makeMCPRequest("send_message", { senderId, otherUserId, content });
    return result.content[0].text ? JSON.parse(result.content[0].text).message : null;
  }
  async createRoom(name, description, createdBy) {
    const result = await this.makeMCPRequest("create_room", { name, description, createdBy });
    return result.content[0].text ? JSON.parse(result.content[0].text).room : null;
  }
  async joinRoom(roomId, userId) {
    const result = await this.makeMCPRequest("join_room", { roomId, userId });
    return result.content[0].text ? JSON.parse(result.content[0].text).success : false;
  }
  async leaveRoom(roomId, userId) {
    const result = await this.makeMCPRequest("leave_room", { roomId, userId });
    return result.content[0].text ? JSON.parse(result.content[0].text).success : false;
  }
  async sendRoomMessage(senderId, roomId, content) {
    const result = await this.makeMCPRequest("send_room_message", { senderId, roomId, content });
    return result.content[0].text ? JSON.parse(result.content[0].text).message : null;
  }
  isConnected() {
    return (this.eventSource?.readyState ?? EventSource.CLOSED) === EventSource.OPEN;
  }
  getConnectionState() {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
  async getAllUsers() {
    const allUsers = [];
    const batchSize = 100;
    let startIndex = 0;
    while (true) {
      const endIndex = startIndex + batchSize;
      const result = await this.makeMCPRequest("get_users_by_index_range", {
        startIndex,
        endIndex
      });
      const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
      if (!unwrappedResult.success || !unwrappedResult.users || unwrappedResult.users.length === 0) {
        break;
      }
      allUsers.push(...unwrappedResult.users);
      if (unwrappedResult.users.length < batchSize) {
        break;
      }
      startIndex = endIndex;
    }
    return allUsers;
  }
  async getAllRooms() {
    console.log("ClackClient: Getting all rooms...");
    const allRooms = [];
    const batchSize = 100;
    let startIndex = 0;
    while (true) {
      const endIndex = startIndex + batchSize;
      console.log(`ClackClient: Fetching rooms ${startIndex} to ${endIndex}`);
      const result = await this.makeMCPRequest("get_rooms_by_index_range", {
        startIndex,
        endIndex
      });
      console.log("ClackClient: get_rooms_by_index_range result:", result);
      const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
      console.log("ClackClient: Unwrapped result:", unwrappedResult);
      if (!unwrappedResult.success || !unwrappedResult.rooms || unwrappedResult.rooms.length === 0) {
        console.log("ClackClient: No more rooms, breaking");
        break;
      }
      allRooms.push(...unwrappedResult.rooms);
      console.log(`ClackClient: Added ${unwrappedResult.rooms.length} rooms, total: ${allRooms.length}`);
      if (unwrappedResult.rooms.length < batchSize) {
        console.log("ClackClient: Less than batch size, breaking");
        break;
      }
      startIndex = endIndex;
    }
    console.log("ClackClient: getAllRooms returning:", allRooms.length, "rooms");
    return allRooms;
  }
  async getAllMessages(userId) {
    const allMessages = [];
    const batchSize = 100;
    let startIndex = 0;
    while (true) {
      const endIndex = startIndex + batchSize;
      const result = await this.makeMCPRequest("get_messages_by_index_range", {
        startIndex,
        endIndex,
        userId
      });
      if (!result.success || !result.messages || result.messages.length === 0) {
        break;
      }
      allMessages.push(...result.messages);
      if (result.messages.length < batchSize) {
        break;
      }
      startIndex = endIndex;
    }
    return allMessages;
  }
  async getAllRoomMessages(roomId) {
    const allMessages = [];
    const batchSize = 100;
    let startIndex = 0;
    while (true) {
      const endIndex = startIndex + batchSize;
      const result = await this.makeMCPRequest("get_room_messages_by_index_range", {
        startIndex,
        endIndex,
        roomId
      });
      if (!result.success || !result.messages || result.messages.length === 0) {
        break;
      }
      allMessages.push(...result.messages);
      if (result.messages.length < batchSize) {
        break;
      }
      startIndex = endIndex;
    }
    return allMessages;
  }
  async getMessagesPage(userId, startIndex, batchSize = 50) {
    const result = await this.makeMCPRequest("get_messages_by_index_range", {
      startIndex,
      endIndex: startIndex + batchSize,
      userId
    });
    const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
    if (!unwrappedResult.success || !unwrappedResult.messages) {
      return [];
    }
    return unwrappedResult.messages;
  }
  async getRoomMessagesPage(roomId, startIndex, batchSize = 50) {
    const result = await this.makeMCPRequest("get_room_messages_by_index_range", {
      startIndex,
      endIndex: startIndex + batchSize,
      roomId
    });
    const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
    if (!unwrappedResult.success || !unwrappedResult.messages) {
      return [];
    }
    return unwrappedResult.messages;
  }
  async getUserRooms(userId) {
    const result = await this.makeMCPRequest("get_user_rooms", { userId });
    const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
    if (!unwrappedResult.success || !unwrappedResult.rooms) {
      return [];
    }
    return unwrappedResult.rooms;
  }
  async changeRoomOwner(roomId, newOwnerId, currentOwnerId) {
    const result = await this.makeMCPRequest("change_room_owner", {
      roomId,
      newOwnerId,
      currentOwnerId
    });
    const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
    if (!unwrappedResult.success) {
      throw new Error(unwrappedResult.message || "Failed to change room owner");
    }
    return unwrappedResult;
  }
  async deleteRoom(roomId, ownerId) {
    const result = await this.makeMCPRequest("delete_room", {
      roomId,
      ownerId
    });
    const unwrappedResult = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
    if (!unwrappedResult.success) {
      throw new Error(unwrappedResult.message || "Failed to delete room");
    }
    return unwrappedResult;
  }
}
export {
  ClackClient
};
