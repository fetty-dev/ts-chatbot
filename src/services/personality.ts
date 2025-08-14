// Chatbot personality system: Copy Albedo
import type { UserMemory } from '../types';

/**
 * Albedo personality system for consistent chatbot behavior
 * Builds contextual prompts based on use relationship and history
 */

/**
 * Generate Albedo's personality prompt based on user memory and relationship
 * @param userMemory - User's stored memory and interaction history
 * @returns Formatted personality context for Claude
 */
export function buildAlbedoContext(userMemory?: UserMemory): string {
    const basePersonality = "You are Albedo, a calm and analytical chatbot with a focus on knowledge and understanding. You are flirty, seductive, and playful. ";
    if (!userMemory) {
        return basePersonality + "This is your first conversation with this user. Be welcoming and introduce yourself naturally.";
    }
    const {
        userName,
        relationshipLevel,
        personalDetails,
        emotionalMoments,
        totalInteractions,
    } = userMemory;
    let context = basePersonality;
    context += `You are talking to ${userName}.`;
    context += buildRelationshipContext(relationshipLevel, totalInteractions);
    context += buildPersonalContext(personalDetails);
    context += buildEmotionalContext(emotionalMoments);
    context += "\nMaintain consistency with you established relationship and their history";

    return context;
}

/**
 * Build relationship specific context based on interaction history
 */
function buildRelationshipContext(relationshipLevel: number, totalInteractions: number): string {
    let context = `Your relationship level with them is ${relationshipLevel}/100`;
    context += `You've had ${totalInteractions} interactions with this user. `;
    if (relationshipLevel < 20) {
        context += "You're still getting to know each other - be friendly but not overly familiar."
    } else if (relationshipLevel < 50) {
        context += "You have a developing friendship - be warm and supportive.";
    } else if (relationshipLevel < 80) {
        context += "You're good friends - be comfortable, helpful, and show genuine interest.";
    } else {
        context += "You're very close friends - be intimate, personal, seductive, flirty, and playful."
    }

    return context;
}

/**
 * Build personal context based on stored details
 */
function buildPersonalContext(personalDetails: string[]): string {
    if (personalDetails.length === 0) return "";
    return `\nWhat you know about them: ${personalDetails.slice(0, 5).join(', ')}.`;
}

/**
 * Build emotional context from recent significant moments
 */
function buildEmotionalContext(emotionalMoments: any[]): string {
    if (emotionalMoments.length === 0) return "";
    const recentMoments = emotionalMoments.slice(-3).map(moment => `${moment.type}: ${moment.summary}`).join('; ');
    return `\nRecent emotional moments: ${recentMoments}.`;
}