/**
 * @file Bot command handling service for owner utilities
 * Provides administrative commands for bot configuration and monitoring.
 * 
 * Features:
 * - Token optimization level adjustment
 * - Usage statistics and cost monitoring
 * - Bot health status checks
 * - Owner-only command validation
 * 
 * Architecture:
 * - Command pattern with clean separation
 * - Permission-based access control
 * - Comprehensive logging for admin actions
 */

import { Message } from 'discord.js';
import { setOptimizationLevel, getCurrentOptimizationConfig } from './tokenOptimizer';
import { BOT_CONFIG } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Available bot commands for owner administration
 */
const COMMANDS = {
    optimize: 'Set token optimization level (balanced|efficient|economy)',
    status: 'Show bot optimization status and configuration',
    help: 'Show available commands'
} as const;

/**
 * Handle bot commands from authorized users
 * Commands must start with !bot prefix and user must be bot owner
 * 
 * @param message - Discord message containing potential command
 * @returns True if message was a handled command, false otherwise
 */
export async function handleBotCommand(message: Message): Promise<boolean> {
    const content = message.content.trim();
    
    // Check if message is a bot command
    if (!content.startsWith('!bot ')) {
        return false;
    }
    
    // Verify user is bot owner
    if (message.author.id !== BOT_CONFIG.ownerId) {
        await message.reply('🔒 Only the bot owner can use administrative commands.');
        return true;
    }
    
    // Parse command and arguments
    const args = content.slice(5).trim().split(/\s+/);
    const command = args[0]?.toLowerCase();
    
    try {
        switch (command) {
            case 'optimize':
                await handleOptimizeCommand(message, args.slice(1));
                break;
                
            case 'status':
                await handleStatusCommand(message);
                break;
                
            case 'help':
                await handleHelpCommand(message);
                break;
                
            default:
                await message.reply(`❓ Unknown command: \`${command}\`. Use \`!bot help\` for available commands.`);
        }
        
        logger.info('Bot command executed', {
            command,
            userId: message.author.id,
            guildId: message.guild?.id,
            operation: 'bot_command'
        });
        
        return true;
        
    } catch (error) {
        logger.error('Error executing bot command', {
            command,
            userId: message.author.id
        }, error as Error);
        
        await message.reply('❌ Error executing command. Please try again.');
        return true;
    }
}

/**
 * Handle optimization level change command
 * Usage: !bot optimize [level]
 */
async function handleOptimizeCommand(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
        const current = getCurrentOptimizationConfig();
        await message.reply(
            `🎛️ **Current Optimization Settings:**\n` +
            `• Level: **${getOptimizationLevelName()}**\n` +
            `• Max Context Tokens: **${current.maxContextTokens}**\n` +
            `• Max Response Tokens: **${current.maxResponseTokens}**\n` +
            `• Personal Details Limit: **${current.personalDetailsLimit}**\n` +
            `• Recent Messages Limit: **${current.recentMessagesLimit}**\n\n` +
            `Use \`!bot optimize [level]\` to change (balanced|efficient|economy)`
        );
        return;
    }
    
    const level = args[0].toLowerCase();
    
    if (!['balanced', 'efficient', 'economy'].includes(level)) {
        await message.reply(
            '❌ Invalid optimization level. Available options:\n' +
            '• **balanced** - Good quality, moderate savings (20-30%)\n' +
            '• **efficient** - Significant savings, good quality (40-50%)\n' +
            '• **economy** - Maximum savings (60-70%)'
        );
        return;
    }
    
    setOptimizationLevel(level as any);
    
    const config = getCurrentOptimizationConfig();
    await message.reply(
        `✅ **Optimization level changed to: ${level}**\n\n` +
        `**New Settings:**\n` +
        `• Max Context Tokens: **${config.maxContextTokens}**\n` +
        `• Max Response Tokens: **${config.maxResponseTokens}**\n` +
        `• Personal Details: **${config.personalDetailsLimit}** max\n` +
        `• Recent Messages: **${config.recentMessagesLimit}** max\n\n` +
        `💡 Changes take effect immediately for new conversations!`
    );
}

/**
 * Handle status command - show current bot configuration
 * Usage: !bot status
 */
async function handleStatusCommand(message: Message): Promise<void> {
    const config = getCurrentOptimizationConfig();
    const level = getOptimizationLevelName();
    
    // Calculate estimated savings
    const savings = level === 'balanced' ? '20-30%' : 
                   level === 'efficient' ? '40-50%' : '60-70%';
    
    await message.reply(
        `📊 **Bot Status & Configuration**\n\n` +
        `**Token Optimization:**\n` +
        `• Level: **${level}** (${savings} cost reduction)\n` +
        `• Context Budget: **${config.maxContextTokens}** tokens\n` +
        `• Response Limit: **${config.maxResponseTokens}** tokens\n\n` +
        `**Memory Management:**\n` +
        `• Personal Details: **${config.personalDetailsLimit}** max\n` +
        `• Recent Messages: **${config.recentMessagesLimit}** max\n` +
        `• Emotional Context: **${config.includeEmotionalContext ? 'Enabled' : 'Disabled'}**\n\n` +
        `**Performance:**\n` +
        `• Compression: **${config.compressionLevel}**\n` +
        `• Prioritize Recent: **${config.prioritizeRecent ? 'Yes' : 'No'}**\n\n` +
        `🎯 Albedo personality preserved with maximum cost efficiency!`
    );
}

/**
 * Handle help command - show available commands
 * Usage: !bot help
 */
async function handleHelpCommand(message: Message): Promise<void> {
    const commandList = Object.entries(COMMANDS)
        .map(([cmd, desc]) => `• \`!bot ${cmd}\` - ${desc}`)
        .join('\n');
    
    await message.reply(
        `🤖 **Bot Administrative Commands**\n\n` +
        `${commandList}\n\n` +
        `**Optimization Levels:**\n` +
        `• **balanced** - Best quality/cost balance (default)\n` +
        `• **efficient** - Significant cost savings\n` +
        `• **economy** - Maximum cost reduction\n\n` +
        `💡 Commands are only available to the bot owner.`
    );
}

/**
 * Get human-readable optimization level name
 */
function getOptimizationLevelName(): string {
    const config = getCurrentOptimizationConfig();
    
    if (config.maxContextTokens <= 600) return 'economy';
    if (config.maxContextTokens <= 1000) return 'efficient';
    return 'balanced';
}