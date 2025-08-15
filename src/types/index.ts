/**
 * @file Project type definitions for bot memory, messages, and configuration.
 * Centralizes interfaces for user state, conversational context, and service configs.
 * Notes:
 * - Date fields are JS Date objects in memory; serialize as ISO strings if persisting.
 * - Keep ranges/units consistent (e.g., 0-100 scales, milliseconds).
 */

// ========================================================
//                 USER MEMORY AND STATE
// ========================================================

/**
 * Aggregate, long-lived memory tracker per user.
 * Intended for personalization, safety, and rate/limit decisions.
 */
export interface UserMemory {
    userId: string;                         // Stable platform user identifier 
    userName: string;                       // Display name at time of last interaction
    isOwner: boolean;                       // True if user is the bot owner
    relationshipLevel: number;              // Relationship score, 0-100 inclusive
    personalDetails: string[];              // Distilled facts about the user (deduped)
    emotionalMoments: EmotionalMoment[];    // Significant emotional events for this user
    recentMessages: RecentMessage[];        // Rolling conversation context window
    firstMet: Date;                         // Timestamp of the first recorded interaction
    lastInteraction: Date;                  // Timestamp of the most recent interaction
    totalInteractions: number;              // Count of all interactions (monotonic)
    createdAt: Date;                        // Record creation time
    updatedAt: Date;                        // Last update time (refresh on any change)
}
/**
 * Labeled emotional event used to influence tone/safety and summaries
 * Keep summaries concise; intensity range should be validated by callers
 */
export interface EmotionalMoment {
    timestamp: Date;                        // When the event was observed or inferred
    type: 'positive' | 'negative' | 
    'significant';                          // Coarse sentiment/category label
    summary: string;                        // Short description (e.g., "Got a new job")
    intensity: number;                      // 1-10 intensity scale
}
/**
 * Minimal message pair kept for short term conversational context
 * Trim or tokenize outside this type to respect global limits
 */
export interface RecentMessage {
    timestamp: Date;                        // When the exchange occurred
    userMessage: string;                    // Raw user input (pre-redaction if needed)
    botResponse: string;                    // Rendered reply that was sent
    tokens: number;                         // Estimated token usage for this pair
}

// =======================================================
//                  SERVER CONFIG TYPES 
// ========================================================

/**
 * MongoDB connection options used by the app-level client
 * Values mirror common node MongoDB driver settings
 */
export interface DatabaseConfig {
    uri: string;                            // MongoDB connection string
    options: {
        maxPoolSize: number;                // Maximum connections in the pool
        minPoolSize: number;                // Minimum connections kept warm
        maxIdleTimeMS: number;              // Close idle connections after this many ms
        serverSelectionTimeoutMS: number;   // How long to wait for a suitable server (ms)
        socketTimeoutMS: number;            // Socket inactivity timeout (ms)
        retryWrites: boolean;               // Enable retryable writes on the driver
        w: 'majority';                      // Write concern: wait for majority acknowledgment
    };
}
/**
 * Core bot behavior limits and owner privileges
 * These settings should be validated against runtime LIMITS
 */
export interface BotConfig {
    ownerId: string;                        // Discord ID of the bot owner
    channelId: string;                      // Discord channel ID where bot operates
    maxRecentMessages: number;              // Max items in RecentMessage context window
    maxEmotionalMoments: number;            // Cap on EmotionalMoment records retained
    maxPersonalDetails: number;             // Cap on stored personal facts
    dailyTokenLimit: number;                // Per-user daily token allowance
    ownerTokenMultiplier: number;           // Multiplier applied if isOwner === true
}