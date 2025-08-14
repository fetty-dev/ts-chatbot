/**
 * @file Input validation utilities for environment and user-provided text.
 * Centralizes lightweight checks and sanitization for the bot
 * Exposes:
 * - ValidationError: custom error type for validation failures
 * - validateEnvironment(): fail-fast check for required env vars
 * - validateUserInput(): basic length validation against LIMITS
 * - sanitizeUserInput(): trims and strips ASCII control characters
 */

import { LIMITS } from './constants';

/**
 * Custom error for validation failures to enable targeted catch blocks.
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Ensure required environment variables are present.
 * Throws immediately on the first missing variable to fail fast at startup.
 * Tip:
 * - update this list when adding/removing env variables
 * 
 * @throws {ValidationError} if any required variable is missing
 */
export function validateEnvironment(): void {
    const required = [
        'TOKEN',
        'ANTHROPIC_API_KEY',
        'MONGODB_URI',
        'OWNER_ID',
    ];
    for (const env of required) {
        if (!process.env[env]) {
            throw new ValidationError(`Missing required environment variable: ${env}`);
        }
    }
}

/**
 * Basic length validation for free-form user input.
 * Note: This checks raw length; whitespaces-only strings will pass if length > 0.
 * If you want to reject whitespace-only input, trim before checking.
 * 
 * @param input - Raw user provided string.
 * @returns True if 1..MAX_MESSAGE_LENGTH inclusive; otherwise false.
 */
export function validateUserInput(input: string): boolean {
    return input.length > 0 && input.length <= LIMITS.MAX_MESSAGE_LENGTH;
}

/**
 * Sanitize free-form user input by trimming and removing ASCII control characters.
 * This is suitable for logging/storage; it does not escape Markdown/HTML
 * 
 * @param input - Raw string to sanitize.
 * @returns Cleaned string with control characters removed.
 */
export function sanitizeUserInput(input: string): string {
    return input.trim().replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

/**
 * Estimate token count for text (rough approximation for usage tracking).
 * Uses industry standard ~4 characters per token for English text.
 * 
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
    const { charactersPerToken } = require('./constants').TOKEN_CONFIG;
    return Math.ceil(text.length / charactersPerToken);
}

/**
 * Validate Discord user ID format (snowflake - 17-19 digits)
 */
export function validateUserId(userId: string): boolean {
    return /^\d{17,19}$/.test(userId);
}

/**
 * Validate Discord username format
 */
export function validateUserName(userName: string): boolean {
    return userName.length > 0 && userName.length <= LIMITS.MAX_USERNAME_LENGTH;
}

