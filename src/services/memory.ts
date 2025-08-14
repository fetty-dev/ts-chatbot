/**
 * @file User memory persistence and management service
 * Handles all user data operations including memory creation, updates, and relationship tracking.
 * Exposes:
 * - getUserMemory(): retrieve user data by Discord ID
 * - createUserMemory(): create new user memory record
 * - updateUserMemory(): update existing user data
 * - addRecentMessage(): store conversation history with token tracking
 * - addEmotionalMoment(): track significant emotional events (1-10 intensity)
 * - addPersonalDetail(): store deduped personal facts about users
 * - updateRelationshipLevel(): manage relationship scores (0-100 scale)
 * - getOrCreateUserMemory(): convenience method for bot message handling
 */

import type { UserMemory, EmotionalMoment, RecentMessage } from '../types';
import { UserMemoryModel } from '../database/models/userMemory';
import { BOT_CONFIG, LIMITS } from '../utils/constants';
import { validateUserId, validateUserName } from '../utils/validation';
import type { Document } from 'mongoose';
/**
 * Retrieve user memory data by Discord user ID
 * Returns null if user has no existing memory record
 * 
 * @param userId - Discord user ID (snowflake format: 17-19 digits)
 * @returns User memory document with mongoose methods, or null if not found
 * @throws {Error} if userId format is invalid
 */
export async function getUserMemory(userId: string): Promise<(UserMemory & Document) | null> {
    if (!validateUserId(userId)) {
        throw new Error('Invalid user ID format');
    }

    return await UserMemoryModel.findOne({ userId }).exec();
}

/**
 * Create new user memory record with default values
 * Automatically detects bot owner based on OWNER_ID environment variable
 * Sets relationship level to 0 and initializes empty arrays for tracking data
 * 
 * @param userId - Discord user ID (validated against snowflake format)
 * @param userName - Display name at time of first interaction
 * @returns Newly created user memory document
 * @throws {Error} if userId or userName format is invalid
 */
