/**
 * @file Bot configuration and validation limits
 * Centralized constants for bot behavior, database tuning, retry policy, and input limits.
 * Requires environment variables: OWNER_ID, MONGODB_URI.
 */

import { BotConfig, DatabaseConfig } from '../types';

/**
 * Core bot behavior and resource management settings
 * Owners receive elevated privileges higher token limits
 */
export const BOT_CONFIG: BotConfig = {
    ownerId: process.env.OWNER_ID || '',    // Discord ID of the bot owner
    maxRecentMessages: 8,                   // Number of recent messages to store for context
    maxEmotionalMoments: 15,                // Max number of emotional moments tracked 
    maxPersonalDetails: 20,                 // Max number of personal details tracked
    dailyTokenLimit: 1000,                  // Daily token usage limit per user
    ownerTokenMultiplier: 3,                // Token limit multiplier for the bot owner 
};

/**
 * MongoDB connection configuration optimized for chatbot workloads
 * Settings balance connection efficiency with resource usage
 */
export const DATABASE_CONFIG: DatabaseConfig = {
    uri: process.env.MONGODB_URI || '',     // MongoDB connection string from environment
    options: {
        maxPoolSize: 10,                    // Max number of DB connections in the pool
        minPoolSize: 2,                     // Minimum number of connections to keep open
        maxIdleTimeMS: 30000,               // Close idle connections after 30,000 ms (30 s)
        serverSelectionTimeoutMS: 5000,     // Timeout for selecting a MongoDB server (ms)
        socketTimeoutMS: 45000,             // Timeout for socket inactivity (ms)
        retryWrites: true,                  // Enable retryable writes
        w: 'majority',                      // Write concern: wait for majority of nodes
    },
};

/**
 * Retry/backoff configuration for transient failures
 * Prevents overwhelming services during outages
 */
export const RETRY_CONFIG = {
    maxRetries: 3,                          // Max number of retry attempts
    baseDelay: 1000,                        // Initial delay between retries (1 second)
    maxDelay: 10000,                        // Max delay between retries (10 seconds)
};

/**
 * Input validation limits to prevent abuse and ensure data quality
 * Values chosen based on typical user behavior and storage efficiency
 */
export const LIMITS = {
    MAX_MESSAGE_LENGTH: 2000,               // Max allowed message length (characters)
    MAX_USERNAME_LENGTH: 32,                // Max allowed username length
    MAX_PERSONAL_DETAIL_LENGTH: 200,        // Max allowed length for stored personal details
    MAX_EMOTIONAL_SUMMARY_LENGTH: 300,      // Max allowed length for emotional summaries
};