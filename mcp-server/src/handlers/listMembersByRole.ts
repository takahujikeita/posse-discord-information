/**
 * List Members By Role Tool Handler
 * Handles the list_members_by_role MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Validate list_members_by_role parameters
 */
function validateParams(params: any): { valid: boolean; error?: MCPError } {
  // role_name parameter is required
  if (!params.role_name) {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'role_name parameter is required',
        },
      },
    };
  }

  if (typeof params.role_name !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'role_name parameter must be a string',
        },
      },
    };
  }

  return { valid: true };
}

/**
 * Handle list_members_by_role tool call
 */
export async function handleListMembersByRole(
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
    const members = await discordService.listMembersByRole(params.role_name);

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(members, null, 2),
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
