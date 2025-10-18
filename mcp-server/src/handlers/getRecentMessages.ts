/**
 * Get Recent Messages Tool Handler
 * Handles the get_recent_messages MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Validate get_recent_messages parameters
 */
function validateParams(params: any): { valid: boolean; error?: MCPError } {
  // Check if at least one of channel_id or channel_name is provided
  if (!params.channel_id && !params.channel_name) {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'Either channel_id or channel_name parameter is required',
        },
      },
    };
  }

  // Validate channel_id if provided
  if (params.channel_id !== undefined && typeof params.channel_id !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'channel_id must be a string',
        },
      },
    };
  }

  // Validate channel_name if provided
  if (params.channel_name !== undefined && typeof params.channel_name !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'channel_name must be a string',
        },
      },
    };
  }

  // Validate limit if provided
  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || params.limit < 1) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'limit must be a positive number',
          },
        },
      };
    }

    if (params.limit > 100) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'limit cannot exceed 100',
          },
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Handle get_recent_messages tool call
 */
export async function handleGetRecentMessages(
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

    // Resolve channel ID from channel name if needed
    let channelId = params.channel_id;
    
    if (!channelId && params.channel_name) {
      const channelIds = await discordService.resolveChannelId(params.channel_name);
      
      if (channelIds.length === 0) {
        const notFoundError: MCPError = {
          code: MCPErrorCode.NOT_FOUND_ERROR,
          message: 'Channel not found',
          data: {
            details: `No channel found with name: ${params.channel_name}`,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(notFoundError, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Use the first matching channel
      channelId = channelIds[0];
    }

    // Get recent messages
    const limit = params.limit || 20;
    const messages = await discordService.getRecentMessages(channelId, limit);

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(messages, null, 2),
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
