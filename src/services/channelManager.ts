/**
 * @file Channel access control and permission management service
 * Provides centralized channel-based restrictions and permission checks for bot operations.
 * 
 * Features:
 * - Channel whitelist/blacklist management
 * - Owner override permissions
 * - DM (Direct Message) handling policies
 * - Configurable restriction modes
 * - Detailed access logging for security monitoring
 * 
 * Architecture:
 * - Pure functions for predictable behavior
 * - Flexible permission system with multiple access levels
 * - Extensible for future channel-based features
 * - Comprehensive audit trail for access decisions
 */

import { Message } from 'discord.js';
import { BOT_CONFIG } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Channel access control configuration
 */
interface ChannelConfig {
    mode: 'whitelist' | 'blacklist' | 'disabled';  // Access control mode
    allowedChannels: string[];                      // Whitelisted channel IDs
    blockedChannels: string[];                      // Blacklisted channel IDs
    allowDMs: boolean;                              // Allow direct messages
    ownerBypass: boolean;                           // Allow owner to bypass restrictions
    logAccess: boolean;                             // Log access decisions
}

/**
 * Result of channel access check with detailed reasoning
 */
interface AccessCheckResult {
    allowed: boolean;                               // Whether access is granted
    reason: string;                                 // Human-readable reason for decision
    ruleApplied: string;                           // Specific rule that determined access
    channelId: string;                             // Channel being checked
    userId: string;                                // User making the request
    isOwner: boolean;                              // Whether user is bot owner
    isDM: boolean;                                 // Whether message is from DM
}

/**
 * Default channel configuration for secure bot operation
 * Uses whitelist mode with only configured channel allowed
 */
const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
    mode: 'whitelist',                             // Only allow specific channels
    allowedChannels: [BOT_CONFIG.channelId],       // Use configured bot channel
    blockedChannels: [],                           // No explicit blocks needed in whitelist mode
    allowDMs: false,                               // Disable DMs for focus
    ownerBypass: true,                             // Owner can use bot anywhere
    logAccess: true                                // Log all access decisions
};

/**
 * Main channel access control function
 * Determines if a message should be processed based on channel restrictions
 * 
 * @param message - Discord message object to check
 * @param config - Optional channel configuration (uses defaults if not provided)
 * @returns Access check result with detailed reasoning
 */
export function checkChannelAccess(
    message: Message,
    config: Partial<ChannelConfig> = {}
): AccessCheckResult {
    const channelConfig = { ...DEFAULT_CHANNEL_CONFIG, ...config };
    const result = performAccessCheck(message, channelConfig);
    
    // Only log denied access for security monitoring
    if (channelConfig.logAccess && !result.allowed) {
        logger.info('Channel access denied', {
            reason: result.reason,
            channelId: result.channelId,
            userId: result.userId
        });
    }
    
    return result;
}

/**
 * Core access control logic with comprehensive rule evaluation
 * Applies configured restrictions in priority order
 * 
 * @param message - Discord message to evaluate
 * @param config - Channel configuration to apply
 * @returns Detailed access decision
 */
function performAccessCheck(message: Message, config: ChannelConfig): AccessCheckResult {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const isOwner = userId === BOT_CONFIG.ownerId;
    const isDM = message.channel.type === 1; // DM channel type
    
    const baseResult: Omit<AccessCheckResult, 'allowed' | 'reason' | 'ruleApplied'> = {
        channelId,
        userId,
        isOwner,
        isDM
    };
    
    // Rule 1: Check if access control is disabled
    if (config.mode === 'disabled') {
        return {
            ...baseResult,
            allowed: true,
            reason: 'Channel restrictions are disabled',
            ruleApplied: 'disabled_mode'
        };
    }
    
    // Rule 2: Owner bypass check (highest priority)
    if (isOwner && config.ownerBypass) {
        return {
            ...baseResult,
            allowed: true,
            reason: 'Bot owner has unrestricted access',
            ruleApplied: 'owner_bypass'
        };
    }
    
    // Rule 3: Direct Message handling
    if (isDM) {
        return {
            ...baseResult,
            allowed: config.allowDMs,
            reason: config.allowDMs 
                ? 'Direct messages are allowed' 
                : 'Direct messages are not permitted',
            ruleApplied: 'dm_policy'
        };
    }
    
    // Rule 4: Channel-specific access control
    return evaluateChannelRules(baseResult, config);
}

/**
 * Evaluate whitelist/blacklist rules for channel access
 * Handles both whitelist and blacklist modes with appropriate logic
 * 
 * @param baseResult - Base result object with common fields
 * @param config - Channel configuration
 * @returns Complete access decision
 */
