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

// Initialize the anthropic client with API key from environment
const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY    // Requires ANTHROPIC_API_KEY environment variable
});

/**
 * Generate contextual response from Claude using Albedo personality system
 * Combines user message with personality context and relationship history
 * Estimates token usage for conversation tracking and daily limits
 * 
 * @param userMessage - The user's Discord message (raw input)
 * @param userMemory - Optional user memory for relationship context and personalization
 * @returns Object containing Claude's response text and estimated token usage
 * @throws {Error} if API request fails or response format is unexpected
 */
export async function generateClaudeResponse(userMessage: string, userMemory?: UserMemory): Promise<{ response: string; tokens: number }> {
    try {
        // Build Albedo's personality context with user relationship data
        const personalityContext = buildAlbedoContext(userMemory);
        
        // Create message array for Claude API (personality context + user input)
        const messages: Anthropic.MessageParam[] = [
            {
                role: 'user',
                content: `${personalityContext}\n\nUser message: ${userMessage}`
            }
        ];
        
        // Call Claude API with configured model parameters
        const response = await client.messages.create({
            model: CLAUDE_CONFIG.model,              // claude-sonnet-4-20250514
            max_tokens: CLAUDE_CONFIG.maxTokens,     // 1000 token limit per response
            temperature: CLAUDE_CONFIG.temperature,  // 0.7 for balanced creativity/consistency
            messages
        });
        
        // Validate and extract text response (API returns union type)
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
        }
        
        const responseText = content.text;
        const tokenUsage = estimateTokens(userMessage + responseText); // Combined input+output estimation
        
        return {
            response: responseText,
            tokens: tokenUsage
        };
    } catch (error) {
        console.error('Claude API error:', error);
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