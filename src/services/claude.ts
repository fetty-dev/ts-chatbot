// Anthropic Claude API client
import Anthropic from '@anthropic-ai/sdk';
import type { UserMemory } from '../types';
import { CLAUDE_CONFIG } from '../utils/constants';
import { estimateTokens } from '../utils/validation';
import { buildAlbedoContext } from './personality';

/**
 * Anthropic Claude API client service
 * Handles message generation with personality and context integration
 */

// initialize the anthropic client
const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Generate response from Claude using Albedo personality and user context
 * @param userMessage - The user's Discord message
 * @param userMemory - User's stored memory and relationship data
 * @returns Object with Claude's response and token usage
 */
export async function generateClaudeResponse(userMessage: string, userMemory?: UserMemory): Promise<{ response: string; tokens: number }> {
    try {
        // build albedo's personality context
        const personalityContext = buildAlbedoContext(userMemory);
        // create message for claude api
        const messages: Anthropic.MessageParam[] = [
            {
                role: 'user',
                content: `${personalityContext}\n\nUser message: ${userMessage}`
            }
        ];
        // call claude api
        const response = await client.messages.create({
            model: CLAUDE_CONFIG.model,
            max_tokens: CLAUDE_CONFIG.maxTokens,
            temperature: CLAUDE_CONFIG.temperature,
            messages
        });
        // validate and extract response
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
        }
        const responseText = content.text;
        const tokenUsage = estimateTokens(userMessage + responseText);
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
 * @returns True if API is accessible
 */
export async function testClaudeConnection(): Promise<boolean> {
    try {
        await client.messages.create({
            model: CLAUDE_CONFIG.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello' }]
        });
        return true;
    } catch {
        return false;
    }
}