function evaluateChannelRules(
    baseResult: Omit<AccessCheckResult, 'allowed' | 'reason' | 'ruleApplied'>,
    config: ChannelConfig
): AccessCheckResult {
    const { channelId } = baseResult;
    
    switch (config.mode) {
        case 'whitelist': {
            const isWhitelisted = config.allowedChannels.includes(channelId);
            return {
                ...baseResult,
                allowed: isWhitelisted,
                reason: isWhitelisted
                    ? 'Channel is in whitelist'
                    : 'Channel is not in whitelist',
                ruleApplied: 'whitelist_check'
            };
        }
            
        case 'blacklist': {
            const isBlacklisted = config.blockedChannels.includes(channelId);
            return {
                ...baseResult,
                allowed: !isBlacklisted,
                reason: isBlacklisted
                    ? 'Channel is blocked'
                    : 'Channel is not blocked',
                ruleApplied: 'blacklist_check'
            };
        }
            
        default:
            // Should never reach here with TypeScript, but defensive programming
            return {
                ...baseResult,
                allowed: false,
                reason: 'Invalid channel mode configuration',
                ruleApplied: 'config_error'
            };
    }
}

/**
 * Check if bot should respond to a message (convenience wrapper)
 * Simplified interface for message handlers
 * 
 * @param message - Discord message to check
 * @param config - Optional configuration overrides
 * @returns True if bot should process the message
 */
export function shouldProcessMessage(
    message: Message,
    config: Partial<ChannelConfig> = {}
): boolean {
    return checkChannelAccess(message, config).allowed;
}

/**
 * Get current channel configuration with resolved defaults
 * Useful for debugging and configuration validation
 * 
 * @param overrides - Configuration overrides
 * @returns Complete channel configuration
 */
export function getChannelConfig(overrides: Partial<ChannelConfig> = {}): ChannelConfig {
    return { ...DEFAULT_CHANNEL_CONFIG, ...overrides };
}

/**
 * Send informative message to user when access is denied
 * Provides helpful guidance without being intrusive
 * 
 * @param message - Original message that was denied
 * @param accessResult - Result from access check
 * @returns Promise that resolves when notification is sent
 */
export async function sendAccessDeniedMessage(
    message: Message,
    accessResult: AccessCheckResult
): Promise<void> {
    try {
        // Only send denial messages in channels (not DMs) to avoid spam
        if (!accessResult.isDM) {
            const botChannelMention = BOT_CONFIG.channelId ? `<#${BOT_CONFIG.channelId}>` : 'the designated bot channel';
            await message.reply(
                `🤖 I'm currently only responding in ${botChannelMention}. ` +
                `Please use that channel to interact with me!`
            );
        }
    } catch (error) {
        logger.warn('Failed to send access denied message', {
            channelId: accessResult.channelId,
            userId: accessResult.userId
        }, error as Error);
    }
}

/**
 * Validate channel configuration for startup checks
 * Ensures configuration is valid and channel IDs are properly formatted
 * 
 * @param config - Channel configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateChannelConfig(config: Partial<ChannelConfig> = {}): void {
    const fullConfig = { ...DEFAULT_CHANNEL_CONFIG, ...config };
    
    // Validate mode
    const validModes = ['whitelist', 'blacklist', 'disabled'];
    if (!validModes.includes(fullConfig.mode)) {
        throw new Error(`Invalid channel mode: ${fullConfig.mode}. Must be one of: ${validModes.join(', ')}`);
    }
    
    // Validate channel IDs (Discord snowflakes are 17-19 digits)
    const allChannelIds = [...fullConfig.allowedChannels, ...fullConfig.blockedChannels];
    for (const channelId of allChannelIds) {
        if (!/^\d{17,19}$/.test(channelId)) {
            throw new Error(`Invalid channel ID format: ${channelId}. Discord channel IDs should be 17-19 digits.`);
        }
    }
    
    // Validate configured bot channel exists
    if (fullConfig.mode === 'whitelist' && !BOT_CONFIG.channelId) {
        throw new Error('CHANNEL_ID environment variable is required for whitelist mode');
    }
    
    logger.debug('Channel configuration validated successfully', {
        mode: fullConfig.mode,
        allowedChannelsCount: fullConfig.allowedChannels.length,
        blockedChannelsCount: fullConfig.blockedChannels.length,
        allowDMs: fullConfig.allowDMs,
        operation: 'config_validation'
    });
}

// Export types for external use
export type { ChannelConfig, AccessCheckResult };