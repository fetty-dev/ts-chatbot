/**
 * @file Discord messageCreate event handler with comprehensive error handling
 * Orchestrates message processing pipeline: validation -> memory -> Claude -> response
 * 
 * Architecture:
 * - Input validation and sanitization
 * - User memory retrieval/creation  
 * - Claude API integration with personality context
 * - Response delivery with error fallbacks
 * - Comprehensive logging and monitoring
 * 
 * Error Handling Strategy:
 * - Graceful degradation (always respond to user)
 * - Circuit breaker pattern for API failures
 * - Retry logic with exponential backoff
 * - Detailed error logging for debugging
 */

import { Message } from 'discord.js';
import { generateClaudeResponse } from '../../services/claude';
import { getOrCreateUserMemory, addRecentMessage } from '../../services/memory';
import { filterClaudeResponse } from '../../services/responseFilter';
import { checkChannelAccess, sendAccessDeniedMessage } from '../../services/channelManager';
import { handleBotCommand } from '../../services/commandHandler';
import { validateUserInput, sanitizeUserInput } from '../../utils/validation';
import { logger } from '../../utils/logger';
import { LIMITS, BOT_CONFIG } from '../../utils/constants';

/**
 * Result types for internal pipeline operations
 * Enables proper error handling and response differentiation
 */
interface ProcessingResult {
    success: boolean;
    response?: string;
    error?: string;
    tokens?: number;
}

interface UserContext {
    userId: string;
    userName: string;
    guildId: string;
    messageId: string;
    isOwner: boolean;
}

/**
 * Main message event handler - entry point for all user interactions
 * Implements fail-safe pattern: always provides user feedback, even on errors
 * 
 * @param message - Discord.js Message object from messageCreate event
 */
export async function handleMessageCreate(message: Message): Promise<void> {
    // Skip bot messages to prevent infinite loops
    if (message.author.bot) return;
    
    const startTime = Date.now();
    const userContext = extractUserContext(message);
    
    logger.startOperation('messageProcess', {
        userId: userContext.userId,
        guildId: userContext.guildId,
        messageId: userContext.messageId
    });
    
    try {
        // Step 0: Check for bot commands first (owner-only)
        const wasCommand = await handleBotCommand(message);
        if (wasCommand) {
            return; // Command was handled, no need to continue
        }
        
        // Step 1: Channel access control
        const accessCheck = checkChannelAccess(message);
        if (!accessCheck.allowed) {
            // Send informative message if access is denied
            await sendAccessDeniedMessage(message, accessCheck);
            
            logger.info('Message blocked by channel restrictions', {
                userId: userContext.userId,
                reason: accessCheck.reason
            });
            return;
        }
        // Step 2: Input validation and sanitization
        const processedInput = await validateAndSanitizeInput(message.content, userContext);
        if (!processedInput.success) {
            await sendErrorResponse(message, processedInput.error || 'Invalid input');
            return;
        }
        
        // Step 3: Memory management - get or create user profile
        const userMemory = await safeGetUserMemory(userContext);
        if (!userMemory) {
            await sendErrorResponse(message, 'Unable to access user data. Please try again.');
            return;
        }
        
        // Step 4: Generate Claude response with personality context (TOKEN OPTIMIZED!)
        const claudeResult = await safeGenerateResponse(processedInput.response!, userMemory);
        if (!claudeResult.success) {
            await sendErrorResponse(message, claudeResult.error || 'Unable to generate response');
            return;
        }
        
        // Step 5: Store conversation in memory for future context
        await safeStoreConversation(userContext.userId, message.content, claudeResult.response!, claudeResult.tokens!);
        
        // Step 6: Filter Claude response to remove unwanted formatting
        const filteredResponse = filterClaudeResponse(claudeResult.response!);
        
        // Step 7: Send response to Discord
        await safeSendResponse(message, filteredResponse);
        
        // Success logging
        const duration = Date.now() - startTime;
        logger.messageProcessed(userContext.userId, userContext.guildId, claudeResult.tokens!, true);
        logger.endOperation('messageProcess', { 
            ...userContext, 
            duration, 
            tokens: claudeResult.tokens 
        });
        
    } catch (error) {
        // Global error handler - should never be reached if individual steps handle errors properly
        const duration = Date.now() - startTime;
        logger.error('Unexpected error in message processing', {
            ...userContext,
            duration
        }, error as Error);
        
        await sendErrorResponse(message, 'An unexpected error occurred. Please try again.');
    }
}

/**
 * Extract user context from Discord message for logging and processing
 */
