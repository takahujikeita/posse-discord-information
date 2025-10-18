/**
 * Get Channel Info Tool Handler
 * Handles the get_channel_info MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  GetChannelInfoParams,
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Validate get_channel_info parameters
 */
function validateParams(params: any): { valid: boolean; error?: MCPError } {
  // channel_id is required
  if (!params.channel_id || typeof params.channel_id !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'channel_id parameter is required and must be a string',
        },
      },
    };
  }

  return { valid: true };
}

/**
 * Handle get_channel_info tool call
 */
export async function handleGetChannelInfo(
  discordService: DiscordService,
  params: any
): Promise<CallToolResult> {
  try {
    // Validate parameters
    const validation = validateParams(params);
    if (!validation.valid && validation.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validation.error, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Call Discord service
    const channelInfo = await discordService.getChannelInfo(params.channel_id);

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(channelInfo, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Handle MCP errors from Discord service (including NOT_FOUND)
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
