#!/usr/bin/env node

/**
 * Discord POSSE MCP Server
 * Main entry point for the MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { DiscordService } from './services/discordService.js';
import { handleSearchMessages } from './handlers/searchMessages.js';
import { handleGetUserInfo } from './handlers/getUserInfo.js';
import { handleGetChannelInfo } from './handlers/getChannelInfo.js';
import { handleGetServerStats } from './handlers/getServerStats.js';
import { handleListChannels } from './handlers/listChannels.js';
import { handleGetRecentMessages } from './handlers/getRecentMessages.js';
import { handleGetChannelActivity } from './handlers/getChannelActivity.js';
import { handleListMembersByRole } from './handlers/listMembersByRole.js';
import { MCPErrorCode } from './types/index.js';

// Load environment variables
config();

/**
 * Main MCP Server class
 */
class MCPServer {
  private server: Server;
  private discordService: DiscordService | null = null;

  constructor() {
    // Initialize MCP Server with server information and capabilities
    this.server = new Server(
      {
        name: 'discord-posse-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  /**
   * Setup tool handlers for MCP protocol
   */
  private setupToolHandlers(): void {
    // Register tools/list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_messages',
            description: 'Search for messages in the POSSE Discord server with advanced filters',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find messages',
                },
                channel_id: {
                  type: 'string',
                  description: 'Optional channel ID to limit search scope',
                },
                channel_name: {
                  type: 'string',
                  description: 'Optional channel name to limit search scope (alternative to channel_id)',
                },
                author_id: {
                  type: 'string',
                  description: 'Optional user ID to filter messages by author',
                },
                author_name: {
                  type: 'string',
                  description: 'Optional username to filter messages by author (alternative to author_id)',
                },
                after: {
                  type: 'string',
                  description: 'Optional ISO 8601 timestamp to get messages after this date',
                },
                before: {
                  type: 'string',
                  description: 'Optional ISO 8601 timestamp to get messages before this date',
                },
                include_threads: {
                  type: 'boolean',
                  description: 'Whether to include thread messages in search results (default: true)',
                  default: true,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of messages to return (default: 20, max: 50)',
                  default: 20,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_user_info',
            description: 'Get information about a Discord user in the POSSE server',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Username to search for',
                },
                user_id: {
                  type: 'string',
                  description: 'Discord user ID',
                },
              },
            },
          },
          {
            name: 'get_channel_info',
            description: 'Get information about a Discord channel',
            inputSchema: {
              type: 'object',
              properties: {
                channel_id: {
                  type: 'string',
                  description: 'Discord channel ID',
                },
              },
              required: ['channel_id'],
            },
          },
          {
            name: 'get_server_stats',
            description: 'Get statistics about the POSSE Discord server',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_channels',
            description: 'List all channels in the POSSE Discord server',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Optional channel type filter (text, voice, category, announcement, forum)',
                  enum: ['text', 'voice', 'category', 'announcement', 'forum'],
                },
              },
            },
          },
          {
            name: 'get_recent_messages',
            description: 'Get recent messages from a channel',
            inputSchema: {
              type: 'object',
              properties: {
                channel_id: {
                  type: 'string',
                  description: 'Channel ID to get messages from',
                },
                channel_name: {
                  type: 'string',
                  description: 'Channel name to get messages from (alternative to channel_id)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of messages to return (default: 20, max: 100)',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'get_channel_activity',
            description: 'Get activity statistics for a channel over a specified time period',
            inputSchema: {
              type: 'object',
              properties: {
                channel_id: {
                  type: 'string',
                  description: 'Channel ID to analyze',
                },
                channel_name: {
                  type: 'string',
                  description: 'Channel name to analyze (alternative to channel_id)',
                },
                after: {
                  type: 'string',
                  description: 'Optional ISO 8601 timestamp to analyze activity after this date (default: 7 days ago)',
                },
                before: {
                  type: 'string',
                  description: 'Optional ISO 8601 timestamp to analyze activity before this date (default: now)',
                },
              },
            },
          },
          {
            name: 'list_members_by_role',
            description: 'List all members with a specific role in the POSSE Discord server',
            inputSchema: {
              type: 'object',
              properties: {
                role_name: {
                  type: 'string',
                  description: 'Role name to filter members by (case-insensitive)',
                },
              },
              required: ['role_name'],
            },
          },
        ],
      };
    });

    // Register tools/call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: params } = request.params;

      // Ensure Discord service is initialized
      if (!this.discordService) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: MCPErrorCode.INTERNAL_ERROR,
                message: 'Discord service not initialized',
                data: {
                  details: 'Server is not properly connected to Discord',
                },
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        // Route to appropriate handler based on tool name
        switch (name) {
          case 'search_messages':
            return await handleSearchMessages(this.discordService, params || {});

          case 'get_user_info':
            return await handleGetUserInfo(this.discordService, params || {});

          case 'get_channel_info':
            return await handleGetChannelInfo(this.discordService, params || {});

          case 'get_server_stats':
            return await handleGetServerStats(this.discordService, params || {});

          case 'list_channels':
            return await handleListChannels(this.discordService, params || {});

          case 'get_recent_messages':
            return await handleGetRecentMessages(this.discordService, params || {});

          case 'get_channel_activity':
            return await handleGetChannelActivity(this.discordService, params || {});

          case 'list_members_by_role':
            return await handleListMembersByRole(this.discordService, params || {});

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    code: MCPErrorCode.METHOD_NOT_FOUND,
                    message: 'Unknown tool',
                    data: {
                      details: `Tool "${name}" is not supported`,
                    },
                  }, null, 2),
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        // Handle unexpected errors
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: MCPErrorCode.INTERNAL_ERROR,
                message: 'Internal server error',
                data: {
                  details: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      // Validate environment variables
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const guildId = process.env.DISCORD_GUILD_ID;

      if (!botToken) {
        console.error('Error: DISCORD_BOT_TOKEN environment variable is required');
        process.exit(1);
      }

      if (!guildId) {
        console.error('Error: DISCORD_GUILD_ID environment variable is required');
        process.exit(1);
      }

      // Initialize Discord service
      console.error('Initializing Discord service...');
      this.discordService = new DiscordService(botToken, guildId);
      
      // Connect to Discord
      console.error('Connecting to Discord...');
      await this.discordService.connect();
      console.error('Successfully connected to Discord');

      // Setup graceful shutdown
      const cleanup = async () => {
        console.error('Shutting down...');
        if (this.discordService) {
          await this.discordService.disconnect();
        }
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Start MCP server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('MCP server started successfully');
    } catch (error) {
      console.error('Failed to start server:', error);
      
      if (this.discordService) {
        await this.discordService.disconnect();
      }
      
      process.exit(1);
    }
  }
}

// Main execution
const server = new MCPServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