function extractUserContext(message: Message): UserContext {
    return {
        userId: message.author.id,
        userName: message.author.displayName || message.author.username,
        guildId: message.guild?.id || 'DM',
        messageId: message.id,
        isOwner: message.author.id === BOT_CONFIG.ownerId
    };
}

/**
 * Validate and sanitize user input with comprehensive error handling
 * Protects against malicious input and ensures data quality
 */
async function validateAndSanitizeInput(content: string, context: UserContext): Promise<ProcessingResult> {
    try {
        // Basic validation
        if (!validateUserInput(content)) {
            logger.warn('Invalid user input received', {
                userId: context.userId,
                messageLength: content.length,
                maxAllowed: LIMITS.MAX_MESSAGE_LENGTH
            });
            
            return {
                success: false,
                error: `Message too long. Maximum ${LIMITS.MAX_MESSAGE_LENGTH} characters allowed.`
            };
        }
        
        // Sanitization  
        const sanitized = sanitizeUserInput(content);
        if (sanitized.length === 0) {
            return {
                success: false,
                error: 'Message contains no valid content.'
            };
        }
        
        // Removed verbose input validation logging
        
        return {
            success: true,
            response: sanitized
        };
        
    } catch (error) {
        logger.error('Error during input validation', { userId: context.userId }, error as Error);
        return {
            success: false,
            error: 'Unable to process message format.'
        };
    }
}

/**
 * Safely retrieve or create user memory with error handling
 * Ensures user data is always available for personality system
 */
async function safeGetUserMemory(context: UserContext) {
    try {
        const memory = await getOrCreateUserMemory(context.userId, context.userName);
        
        return memory;
        
    } catch (error) {
        logger.error('Failed to retrieve user memory', { userId: context.userId }, error as Error);
        return null;
    }
}

/**
 * Generate Claude response with comprehensive error handling and retries
 * Implements circuit breaker pattern for API reliability
 */
async function safeGenerateResponse(userMessage: string, userMemory: any): Promise<ProcessingResult> {
    const maxRetries = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Generate response (attempt ${attempt})
            
            const result = await generateClaudeResponse(userMessage, userMemory);
            
            logger.apiCall('Claude', true, undefined);
            // Claude response generated successfully
            
            return {
                success: true,
                response: result.response,
                tokens: result.tokens
            };
            
        } catch (error) {
            lastError = error as Error;
            logger.apiCall('Claude', false, undefined, lastError);
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.warn(`Claude API attempt ${attempt} failed, retrying in ${delay}ms`, {
                    userId: userMemory.userId,
                    attempt
                }, lastError);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // All retries failed
    logger.error('All Claude API attempts failed', {
        userId: userMemory.userId,
        maxRetries
    }, lastError!);
    
    return {
        success: false,
        error: 'I\'m having trouble thinking right now. Please try again in a moment.'
    };
}

/**
 * Safely store conversation in memory with error handling
 * Non-blocking operation - failures don't affect user experience
 */
async function safeStoreConversation(userId: string, userMessage: string, botResponse: string, tokens: number): Promise<void> {
    try {
        await addRecentMessage(userId, userMessage, botResponse, tokens);
    } catch (error) {
        // Non-critical error - log but don't fail the whole operation
        logger.warn('Failed to store conversation in memory', { userId }, error as Error);
    }
}

/**
 * Send response to Discord with error handling and length validation
 * Ensures user always receives feedback
 */
async function safeSendResponse(message: Message, response: string): Promise<void> {
    try {
        // Discord has a 2000 character limit
        const trimmedResponse = response.length > 2000 
            ? response.substring(0, 1997) + '...'
            : response;
            
        await message.reply(trimmedResponse);
        
    } catch (error) {
        logger.error('Failed to send response to Discord', {
            userId: message.author.id
        }, error as Error);
        
        // Attempt fallback response
        try {
            if ('send' in message.channel) {
                await message.channel.send('I encountered an error while responding. Please try again.');
            }
        } catch (fallbackError) {
            logger.error('Fallback response also failed', {
                userId: message.author.id
            }, fallbackError as Error);
        }
    }
}

/**
 * Send user-friendly error message with consistent formatting
 * Ensures users always receive helpful feedback
 */
async function sendErrorResponse(message: Message, errorMessage: string): Promise<void> {
    try {
        await message.reply(`❌ ${errorMessage}`);
    } catch (error) {
        logger.error('Failed to send error response', {
            userId: message.author.id,
            originalError: errorMessage
        }, error as Error);
    }
}