/**
 * @file Anthropic Claude API client service
 * Handles message generation with personality system integration and usage tracking.
 * Exposes:
 * - generateClaudeResponse(): main API call with Albedo personality context
 * - testClaudeConnection(): health check for API connectivity
 * Uses claude-sonnet-4-20250514 model with 0.7 temperature for balanced responses.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { UserMemory } from '../types';
import { CLAUDE_CONFIG } from '../utils/constants';
import { estimateTokens } from '../utils/validation';
import { buildAlbedoContext } from './personality';
import { optimizeMemoryContext, calculateTokenAnalytics, getOptimizedClaudeConfig } from './tokenOptimizer';
import { logger } from '../utils/logger';

// Initialize the anthropic client with API key from environment
const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY    // Requires ANTHROPIC_API_KEY environment variable
});

/**
 * Generate token-optimized response from Claude using efficient context management
 * Applies intelligent context optimization to reduce costs while maintaining quality
 * Provides detailed token analytics for cost monitoring
 * 
 * @param userMessage - The user's Discord message (raw input)
 * @param userMemory - Optional user memory for relationship context and personalization
 * @param optimized - Whether to use token optimization (default: true)
 * @returns Object containing Claude's response, token usage, and cost analytics
 * @throws {Error} if API request fails or response format is unexpected
 */
export async function generateClaudeResponse(
    userMessage: string, 
    userMemory?: UserMemory, 
    optimized: boolean = true
): Promise<{ response: string; tokens: number; analytics?: any }> {
    try {
        let fullContext: string;
        let originalContext: string | undefined;
        
        if (optimized && userMemory) {
            // Build optimized context with intelligent token management
            const personalityContext = buildAlbedoContext(userMemory, true);
            const memoryContext = optimizeMemoryContext(userMemory, userMessage);
            fullContext = `${personalityContext}\n\n${memoryContext}\n\nUser: ${userMessage}`;
            
            // Keep original for comparison
            originalContext = buildAlbedoContext(userMemory, false) + `\n\nUser: ${userMessage}`;
        } else {
            // Use standard context building
            const personalityContext = buildAlbedoContext(userMemory, false);
            fullContext = `${personalityContext}\n\nUser message: ${userMessage}`;
        }
        
        // Create optimized message array
        const messages: Anthropic.MessageParam[] = [
            {
                role: 'user',
                content: fullContext
            }
        ];
        
        // Get optimized Claude configuration
        const claudeConfig = optimized ? getOptimizedClaudeConfig() : CLAUDE_CONFIG;
        
        // Call Claude API with optimized parameters
        const response = await client.messages.create({
            model: claudeConfig.model,
            max_tokens: claudeConfig.maxTokens,
            temperature: claudeConfig.temperature,
            messages
        });
        
        // Validate and extract text response
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
        }
        
        const responseText = content.text;
        
        // Calculate comprehensive token analytics
        const analytics = calculateTokenAnalytics(fullContext, responseText, originalContext);
        
        // Log cost-efficiency metrics
        if (optimized) {
            logger.info('Optimized Claude response generated', {
                inputTokens: analytics.inputTokens,
                outputTokens: analytics.outputTokens,
                totalTokens: analytics.totalTokens,
                estimatedCost: analytics.estimatedCost,
                contextReduction: Math.round(analytics.contextReduction * 100),
                qualityScore: Math.round(analytics.qualityScore * 100),
                operation: 'claude_optimized_response'
            });
        }
        
        return {
            response: responseText,
            tokens: analytics.totalTokens,
            analytics: optimized ? analytics : undefined
        };
    } catch (error) {
        logger.error('Claude API error', {}, error as Error);
        throw new Error(`Failed to generate Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Test Claude API connection and authentication
 * Makes minimal API call to verify connectivity and API key validity
 * Used for health checks and startup validation
 * 
 * @returns True if API is accessible and authentication succeeds, false otherwise
 */
export async function testClaudeConnection(): Promise<boolean> {
    try {
        await client.messages.create({
            model: CLAUDE_CONFIG.model,          // Use same model as main service
            max_tokens: 10,                      // Minimal token usage for test
            messages: [{ role: 'user', content: 'Hello' }]  // Simple test message
        });
        return true;
    } catch {
        return false;                            // Catch any API errors (auth, network, etc.)
    }
}