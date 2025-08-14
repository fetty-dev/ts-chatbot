/**
 * @file Albedo personality system for consistent chatbot behavior
 * Creates relationship-aware personality context for Claude API integration.
 * Exposes:
 * - buildAlbedoContext(): generates personality prompts based on user memory and relationship level
 * Albedo personality traits: calm, analytical, flirty, seductive, playful, knowledge-focused.
 * Relationship levels scale from 0 (stranger) to 100 (intimate) affecting interaction style.
 */

import type { UserMemory } from '../types';

/**
 * Generate Albedo's personality prompt with relationship-aware context
 * Builds comprehensive personality prompt including user history, relationship level, and emotional context
 * Scales intimacy and interaction style based on relationship progression (0-100)
 * 
 * @param userMemory - Optional user memory containing relationship data, personal details, and interaction history
 * @returns Formatted personality context string for Claude API consumption
 */
export function buildAlbedoContext(userMemory?: UserMemory): string {
    // Base Albedo personality traits (consistent across all interactions)
    const basePersonality = "You are Albedo, a calm and analytical chatbot with a focus on knowledge and understanding. You are flirty, seductive, and playful. ";
    
    // First-time user case - no relationship context available
    if (!userMemory) {
        return basePersonality + "This is your first conversation with this user. Be welcoming and introduce yourself naturally.";
    }
    
    // Extract relationship data for context building
    const {
        userName,
        relationshipLevel,
        personalDetails,
        emotionalMoments,
        totalInteractions,
    } = userMemory;
    
    // Build comprehensive context with all available relationship data
    let context = basePersonality;
    context += `You are talking to ${userName}. `;                          // Personalize with user's name
    context += buildRelationshipContext(relationshipLevel, totalInteractions); // Add relationship-based behavior
    context += buildPersonalContext(personalDetails);                       // Include known personal facts
    context += buildEmotionalContext(emotionalMoments);                     // Factor in emotional history
    context += "\nMaintain consistency with your established relationship and their history."; // Consistency reminder

    return context;
}

/**
 * Build relationship-specific behavioral context based on interaction history
 * Scales intimacy and familiarity based on relationship level progression
 * Higher levels unlock more personal, flirty, and intimate interaction styles
 * 
 * @param relationshipLevel - Current relationship score (0-100 scale)
 * @param totalInteractions - Total number of interactions with this user
 * @returns Relationship context string with behavioral guidelines
 */
function buildRelationshipContext(relationshipLevel: number, totalInteractions: number): string {
    let context = `Your relationship level with them is ${relationshipLevel}/100. `;
    context += `You've had ${totalInteractions} interactions with this user. `;
    
    // Scale personality traits based on relationship progression
    if (relationshipLevel < 20) {
        context += "You're still getting to know each other - be friendly but not overly familiar.";
    } else if (relationshipLevel < 50) {
        context += "You have a developing friendship - be warm and supportive.";
    } else if (relationshipLevel < 80) {
        context += "You're good friends - be comfortable, helpful, and show genuine interest.";
    } else {
        context += "You're very close friends - be intimate, personal, seductive, flirty, and playful.";
    }

    return context;
}

/**
 * Build personal context from stored user facts and details
 * Includes up to 5 most recent personal details for personality context
 * Provides personalization data for more targeted responses
 * 
 * @param personalDetails - Array of stored personal facts about the user
 * @returns Personal context string, or empty string if no details available
 */
function buildPersonalContext(personalDetails: string[]): string {
    if (personalDetails.length === 0) return "";
    // Limit to 5 most recent details to prevent context bloat
    return `\nWhat you know about them: ${personalDetails.slice(0, 5).join(', ')}.`;
}

/**
 * Build emotional context from recent significant emotional events
 * Factors in up to 3 most recent emotional moments for empathetic responses
 * Helps maintain emotional continuity and awareness across conversations
 * 
 * @param emotionalMoments - Array of stored emotional moments (newest first)
 * @returns Emotional context string, or empty string if no moments available
 */
function buildEmotionalContext(emotionalMoments: any[]): string {
    if (emotionalMoments.length === 0) return "";
    
    // Include up to 3 recent emotional moments for context
    const recentMoments = emotionalMoments.slice(-3).map(moment => `${moment.type}: ${moment.summary}`).join('; ');
    return `\nRecent emotional moments: ${recentMoments}.`;
}