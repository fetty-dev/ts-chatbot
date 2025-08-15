/**
 * @file Discord client configuration and event management
 * Centralizes Discord.js client setup, event registration, and lifecycle management.
 * 
 * Features:
 * - Optimized intent configuration for bot needs
 * - Centralized event handler registration
 * - Comprehensive startup validation
 * - Graceful shutdown handling
 * - Error boundaries for event handling
 * - Health monitoring and status tracking
 */

import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js';
import { handleMessageCreate } from './events/messageCreate';
import { logger } from '../utils/logger';
import { BOT_CONFIG } from '../utils/constants';

/**
 * Bot status tracking for health monitoring
 */
interface BotStatus {
    isReady: boolean;
    startTime: Date | null;
    lastError: Date | null;
    totalErrors: number;
}

/**
 * Discord client wrapper with enhanced error handling and monitoring
 * Implements singleton pattern for global client access
 */
class DiscordBotClient {
    private client: Client;
    private status: BotStatus;
    
    constructor() {
        this.status = {
            isReady: false,
            startTime: null,
            lastError: null,
            totalErrors: 0
        };
        
        // Initialize client with minimal required intents for performance
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,          // Access to guild information
                GatewayIntentBits.GuildMessages,   // Receive message events
                GatewayIntentBits.MessageContent,  // Read message content (privileged)
                GatewayIntentBits.GuildMembers,    // Access member information
                GatewayIntentBits.GuildPresences   // User presence for relationship context
            ],
            // Optimize for bot usage patterns
            rest: {
                timeout: 15000,    // 15 second timeout for API calls
                retries: 3         // Retry failed requests
            }
        });
        
        this.setupEventHandlers();
    }
    
    /**
     * Configure all Discord event handlers with error boundaries
     * Each handler is wrapped to prevent crashes from propagating
     */
    private setupEventHandlers(): void {
        // Bot ready event - startup completion
        this.client.on(Events.ClientReady, this.handleReady.bind(this));
        
        // Message events - core bot functionality  
        this.client.on(Events.MessageCreate, this.handleMessageWithErrorBoundary.bind(this));
        
        // Error handling events
        this.client.on(Events.Error, this.handleError.bind(this));
        this.client.on(Events.Warn, this.handleWarning.bind(this));
        
        // Connection events for monitoring  
        this.client.on('disconnect' as any, this.handleDisconnect.bind(this));
        this.client.on('reconnecting' as any, this.handleReconnecting.bind(this));
        
        // Graceful shutdown handling
        process.on('SIGINT', this.handleShutdown.bind(this));
        process.on('SIGTERM', this.handleShutdown.bind(this));
        
        logger.debug('Discord event handlers configured');
    }
    
    /**
     * Handle bot ready event - set status and log startup completion
     */
    private async handleReady(client: Client<true>): Promise<void> {
        this.status.isReady = true;
        this.status.startTime = new Date();
        
        logger.info('Discord bot connected successfully', {
            botUsername: client.user.username,
            botId: client.user.id,
            guildCount: client.guilds.cache.size,
            operation: 'startup'
        });
        
        // Set bot activity status
        await this.setPresence(client);
        
        // Log bot capabilities
        this.logBotCapabilities(client);
    }
    
    /**
     * Set bot presence/activity status
     */
    private async setPresence(client: Client<true>): Promise<void> {
        try {
            client.user.setActivity('with Claude AI 🤖', {
                type: ActivityType.Playing
            });
            
            logger.debug('Bot presence set successfully');
        } catch (error) {
            logger.warn('Failed to set bot presence', {}, error as Error);
        }
    }
    
    /**
     * Log bot capabilities and configuration for debugging
     */
    private logBotCapabilities(client: Client<true>): void {
        const guildInfo = Array.from(client.guilds.cache.values()).map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount
        }));
        
        logger.info('Bot capabilities initialized', {
            guilds: guildInfo,
            intents: Object.keys(GatewayIntentBits).filter(intent => 
                client.options.intents!.has(GatewayIntentBits[intent as keyof typeof GatewayIntentBits])
            ),
            isOwnerConfigured: Boolean(BOT_CONFIG.ownerId),
            operation: 'capabilities'
        });
    }
    
    /**
     * Message handler with error boundary to prevent crashes
     * Wraps the main message handler with comprehensive error catching
     */
    private async handleMessageWithErrorBoundary(message: any): Promise<void> {
        try {
            await handleMessageCreate(message);
        } catch (error) {
            this.recordError();
            logger.error('Unhandled error in message processing', {
                messageId: message.id,
                userId: message.author?.id,
                guildId: message.guild?.id
            }, error as Error);
            
            // Attempt to notify user of error (non-blocking)
            try {
                await message.reply('❌ An unexpected error occurred. The issue has been logged.');
            } catch (replyError) {
                logger.error('Failed to send error notification to user', {
                    messageId: message.id
                }, replyError as Error);
            }
        }
    }
    
    /**
     * Handle Discord client errors
     */
    private handleError(error: Error): void {
        this.recordError();
        logger.error('Discord client error', {
            operation: 'discord_client'
        }, error);
    }
    
    /**
     * Handle Discord client warnings
     */
    private handleWarning(warning: string): void {
        logger.warn('Discord client warning', {
            warning,
            operation: 'discord_client'
        });
    }
    
    /**
     * Handle disconnect events
     */
    private handleDisconnect(): void {
        this.status.isReady = false;
        logger.warn('Discord client disconnected', {
            operation: 'disconnect'
        });
    }
    
    /**
     * Handle reconnection attempts
     */
    private handleReconnecting(): void {
        logger.info('Discord client attempting to reconnect', {
            operation: 'reconnect'
        });
    }
    
    /**
     * Record error in status tracking
     */
    private recordError(): void {
        this.status.lastError = new Date();
        this.status.totalErrors++;
    }
    
    /**
     * Start the Discord bot with comprehensive error handling
     */
    async login(token: string): Promise<void> {
        if (!token) {
            throw new Error('Discord bot token is required');
        }
        
        try {
            logger.info('Starting Discord bot login process');
            await this.client.login(token);
            logger.info('Discord bot login successful');
        } catch (error) {
            logger.error('Discord bot login failed', {
                operation: 'login'
            }, error as Error);
            throw error;
        }
    }
    
    /**
     * Graceful shutdown with cleanup
     */
    private async handleShutdown(signal: string): Promise<void> {
        logger.info(`Received ${signal}, shutting down gracefully`);
        
        try {
            if (this.client) {
                await this.client.destroy();
                logger.info('Discord client disconnected cleanly');
            }
        } catch (error) {
            logger.error('Error during shutdown', {}, error as Error);
        }
        
        process.exit(0);
    }
    
    /**
     * Get bot health status for monitoring
     */
    getStatus(): BotStatus {
        return { ...this.status };
    }
    
    /**
     * Get Discord client instance (for advanced usage)
     */
    getClient(): Client {
        return this.client;
    }
}

// Export singleton instance
export const discordBot = new DiscordBotClient();

// Export types for external use
export type { BotStatus };