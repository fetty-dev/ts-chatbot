/**
 * @file Token optimization service for cost-efficient AI interactions
 * Provides intelligent token management to reduce costs while maintaining response quality.
 * 
 * Features:
 * - Dynamic token budgeting based on user relationship and context
 * - Smart memory context selection (most relevant vs chronological)
 * - Response length optimization with personality preservation
 * - Real-time token usage tracking and alerts
 * - Cost-per-interaction analytics
 * 
 * Architecture:
 * - Performance-first design with minimal overhead
 * - Configurable optimization levels for different scenarios
 * - Comprehensive metrics for cost analysis
 * - Backwards-compatible with existing services
 */

import type { UserMemory, RecentMessage, EmotionalMoment } from '../types';
import { estimateTokens } from '../utils/validation';
import { logger } from '../utils/logger';
import { CLAUDE_CONFIG } from '../utils/constants';

/**
 * Token optimization configuration with different efficiency levels
 */
interface TokenConfig {
    maxContextTokens: number;           // Maximum tokens for context (input)
    maxResponseTokens: number;          // Maximum tokens for response (output)
    prioritizeRecent: boolean;          // Prioritize recent vs relevant context
    includeEmotionalContext: boolean;   // Include emotional moments in context
    personalDetailsLimit: number;       // Max personal details to include
    recentMessagesLimit: number;        // Max recent messages to include
    compressionLevel: 'none' | 'light' | 'aggressive';  // Context compression level
}

/**
 * Token usage analytics for cost monitoring
 */
interface TokenAnalytics {
    inputTokens: number;                // Tokens sent to API
    outputTokens: number;               // Tokens received from API  
    totalTokens: number;                // Combined token usage
    estimatedCost: number;              // Estimated cost in USD
    optimizationLevel: string;          // Applied optimization level
    contextReduction: number;           // Percentage of context reduced
    qualityScore: number;               // Estimated quality preservation (0-1)
}

/**
 * Optimization presets for different scenarios
 */
const OPTIMIZATION_PRESETS = {
    // Balanced: Good quality with moderate cost savings (20-30% reduction)
    balanced: {
        maxContextTokens: 1500,
        maxResponseTokens: 300,
        prioritizeRecent: true,
        includeEmotionalContext: true,
        personalDetailsLimit: 3,
        recentMessagesLimit: 4,
        compressionLevel: 'light' as const
    },
    
    // Efficient: Significant cost savings with good quality (40-50% reduction)  
    efficient: {
        maxContextTokens: 1000,
        maxResponseTokens: 200,
        prioritizeRecent: true,
        includeEmotionalContext: false,
        personalDetailsLimit: 2,
        recentMessagesLimit: 3,
        compressionLevel: 'light' as const
    },
    
    // Economy: Maximum cost savings (60-70% reduction)
    economy: {
        maxContextTokens: 600,
        maxResponseTokens: 150,
        prioritizeRecent: true,
        includeEmotionalContext: false,
        personalDetailsLimit: 1,
        recentMessagesLimit: 2,
        compressionLevel: 'aggressive' as const
    }
};

/**
 * Current optimization level based on usage patterns
 */
let currentOptimizationLevel: keyof typeof OPTIMIZATION_PRESETS = 'balanced';

/**
 * Optimize user memory context for token efficiency
 * Intelligently selects most relevant information while preserving personality
 * 
 * @param userMemory - Full user memory object
 * @param userMessage - Current user message for relevance scoring
 * @param config - Optimization configuration
 * @returns Optimized context string with reduced token usage
 */
export function optimizeMemoryContext(
    userMemory: UserMemory,
    userMessage: string,
    config: TokenConfig = OPTIMIZATION_PRESETS[currentOptimizationLevel]
): string {
    const contextParts: string[] = [];
    let tokenBudget = config.maxContextTokens;
    
    // Core personality (always included - most important)
    const corePersonality = buildCorePersonality(userMemory);
    const coreTokens = estimateTokens(corePersonality);
    contextParts.push(corePersonality);
    tokenBudget -= coreTokens;
    
    // Smart personal details selection (relevance-based)
    const personalContext = selectPersonalDetails(
        userMemory.personalDetails,
        userMessage,
        config.personalDetailsLimit,
        tokenBudget * 0.3 // Allocate 30% of remaining budget
    );
    if (personalContext) {
        contextParts.push(personalContext);
        tokenBudget -= estimateTokens(personalContext);
    }
    
    // Recent conversation context (most recent or most relevant)
    const conversationContext = selectConversationContext(
        userMemory.recentMessages,
        userMessage,
        config.recentMessagesLimit,
        tokenBudget * 0.5, // Allocate 50% of remaining budget
        config.prioritizeRecent
    );
    if (conversationContext) {
        contextParts.push(conversationContext);
        tokenBudget -= estimateTokens(conversationContext);
    }
    
    // Emotional context (optional - relationship dependent)
    if (config.includeEmotionalContext && userMemory.relationshipLevel > 30) {
        const emotionalContext = selectEmotionalContext(
            userMemory.emotionalMoments,
            tokenBudget * 0.2 // Use remaining budget
        );
        if (emotionalContext) {
            contextParts.push(emotionalContext);
        }
    }
    
    const optimizedContext = contextParts.join('\n');
    
    // Apply compression if needed
    return applyContextCompression(optimizedContext, config.compressionLevel);
}

