/**
 * Discord Service - Handles all Discord API interactions
 */

import { 
  Client, 
  GatewayIntentBits, 
  TextChannel, 
  VoiceChannel,
  CategoryChannel,
  ForumChannel,
  NewsChannel,
  Collection,
  Message as DiscordMessage,
  GuildMember,
  ChannelType
} from 'discord.js';
import {
  Message,
  UserInfo,
  ChannelInfo,
  ServerStats,
  MessageSearchParams,
  ChannelActivity,
  MCPErrorCode
} from '../types/index.js';
import { rateLimitHandler } from '../utils/errors.js';

export class DiscordService {
  private client: Client;
  private guildId: string;
  private isConnected: boolean = false;
  private channelCache: Map<string, string[]> = new Map(); // channel name (lowercase) -> channel IDs

  constructor(botToken: string, guildId: string) {
    if (!botToken) {
      throw new Error('Discord bot token is required');
    }
    if (!guildId) {
      throw new Error('Discord guild ID is required');
    }

    this.guildId = guildId;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
      ],
    });
  }

  /**
   * Connect to Discord API using bot token
   */
  async connect(): Promise<void> {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      
      // Wait for client to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Discord client connection timeout'));
        }, 30000); // 30 second timeout

        this.client.once('clientReady', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          // Use console.error for logging to avoid interfering with MCP stdio protocol
          console.error(`Discord bot connected as ${this.client.user?.tag}`);
          resolve();
        });

        this.client.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Verify guild access
      const guild = await this.client.guilds.fetch(this.guildId);
      if (!guild) {
        throw new Error(`Cannot access guild with ID: ${this.guildId}`);
      }

      // Build channel cache after successful connection
      await this.buildChannelCache();
    } catch (error) {
      this.isConnected = false;
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          throw {
            code: MCPErrorCode.AUTHENTICATION_ERROR,
            message: 'Invalid Discord bot token',
            data: {
              details: 'Please check your DISCORD_BOT_TOKEN environment variable',
            },
          };
        }
        throw {
          code: MCPErrorCode.DISCORD_API_ERROR,
          message: 'Failed to connect to Discord',
          data: {
            details: error.message,
          },
        };
      }
      throw error;
    }
  }

  /**
   * Build channel name to ID mapping cache
   */
  private async buildChannelCache(): Promise<void> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const channels = await guild.channels.fetch();

      // Clear existing cache
      this.channelCache.clear();

      // Build cache with lowercase channel names as keys
      for (const [, channel] of channels) {
        if (!channel) continue;
        
        const channelName = channel.name.toLowerCase();
        const existingIds = this.channelCache.get(channelName) || [];
        existingIds.push(channel.id);
        this.channelCache.set(channelName, existingIds);
      }

      console.error(`Channel cache built with ${this.channelCache.size} unique channel names`);
    } catch (error) {
      console.error('Failed to build channel cache:', error);
      // Don't throw - cache building failure shouldn't prevent connection
    }
  }

  /**
   * Resolve channel name to channel ID(s)
   * @param channelName - Channel name (case-insensitive)
   * @returns Array of channel IDs matching the name
   * @throws NOT_FOUND_ERROR if no channels found with the given name
   */
  async resolveChannelId(channelName: string): Promise<string[]> {
    this.ensureConnected();

    const normalizedName = channelName.toLowerCase();
    const channelIds = this.channelCache.get(normalizedName);

    if (!channelIds || channelIds.length === 0) {
      throw {
        code: MCPErrorCode.NOT_FOUND_ERROR,
        message: 'Channel not found',
        data: {
          details: `No channel found with name: ${channelName}`,
        },
      };
    }

    return channelIds;
  }

  /**
   * Ensure the client is connected before operations
   */
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw {
        code: MCPErrorCode.INTERNAL_ERROR,
        message: 'Discord client is not connected',
        data: {
          details: 'Please ensure connect() is called before using Discord service',
        },
      };
    }
  }

  /**
   * Get the guild instance
   */
  private async getGuild() {
    this.ensureConnected();
    try {
      return await this.client.guilds.fetch(this.guildId);
    } catch (error) {
      throw {
        code: MCPErrorCode.NOT_FOUND_ERROR,
        message: 'Guild not found',
        data: {
          details: `Cannot access guild with ID: ${this.guildId}`,
        },
      };
    }
  }

  /**
   * Search for messages in the Discord server
   */
  async searchMessages(params: MessageSearchParams): Promise<Message[]> {
    this.ensureConnected();
    
    const { 
      query, 
      channel_id, 
      channel_name,
      author_id,
      author_name,
      after,
      before,
      include_threads = true,
      limit = 20 
    } = params;
    const maxLimit = Math.min(limit, 50);
    const results: Message[] = [];

    try {
      // Parse date filters if provided
      let afterDate: Date | undefined;
      let beforeDate: Date | undefined;
      
      if (after) {
        afterDate = new Date(after);
        if (isNaN(afterDate.getTime())) {
          throw {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Invalid date format',
            data: {
              details: 'after parameter must be a valid ISO 8601 date string',
            },
          };
        }
      }
      
      if (before) {
        beforeDate = new Date(before);
        if (isNaN(beforeDate.getTime())) {
          throw {
            code: MCPErrorCode.INVALID_PARAMS,
            message: 'Invalid date format',
            data: {
              details: 'before parameter must be a valid ISO 8601 date string',
            },
          };
        }
      }
      
      // Validate date range
      if (afterDate && beforeDate && afterDate >= beforeDate) {
        throw {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid date range',
          data: {
            details: 'after date must be earlier than before date',
          },
        };
      }

      // Resolve author if author_name is provided
      let resolvedAuthorId = author_id;
      if (author_name && !author_id) {
        try {
          const userInfo = await this.getUserInfo(undefined, author_name);
          resolvedAuthorId = userInfo.id;
        } catch (error: any) {
          // If user not found, return empty results
          if (error.code === MCPErrorCode.NOT_FOUND_ERROR) {
            return [];
          }
          throw error;
        }
      }

      const guild = await this.getGuild();
      
      // Resolve channels to search
      let channelIds: string[] = [];
      if (channel_id) {
        channelIds = [channel_id];
      } else if (channel_name) {
        channelIds = await this.resolveChannelId(channel_name);
      } else {
        // Search all text channels
        const allChannels = await guild.channels.fetch();
        channelIds = allChannels
          .filter(ch => ch?.type === ChannelType.GuildText)
          .map(ch => ch!.id);
      }

      // Search in each channel
      for (const channelId of channelIds) {
        if (results.length >= maxLimit) break;

        const channel = await guild.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) continue;

        const textChannel = channel as TextChannel;
        
        // Search in main channel
        await this.searchInChannel(
          textChannel,
          query,
          resolvedAuthorId,
          afterDate,
          beforeDate,
          results,
          maxLimit
        );

        // Search in threads if enabled
        if (include_threads && results.length < maxLimit) {
          await this.searchInThreads(
            textChannel,
            query,
            resolvedAuthorId,
            afterDate,
            beforeDate,
            results,
            maxLimit
          );
        }
      }

      return results;
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to search messages',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Search for messages in a specific channel
   */
  private async searchInChannel(
    channel: TextChannel,
    query: string,
    authorId: string | undefined,
    afterDate: Date | undefined,
    beforeDate: Date | undefined,
    results: Message[],
    maxLimit: number
  ): Promise<void> {
    const messages = await channel.messages.fetch({ limit: 100 });

    for (const [, message] of messages) {
      if (results.length >= maxLimit) break;
      
      // Apply filters
      if (!message.content.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }
      
      if (authorId && message.author.id !== authorId) {
        continue;
      }
      
      if (afterDate && message.createdAt < afterDate) {
        continue;
      }
      
      if (beforeDate && message.createdAt > beforeDate) {
        continue;
      }
      
      results.push(this.convertToMessage(message));
    }
  }

  /**
   * Search for messages in threads within a channel
   */
  private async searchInThreads(
    channel: TextChannel,
    query: string,
    authorId: string | undefined,
    afterDate: Date | undefined,
    beforeDate: Date | undefined,
    results: Message[],
    maxLimit: number
  ): Promise<void> {
    try {
      // Fetch active threads
      const activeThreads = await channel.threads.fetchActive();
      
      // Also fetch archived threads (public only, limited to recent)
      const archivedThreads = await channel.threads.fetchArchived({ limit: 20 });
      
      const allThreads = [
        ...activeThreads.threads.values(),
        ...archivedThreads.threads.values()
      ];

      for (const thread of allThreads) {
        if (results.length >= maxLimit) break;
        
        const messages = await thread.messages.fetch({ limit: 50 });
        
        for (const [, message] of messages) {
          if (results.length >= maxLimit) break;
          
          // Apply filters
          if (!message.content.toLowerCase().includes(query.toLowerCase())) {
            continue;
          }
          
          if (authorId && message.author.id !== authorId) {
            continue;
          }
          
          if (afterDate && message.createdAt < afterDate) {
            continue;
          }
          
          if (beforeDate && message.createdAt > beforeDate) {
            continue;
          }
          
          // Convert message with thread information
          const convertedMessage = this.convertToMessage(message);
          convertedMessage.thread = {
            id: thread.id,
            name: thread.name,
            parentMessageId: thread.id, // Thread ID is the parent message ID
          };
          
          results.push(convertedMessage);
        }
      }
    } catch (error) {
      // Log thread search errors but don't fail the entire search
      console.error('Error searching threads:', error);
    }
  }

  /**
   * Convert Discord.js Message to our Message type
   */
  private convertToMessage(message: DiscordMessage): Message {
    const converted: Message = {
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName || message.author.username,
        avatar: message.author.displayAvatarURL(),
      },
      channel: {
        id: message.channel.id,
        name: message.channel.isDMBased() ? 'DM' : (message.channel as TextChannel).name,
      },
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map(att => ({
        id: att.id,
        filename: att.name || 'unknown',
        url: att.url,
        contentType: att.contentType || 'unknown',
      })),
      embeds: message.embeds.map(embed => ({
        title: embed.title || undefined,
        description: embed.description || undefined,
        url: embed.url || undefined,
      })),
    };

    // Add reactions if present
    if (message.reactions.cache.size > 0) {
      converted.reactions = Array.from(message.reactions.cache.values()).map(reaction => ({
        emoji: reaction.emoji.name || reaction.emoji.toString(),
        count: reaction.count,
      }));
    }

    return converted;
  }

  /**
   * Get user information by username or user ID
   */
  async getUserInfo(userId?: string, username?: string): Promise<UserInfo> {
    this.ensureConnected();

    try {
      const guild = await this.getGuild();
      let member: GuildMember | undefined;

      if (userId) {
        member = await guild.members.fetch(userId);
      } else if (username) {
        const members = await guild.members.fetch();
        member = members.find(m => 
          m.user.username.toLowerCase() === username.toLowerCase() ||
          m.displayName.toLowerCase() === username.toLowerCase()
        );
      }

      if (!member) {
        throw {
          code: MCPErrorCode.NOT_FOUND_ERROR,
          message: 'User not found',
          data: {
            details: `No user found with ${userId ? `ID: ${userId}` : `username: ${username}`}`,
          },
        };
      }

      return this.convertToUserInfo(member);
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to get user info',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Convert GuildMember to UserInfo type
   */
  private convertToUserInfo(member: GuildMember): UserInfo {
    const presence = member.presence;
    const status = presence?.status || 'offline';

    return {
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      displayName: member.displayName,
      avatar: member.user.displayAvatarURL(),
      roles: member.roles.cache.map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
      })),
      joinedAt: member.joinedAt?.toISOString() || new Date().toISOString(),
      status: status as 'online' | 'offline' | 'idle' | 'dnd',
      isBot: member.user.bot,
    };
  }

  /**
   * Get channel information by channel ID
   */
  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    this.ensureConnected();

    try {
      const guild = await this.getGuild();
      const channel = await guild.channels.fetch(channelId);

      if (!channel) {
        throw {
          code: MCPErrorCode.NOT_FOUND_ERROR,
          message: 'Channel not found',
          data: {
            details: `No channel found with ID: ${channelId}`,
          },
        };
      }

      return this.convertToChannelInfo(channel);
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to get channel info',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Convert Discord channel to ChannelInfo type
   */
  private convertToChannelInfo(channel: any): ChannelInfo {
    let type: ChannelInfo['type'] = 'text';
    
    switch (channel.type) {
      case ChannelType.GuildText:
        type = 'text';
        break;
      case ChannelType.GuildVoice:
        type = 'voice';
        break;
      case ChannelType.GuildCategory:
        type = 'category';
        break;
      case ChannelType.GuildAnnouncement:
        type = 'announcement';
        break;
      case ChannelType.GuildForum:
        type = 'forum';
        break;
    }

    const info: ChannelInfo = {
      id: channel.id,
      name: channel.name,
      type,
      position: channel.position || 0,
      createdAt: channel.createdAt?.toISOString() || new Date().toISOString(),
    };

    if (channel.topic) {
      info.topic = channel.topic;
    }

    if (channel.parentId) {
      info.parentId = channel.parentId;
    }

    if (channel.type === ChannelType.GuildVoice && channel.members) {
      info.memberCount = channel.members.size;
    }

    return info;
  }

  /**
   * Get server statistics
   */
  async getServerStats(): Promise<ServerStats> {
    this.ensureConnected();

    try {
      const guild = await this.getGuild();
      await guild.members.fetch();
      const channels = await guild.channels.fetch();

      const onlineCount = guild.members.cache.filter(
        member => member.presence?.status && member.presence.status !== 'offline'
      ).size;

      const channelCounts = {
        total: channels.size,
        text: channels.filter(ch => ch?.type === ChannelType.GuildText).size,
        voice: channels.filter(ch => ch?.type === ChannelType.GuildVoice).size,
        category: channels.filter(ch => ch?.type === ChannelType.GuildCategory).size,
      };

      return {
        guildId: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        onlineCount,
        channelCount: channelCounts,
        roleCount: guild.roles.cache.size,
        createdAt: guild.createdAt.toISOString(),
        iconUrl: guild.iconURL() || undefined,
      };
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to get server stats',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * List all channels in the server
   * @param type - Optional channel type filter
   * @returns Array of ChannelInfo
   */
  async listChannels(type?: string): Promise<ChannelInfo[]> {
    this.ensureConnected();

    try {
      const guild = await this.getGuild();
      const channels = await guild.channels.fetch();
      const channelList: ChannelInfo[] = [];

      for (const [, channel] of channels) {
        if (!channel) continue;

        // Apply type filter if specified
        if (type) {
          let matchesType = false;
          switch (type.toLowerCase()) {
            case 'text':
              matchesType = channel.type === ChannelType.GuildText;
              break;
            case 'voice':
              matchesType = channel.type === ChannelType.GuildVoice;
              break;
            case 'category':
              matchesType = channel.type === ChannelType.GuildCategory;
              break;
            case 'announcement':
              matchesType = channel.type === ChannelType.GuildAnnouncement;
              break;
            case 'forum':
              matchesType = channel.type === ChannelType.GuildForum;
              break;
          }
          
          if (!matchesType) continue;
        }

        channelList.push(this.convertToChannelInfo(channel));
      }

      // Sort by position
      channelList.sort((a, b) => a.position - b.position);

      return channelList;
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to list channels',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get recent messages from a channel
   * @param channelId - Channel ID to get messages from
   * @param limit - Maximum number of messages to return (default: 20, max: 100)
   * @returns Array of recent messages in reverse chronological order
   */
  async getRecentMessages(channelId: string, limit: number = 20): Promise<Message[]> {
    this.ensureConnected();

    const maxLimit = Math.min(limit, 100);

    try {
      const guild = await this.getGuild();
      const channel = await guild.channels.fetch(channelId);

      if (!channel) {
        throw {
          code: MCPErrorCode.NOT_FOUND_ERROR,
          message: 'Channel not found',
          data: {
            details: `No channel found with ID: ${channelId}`,
          },
        };
      }

      if (channel.type !== ChannelType.GuildText) {
        throw {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid channel type',
          data: {
            details: 'Can only get messages from text channels',
          },
        };
      }

      const textChannel = channel as TextChannel;
      const messages = await textChannel.messages.fetch({ limit: maxLimit });

      // Convert to Message array and sort by timestamp (newest first)
      const messageArray = Array.from(messages.values())
        .map(msg => this.convertToMessage(msg))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return messageArray;
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to get recent messages',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get channel activity statistics
   * @param channelId - Channel ID to analyze
   * @param after - Optional start date for analysis period
   * @param before - Optional end date for analysis period
   * @returns Channel activity statistics
   */
  async getChannelActivity(
    channelId: string,
    after?: Date,
    before?: Date
  ): Promise<ChannelActivity> {
    this.ensureConnected();

    try {
      const guild = await this.getGuild();
      const channel = await guild.channels.fetch(channelId);

      if (!channel) {
        throw {
          code: MCPErrorCode.NOT_FOUND_ERROR,
          message: 'Channel not found',
          data: {
            details: `No channel found with ID: ${channelId}`,
          },
        };
      }

      if (channel.type !== ChannelType.GuildText) {
        throw {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid channel type',
          data: {
            details: 'Can only analyze activity for text channels',
          },
        };
      }

      const textChannel = channel as TextChannel;
      
      // Set default period if not specified
      const endDate = before || new Date();
      const startDate = after || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

      // Fetch messages within the period
      const allMessages: DiscordMessage[] = [];
      let lastMessageId: string | undefined;
      const maxMessagesToFetch = 1000; // Limit to prevent excessive API calls

      while (allMessages.length < maxMessagesToFetch) {
        const fetchOptions = { limit: 100, before: lastMessageId };

        const fetchResult = await textChannel.messages.fetch(fetchOptions);
        
        // Handle the result - it should be a Collection when using limit
        if (!fetchResult || (fetchResult as any).size === 0) break;
        
        const messagesCollection = fetchResult as Collection<string, DiscordMessage>;

        for (const [, message] of messagesCollection) {
          // Filter by date range
          if (message.createdAt < startDate) {
            // Reached messages older than our period, stop fetching
            break;
          }
          if (message.createdAt >= startDate && message.createdAt <= endDate) {
            allMessages.push(message);
          }
        }

        // Check if we've gone past the start date
        const oldestMessage = Array.from(messagesCollection.values()).pop();
        if (oldestMessage && oldestMessage.createdAt < startDate) {
          break;
        }

        const lastKey = Array.from(messagesCollection.keys()).pop();
        if (lastKey) {
          lastMessageId = lastKey;
        }
        
        // If we got fewer than 100 messages, we've reached the end
        if (messagesCollection.size < 100) break;
      }

      // Calculate statistics
      const totalMessages = allMessages.length;
      const uniqueUsers = new Set(allMessages.map(msg => msg.author.id));
      const activeUsers = uniqueUsers.size;

      // Calculate messages per day
      const periodDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const messagesPerDay = totalMessages / periodDays;

      // Calculate top authors
      const authorCounts = new Map<string, { username: string; count: number }>();
      for (const message of allMessages) {
        const authorId = message.author.id;
        const existing = authorCounts.get(authorId);
        if (existing) {
          existing.count++;
        } else {
          authorCounts.set(authorId, {
            username: message.author.username,
            count: 1,
          });
        }
      }

      const topAuthors = Array.from(authorCounts.entries())
        .map(([userId, data]) => ({
          userId,
          username: data.username,
          messageCount: data.count,
        }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);

      // Calculate peak hours
      const hourCounts = new Array(24).fill(0);
      for (const message of allMessages) {
        const hour = message.createdAt.getHours();
        hourCounts[hour]++;
      }

      const peakHours = hourCounts
        .map((count, hour) => ({ hour, messageCount: count }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 24); // Return all hours, sorted by activity

      return {
        channelId: textChannel.id,
        channelName: textChannel.name,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        totalMessages,
        activeUsers,
        messagesPerDay: Math.round(messagesPerDay * 100) / 100, // Round to 2 decimal places
        topAuthors,
        peakHours,
      };
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to get channel activity',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * List members by role name
   * @param roleName - Role name to filter members by (case-insensitive)
   * @returns Array of UserInfo for members with the specified role
   */
  async listMembersByRole(roleName: string): Promise<UserInfo[]> {
    this.ensureConnected();

    try {
      const guild = await this.getGuild();
      
      // Fetch all members
      await guild.members.fetch();
      
      // Find the role (case-insensitive)
      const role = guild.roles.cache.find(
        r => r.name.toLowerCase() === roleName.toLowerCase()
      );

      if (!role) {
        throw {
          code: MCPErrorCode.NOT_FOUND_ERROR,
          message: 'Role not found',
          data: {
            details: `No role found with name: ${roleName}`,
          },
        };
      }

      // Get all members with this role
      const membersWithRole = guild.members.cache.filter(
        member => member.roles.cache.has(role.id)
      );

      // Convert to UserInfo array
      const userInfoList = Array.from(membersWithRole.values()).map(member =>
        this.convertToUserInfo(member)
      );

      return userInfoList;
    } catch (error: any) {
      if (error.code) throw error;
      
      // Check for rate limit errors
      if (rateLimitHandler.isRateLimitError(error)) {
        throw rateLimitHandler.handleRateLimitError(error);
      }
      
      throw {
        code: MCPErrorCode.DISCORD_API_ERROR,
        message: 'Failed to list members by role',
        data: {
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      this.client.destroy();
      this.isConnected = false;
    }
  }
}
