/**
 * Type definitions for Discord POSSE MCP Server
 */

/**
 * Message data structure returned from Discord API
 */
export interface Message {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  channel: {
    id: string;
    name: string;
  };
  timestamp: string; // ISO 8601 format
  attachments?: {
    id: string;
    filename: string;
    url: string;
    contentType: string;
  }[];
  embeds?: {
    title?: string;
    description?: string;
    url?: string;
  }[];
  thread?: {
    id: string;
    name: string;
    parentMessageId: string;
  };
  reactions?: {
    emoji: string;
    count: number;
  }[];
}

/**
 * User information from Discord server
 */
export interface UserInfo {
  id: string;
  username: string;
  discriminator: string;
  displayName: string;
  avatar: string;
  roles: {
    id: string;
    name: string;
    color: string;
    position: number;
  }[];
  joinedAt: string; // ISO 8601 format
  status: 'online' | 'offline' | 'idle' | 'dnd';
  isBot: boolean;
}

/**
 * Channel information from Discord server
 */
export interface ChannelInfo {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'announcement' | 'forum';
  topic?: string;
  position: number;
  parentId?: string;
  createdAt: string; // ISO 8601 format
  memberCount?: number; // for voice channels
}

/**
 * Server statistics from Discord
 */
export interface ServerStats {
  guildId: string;
  name: string;
  memberCount: number;
  onlineCount: number;
  channelCount: {
    total: number;
    text: number;
    voice: number;
    category: number;
  };
  roleCount: number;
  createdAt: string; // ISO 8601 format
  iconUrl?: string;
}

/**
 * MCP Tool Result structure
 */
export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Error Codes following JSON-RPC specification
 */
export enum MCPErrorCode {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // Custom application errors
  RATE_LIMIT_ERROR = -32000,
  AUTHENTICATION_ERROR = -32001,
  PERMISSION_ERROR = -32002,
  NOT_FOUND_ERROR = -32003,
  DISCORD_API_ERROR = -32004,
}

/**
 * MCP Error structure
 */
export interface MCPError {
  code: MCPErrorCode;
  message: string;
  data?: {
    details?: string;
    retryAfter?: number; // Rate limit retry time in seconds
    requiredPermissions?: string[];
  };
}

/**
 * Parameters for message search
 */
export interface MessageSearchParams {
  query: string;
  channel_id?: string;
  channel_name?: string;
  author_id?: string;
  author_name?: string;
  after?: string; // ISO 8601 format
  before?: string; // ISO 8601 format
  include_threads?: boolean;
  limit?: number;
}

/**
 * Parameters for user info retrieval
 */
export interface GetUserInfoParams {
  username?: string;
  user_id?: string;
}

/**
 * Parameters for channel info retrieval
 */
export interface GetChannelInfoParams {
  channel_id: string;
}

/**
 * Channel activity statistics
 */
export interface ChannelActivity {
  channelId: string;
  channelName: string;
  period: {
    start: string; // ISO 8601 format
    end: string; // ISO 8601 format
  };
  totalMessages: number;
  activeUsers: number;
  messagesPerDay: number;
  topAuthors: Array<{
    userId: string;
    username: string;
    messageCount: number;
  }>;
  peakHours: Array<{
    hour: number; // 0-23
    messageCount: number;
  }>;
}