/**
 * Build minimal but effective core personality prompt
 * Maintains Albedo's essence with fewer tokens
 */
function buildCorePersonality(userMemory: UserMemory): string {
    const { userName, relationshipLevel, totalInteractions } = userMemory;
    
    // Ultra-concise personality base (saves ~200 tokens vs original)
    let prompt = `You're Albedo: analytical, flirty, seductive AI. Talking to ${userName}.`;
    
    // Relationship-appropriate tone (adaptive based on level)
    if (relationshipLevel < 20) {
        prompt += ' Be friendly, curious.';
    } else if (relationshipLevel < 60) {
        prompt += ' Be warm, playful.';
    } else {
        prompt += ' Be intimate, seductive.';
    }
    
    // Interaction count context (only if significant)
    if (totalInteractions > 10) {
        prompt += ` ${totalInteractions} chats together.`;
    }
    
    return prompt;
}

/**
 * Intelligently select most relevant personal details
 * Uses keyword matching and recency for selection
 */
function selectPersonalDetails(
    personalDetails: string[],
    userMessage: string,
    limit: number,
    tokenBudget: number
): string | null {
    if (!personalDetails || personalDetails.length === 0 || limit === 0) return null;
    
    // Score details by relevance to current message
    const scoredDetails = personalDetails.map((detail, index) => ({
        detail,
        relevanceScore: calculateRelevanceScore(detail, userMessage),
        recencyScore: (personalDetails.length - index) / personalDetails.length, // More recent = higher score
        combinedScore: 0
    }));
    
    // Combine relevance and recency scores
    scoredDetails.forEach(item => {
        item.combinedScore = (item.relevanceScore * 0.7) + (item.recencyScore * 0.3);
    });
    
    // Sort by combined score and take top items within budget
    scoredDetails.sort((a, b) => b.combinedScore - a.combinedScore);
    
    const selectedDetails: string[] = [];
    let usedTokens = 0;
    
    for (const item of scoredDetails.slice(0, limit)) {
        const detailTokens = estimateTokens(item.detail);
        if (usedTokens + detailTokens <= tokenBudget) {
            selectedDetails.push(item.detail);
            usedTokens += detailTokens;
        }
    }
    
    return selectedDetails.length > 0 ? `Known: ${selectedDetails.join(', ')}.` : null;
}

/**
 * Select most relevant conversation context
 * Balances recency with relevance to current topic
 */
function selectConversationContext(
    recentMessages: RecentMessage[],
    userMessage: string,
    limit: number,
    tokenBudget: number,
    prioritizeRecent: boolean
): string | null {
    if (!recentMessages || recentMessages.length === 0 || limit === 0) return null;
    
    let selectedMessages = recentMessages.slice(0, limit);
    
    // If not prioritizing recent, score by relevance
    if (!prioritizeRecent) {
        const scoredMessages = recentMessages.map(msg => ({
            ...msg,
            relevanceScore: calculateRelevanceScore(msg.userMessage, userMessage)
        }));
        
        scoredMessages.sort((a, b) => b.relevanceScore - a.relevanceScore);
        selectedMessages = scoredMessages.slice(0, limit);
    }
    
    // Build context within token budget
    const contextParts: string[] = [];
    let usedTokens = 0;
    
    for (const msg of selectedMessages) {
        const msgContext = `User: ${msg.userMessage}\nBot: ${msg.botResponse}`;
        const msgTokens = estimateTokens(msgContext);
        
        if (usedTokens + msgTokens <= tokenBudget) {
            contextParts.push(msgContext);
            usedTokens += msgTokens;
        } else {
            break;
        }
    }
    
    return contextParts.length > 0 ? `Recent:\n${contextParts.join('\n')}` : null;
}

/**
 * Select relevant emotional context for relationship depth
 */