export async function createUserMemory(userId: string, userName: string): Promise<UserMemory & Document> {
    if (!validateUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    if (!validateUserName(userName)) {
        throw new Error('Invalid username format');
    }

    const now = new Date();
    const isOwner = userId === BOT_CONFIG.ownerId;    // Check if user is bot owner
    
    const newMemory = new UserMemoryModel({
        userId,
        userName,
        isOwner,
        relationshipLevel: 0,                         // Start with neutral relationship
        personalDetails: [],                          // Empty personal facts array
        emotionalMoments: [],                         // Empty emotional events array
        recentMessages: [],                           // Empty conversation history
        firstMet: now,                                // Record creation timestamp
        lastInteraction: now,                         // Same as creation for new users
        totalInteractions: 1,                         // Count starts at 1
        createdAt: now,
        updatedAt: now
    });

    return await newMemory.save();
}

/**
 * Update existing user memory with partial data
 * Automatically updates the updatedAt timestamp and runs mongoose schema validation
 * Returns null if user memory record does not exist
 * 
 * @param userId - Discord user ID (validated against snowflake format)
 * @param updates - Partial user memory object with fields to update
 * @returns Updated user memory document, or null if user not found
 * @throws {Error} if userId format is invalid
 * @throws {ValidationError} if update data fails mongoose schema validation
 */
export async function updateUserMemory(userId: string, updates: Partial<UserMemory>): Promise<UserMemory | null> {
    if (!validateUserId(userId)) {
        throw new Error('Invalid user ID format');
    }
    const updatedMemory = await UserMemoryModel.findOneAndUpdate(
        { userId },
        { ...updates, updatedAt: new Date() },     // Force updatedAt refresh
        { new: true, runValidators: true }         // Return updated doc + validate schema
    ).exec();

    return updatedMemory;
}

/**
 * Add new message exchange to user's conversation history
 * Automatically truncates messages to length limits and maintains rolling window of recent messages
 * Updates interaction tracking (lastInteraction timestamp and totalInteractions counter)
 * 
 * @param userId - Discord user ID (must have existing memory record)
 * @param userMessage - User's message content (truncated to MAX_MESSAGE_LENGTH)
 * @param botResponse - Bot's response content (truncated to MAX_MESSAGE_LENGTH) 
 * @param tokens - Token count for this exchange (used for usage tracking)
 * @returns Promise that resolves when message is stored
 * @throws {Error} if user memory record does not exist
 */
export async function addRecentMessage(userId: string, userMessage: string, botResponse: string, tokens: number): Promise<void> {
    const memory = await getUserMemory(userId);
    if (!memory) {
        throw new Error('User memory not found');
    }

    const newMessage: RecentMessage = {
        timestamp: new Date(),
        userMessage: userMessage.slice(0, LIMITS.MAX_MESSAGE_LENGTH),    // Truncate to prevent bloat
        botResponse: botResponse.slice(0, LIMITS.MAX_MESSAGE_LENGTH),     // Truncate to prevent bloat
        tokens
    };
    memory.recentMessages.unshift(newMessage);                          // Add to front (most recent first)
    if (memory.recentMessages.length > BOT_CONFIG.maxRecentMessages) {
        memory.recentMessages = memory.recentMessages.slice(0, BOT_CONFIG.maxRecentMessages);  // Maintain rolling window
    }

    memory.lastInteraction = new Date();                                // Update interaction timestamp
    memory.totalInteractions += 1;                                      // Increment counter

    await memory.save();
}

/**
 * Record a significant emotional event for relationship tracking
 * Emotional moments help the bot understand user's emotional state patterns and important life events
 * Maintains rolling window of most recent emotional moments
 * 
 * @param userId - Discord user ID (must have existing memory record)
 * @param moment - Emotional moment data without timestamp (intensity 1-10, summary, emotion type)
 * @returns Promise that resolves when emotional moment is stored
 * @throws {Error} if user memory record does not exist
 */
export async function addEmotionalMoment(userId: string, moment: Omit<EmotionalMoment, 'timestamp'>): Promise<void> {
    const memory = await getUserMemory(userId);
    if (!memory) {
        throw new Error('User memory not found');
    }

    const newMoment: EmotionalMoment = {
        ...moment,
        timestamp: new Date(),                                            // Auto-timestamp
        summary: moment.summary.slice(0, LIMITS.MAX_EMOTIONAL_SUMMARY_LENGTH)  // Truncate summary
    };

    memory.emotionalMoments.unshift(newMoment);                         // Add to front (most recent first)
    if (memory.emotionalMoments.length > BOT_CONFIG.maxEmotionalMoments) {
        memory.emotionalMoments = memory.emotionalMoments.slice(0, BOT_CONFIG.maxEmotionalMoments);  // Maintain rolling window
    }

    await memory.save();
}

/**
 * Store a personal fact about the user with automatic deduplication
 * Only adds the detail if it's not already stored (case-sensitive exact match)
 * Maintains rolling window of most recent personal details
 * 
 * @param userId - Discord user ID (must have existing memory record)
 * @param detail - Personal detail/fact about the user (truncated to MAX_PERSONAL_DETAIL_LENGTH)
 * @returns Promise that resolves when detail is processed (may not be stored if duplicate)
 * @throws {Error} if user memory record does not exist
 */
export async function addPersonalDetail(userId: string, detail: string): Promise<void> {
    const memory = await getUserMemory(userId);
    if (!memory) {
        throw new Error('User memory not found');
    }
    const trimmedDetail = detail.slice(0, LIMITS.MAX_PERSONAL_DETAIL_LENGTH);  // Truncate to prevent bloat
    if (!memory.personalDetails.includes(trimmedDetail)) {              // Check for exact duplicates
        memory.personalDetails.unshift(trimmedDetail);                  // Add to front (most recent first)

        if (memory.personalDetails.length > BOT_CONFIG.maxPersonalDetails) {
            memory.personalDetails = memory.personalDetails.slice(0, BOT_CONFIG.maxPersonalDetails);  // Maintain rolling window
        }

        await memory.save();                                            // Only save if we added something new
    }
}

/**
 * Update the relationship level between bot and user
 * Relationship levels track emotional closeness and trust (0=stranger, 100=very close)
 * Used by personality system to adjust response tone and depth
 * 
 * @param newLevel - New relationship level (0-100 scale, where 0=stranger, 100=very close)
 * @param userId - Discord user ID (validated by updateUserMemory)
 * @returns Promise that resolves when relationship level is updated
 * @throws {Error} if newLevel is outside valid range (0-100)
 * @throws {Error} if userId format is invalid (from updateUserMemory)
 */
export async function updateRelationshipLevel(userId: string, newLevel: number): Promise<void> {
    if (newLevel < 0 || newLevel > 100) {
        throw new Error('Relationship level must be between 0 and 100');
    }
    await updateUserMemory(userId, { relationshipLevel: newLevel });    // Delegate to general update function
}

/**
 * Convenience method to get existing user memory or create new record if none exists
 * Also handles username updates when user changes their Discord display name
 * This is the primary method used by message handlers to ensure user data exists
 * 
 * @param userId - Discord user ID (validated by getUserMemory/createUserMemory)
 * @param userName - Current Discord display name (may differ from stored name)
 * @returns User memory document (existing or newly created)
 * @throws {Error} if userId or userName format is invalid
 */
export async function getOrCreateUserMemory(userId: string, userName: string): Promise<UserMemory & Document> {
    let memory = await getUserMemory(userId);
    
    if (!memory) {
        memory = await createUserMemory(userId, userName);              // Create new record with current name
    } else {
        if (memory.userName !== userName) {                             // Handle name changes
            await updateUserMemory(userId, { userName });               // Update stored name
            memory.userName = userName;                                 // Update local object
        }
    }
    
    return memory;
}