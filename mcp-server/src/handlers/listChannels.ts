/**
 * List Channels Tool Handler
 * Handles the list_channels MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Valid channel types
 */
const VALID_CHANNEL_TYPES = ['text', 'voice', 'category', 'announcement', 'forum'];

/**
 * Validate list_channels parameters
 */
function validateParams(params: any): { valid: boolean; error?: MCPError } {
  // type parameter is optional, but if provided must be a valid enum value
  if (params.type !== undefined) {
    if (typeof params.type !== 'string') {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'type parameter must be a string',
          },
        },
      };
    }

    if (!VALID_CHANNEL_TYPES.includes(params.type.toLowerCase())) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: `type parameter must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`,
          },
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Handle list_channels tool call
 */
export async function handleListChannels(
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
    const channels = await discordService.listChannels(params.type);

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(channels, null, 2),
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