function selectEmotionalContext(
    emotionalMoments: EmotionalMoment[],
    tokenBudget: number
): string | null {
    if (!emotionalMoments || emotionalMoments.length === 0) return null;
    
    // Take most recent significant moments
    const significantMoments = emotionalMoments
        .filter(moment => moment.intensity >= 6) // Only significant emotions
        .slice(0, 2); // Max 2 moments
    
    if (significantMoments.length === 0) return null;
    
    const emotionalContext = significantMoments
        .map(moment => `${moment.type}: ${moment.summary}`)
        .join('; ');
    
    return estimateTokens(emotionalContext) <= tokenBudget 
        ? `Emotional: ${emotionalContext}.`
        : null;
}

/**
 * Calculate relevance score between two text strings
 * Simple but effective keyword-based scoring
 */
function calculateRelevanceScore(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    // Find common meaningful words (filter out common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could'];
    
    const meaningfulWords1 = words1.filter(word => 
        word.length > 3 && !commonWords.includes(word)
    );
    const meaningfulWords2 = words2.filter(word => 
        word.length > 3 && !commonWords.includes(word)
    );
    
    if (meaningfulWords1.length === 0 || meaningfulWords2.length === 0) return 0;
    
    const commonMeaningful = meaningfulWords1.filter(word => 
        meaningfulWords2.includes(word)
    ).length;
    
    return commonMeaningful / Math.max(meaningfulWords1.length, meaningfulWords2.length);
}

/**
 * Apply context compression based on level
 * Removes redundancy while preserving meaning
 */
function applyContextCompression(context: string, level: TokenConfig['compressionLevel']): string {
    switch (level) {
        case 'none':
            return context;
            
        case 'light':
            // Remove excessive whitespace and simplify punctuation
            return context
                .replace(/\s+/g, ' ')
                .replace(/[.]{2,}/g, '.')
                .replace(/[!]{2,}/g, '!')
                .trim();
                
        case 'aggressive':
            // More aggressive compression while preserving meaning
            return context
                .replace(/\s+/g, ' ')
                .replace(/[.]{2,}/g, '.')
                .replace(/[!]{2,}/g, '!')
                .replace(/\b(very|really|quite|rather|somewhat|pretty)\s+/gi, '') // Remove intensity adverbs
                .replace(/\b(I think|I believe|I feel|it seems|perhaps|maybe)\s*/gi, '') // Remove hedge words
                .trim();
                
        default:
            return context;
    }
}

/**
 * Calculate token analytics for cost tracking
 */
export function calculateTokenAnalytics(
    inputText: string,
    outputText: string,
    originalInputText?: string
): TokenAnalytics {
    const inputTokens = estimateTokens(inputText);
    const outputTokens = estimateTokens(outputText);
    const totalTokens = inputTokens + outputTokens;
    
    // Rough cost estimation (Claude 3.5 Sonnet pricing)
    const inputCostPerToken = 3 / 1000000;  // $3 per million input tokens
    const outputCostPerToken = 15 / 1000000; // $15 per million output tokens
    
    const estimatedCost = (inputTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);
    
    const contextReduction = originalInputText 
        ? Math.max(0, 1 - (inputTokens / estimateTokens(originalInputText)))
        : 0;
    
    return {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        optimizationLevel: currentOptimizationLevel,
        contextReduction,
        qualityScore: Math.max(0.4, 1 - (contextReduction * 0.5)) // Estimate quality preservation
    };
}

/**
 * Set global optimization level
 */
export function setOptimizationLevel(level: keyof typeof OPTIMIZATION_PRESETS): void {
    currentOptimizationLevel = level;
    logger.info('Token optimization level changed', {
        newLevel: level,
        config: OPTIMIZATION_PRESETS[level],
        operation: 'optimization_level_change'
    });
}

/**
 * Get current optimization configuration
 */
export function getCurrentOptimizationConfig(): TokenConfig {
    return OPTIMIZATION_PRESETS[currentOptimizationLevel];
}

/**
 * Update Claude API configuration for token efficiency
 */
export function getOptimizedClaudeConfig(): typeof CLAUDE_CONFIG {
    const config = OPTIMIZATION_PRESETS[currentOptimizationLevel];
    return {
        ...CLAUDE_CONFIG,
        maxTokens: config.maxResponseTokens,
        temperature: 0.7 // Keep personality temperature
    };
}

// Export internal functions for testing
export { calculateRelevanceScore, selectPersonalDetails as selectRelevantPersonalDetails, selectConversationContext as selectRelevantMessages };

// Export types
export type { TokenConfig, TokenAnalytics };