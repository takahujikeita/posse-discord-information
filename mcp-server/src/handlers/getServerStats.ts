/**
 * Get Server Stats Tool Handler
 * Handles the get_server_stats MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Handle get_server_stats tool call
 */
export async function handleGetServerStats(
  discordService: DiscordService,
  params: any
): Promise<CallToolResult> {
  try {
    // No parameters to validate for this tool
    
    // Call Discord service
    const serverStats = await discordService.getServerStats();

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(serverStats, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Handle MCP errors from Discord service
    if (error.code && error.message) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(error, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Handle unexpected errors
    const discordError: MCPError = {
      code: MCPErrorCode.DISCORD_API_ERROR,
      message: 'Discord API error',
      data: {
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(discordError, null, 2),
        },
      ],
      isError: true,
    };
  }
}
