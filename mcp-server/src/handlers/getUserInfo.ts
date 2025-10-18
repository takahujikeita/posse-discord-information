/**
 * Get User Info Tool Handler
 * Handles the get_user_info MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  GetUserInfoParams,
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Validate get_user_info parameters
 */
function validateParams(params: any): { valid: boolean; error?: MCPError } {
  // At least one of username or user_id must be provided
  if (!params.username && !params.user_id) {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'Either username or user_id parameter is required',
        },
      },
    };
  }

  // Validate username if provided
  if (params.username !== undefined && typeof params.username !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'username must be a string',
        },
      },
    };
  }

  // Validate user_id if provided
  if (params.user_id !== undefined && typeof params.user_id !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'user_id must be a string',
        },
      },
    };
  }

  return { valid: true };
}

/**
 * Handle get_user_info tool call
 */
export async function handleGetUserInfo(
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
    const userInfo = await discordService.getUserInfo(
      params.user_id,
      params.username
    );

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(userInfo, null, 2),
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
