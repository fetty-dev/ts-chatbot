/**
 * @file Response filtering and content processing service
 * Handles post-processing of Claude AI responses to ensure clean, user-friendly output.
 * 
 * Features:
 * - Removes italicized action text and roleplay elements
 * - Filters out unwanted formatting patterns
 * - Sanitizes responses while preserving conversational flow
 * - Configurable filtering rules for different content types
 * 
 * Architecture:
 * - Pure functions for easy testing and debugging
 * - Chainable filter pipeline for extensibility
 * - Performance-optimized regex patterns
 * - Comprehensive logging for filter effectiveness monitoring
 */

import { logger } from '../utils/logger';

/**
 * Configuration for response filtering behavior
 */
interface FilterConfig {
    removeItalicActions: boolean;       // Remove italicized action descriptions
    removeAsterisks: boolean;           // Remove *action* patterns
    removeEmptyLines: boolean;          // Clean up excessive whitespace
    trimWhitespace: boolean;            // Normalize spacing
    logFiltering: boolean;              // Log filter operations
}

/**
 * Result of filtering operation with metadata
 */
interface FilterResult {
    originalText: string;               // Input text for comparison
    filteredText: string;               // Processed output
    filtersApplied: string[];          // List of filters that made changes
    charactersRemoved: number;          // Count of removed characters
    wasModified: boolean;               // Whether any changes were made
}

/**
 * Default filtering configuration optimized for chatbot responses
 */
const DEFAULT_FILTER_CONFIG: FilterConfig = {
    removeItalicActions: true,
    removeAsterisks: true,
    removeEmptyLines: true,
    trimWhitespace: true,
    logFiltering: true
};

/**
 * Main response filtering function with comprehensive content processing
 * Applies multiple filters in sequence to clean Claude's responses
 * 
 * @param responseText - Raw response text from Claude API
 * @param config - Optional filtering configuration (uses defaults if not provided)
 * @returns Filtered response text ready for Discord delivery
 */
export function filterClaudeResponse(
    responseText: string, 
    config: Partial<FilterConfig> = {}
): string {
    const filterConfig = { ...DEFAULT_FILTER_CONFIG, ...config };
    const result = applyFilterPipeline(responseText, filterConfig);
    
    // Log filtering results for monitoring and debugging
    if (filterConfig.logFiltering && result.wasModified) {
        logger.debug('Response filtered', {
            originalLength: result.originalText.length,
            filteredLength: result.filteredText.length,
            charactersRemoved: result.charactersRemoved,
            filtersApplied: result.filtersApplied,
            operation: 'response_filtering'
        });
    }
    
    return result.filteredText;
}

/**
 * Comprehensive filtering pipeline that applies all configured filters
 * Each filter is applied sequentially with change tracking
 * 
 * @param text - Input text to process
 * @param config - Filtering configuration
 * @returns Detailed filtering result with metadata
 */
function applyFilterPipeline(text: string, config: FilterConfig): FilterResult {
    let currentText = text;
    const filtersApplied: string[] = [];
    
    // Filter 1: Remove italicized action descriptions
    if (config.removeItalicActions) {
        const beforeLength = currentText.length;
        currentText = removeItalicizedActions(currentText);
        if (currentText.length !== beforeLength) {
            filtersApplied.push('italic_actions');
        }
    }
    
    // Filter 2: Remove asterisk-wrapped actions
    if (config.removeAsterisks) {
        const beforeLength = currentText.length;
        currentText = removeAsteriskActions(currentText);
        if (currentText.length !== beforeLength) {
            filtersApplied.push('asterisk_actions');
        }
    }
    
    // Filter 3: Clean up excessive whitespace and empty lines
    if (config.removeEmptyLines) {
        const beforeLength = currentText.length;
        currentText = removeExcessiveWhitespace(currentText);
        if (currentText.length !== beforeLength) {
            filtersApplied.push('whitespace_cleanup');
        }
    }
    
    // Filter 4: Final trim and normalization
    if (config.trimWhitespace) {
        const beforeLength = currentText.length;
        currentText = normalizeWhitespace(currentText);
        if (currentText.length !== beforeLength) {
            filtersApplied.push('whitespace_normalization');
        }
    }
    
    return {
        originalText: text,
        filteredText: currentText,
        filtersApplied,
        charactersRemoved: text.length - currentText.length,
        wasModified: text !== currentText
    };
}

/**
 * Remove italicized action descriptions and roleplay elements
 * Targets patterns like: *action*, _action_, and standalone italic lines
 * 
 * @param text - Input text to process
 * @returns Text with italic actions removed
 */
function removeItalicizedActions(text: string): string {
    // Remove lines that are entirely italicized actions
    text = text.replace(/^[_*].*[_*]$/gm, '');
    
    // Remove inline italic actions but preserve regular italic emphasis
    // This pattern specifically targets action-like italics (longer phrases with specific keywords)
    const actionPattern = /[_*]+(adjusts|leans|tilts|crosses|smirks|chuckle|gleam|plays|taps|takes)[^_*]*[_*]+/gi;
    text = text.replace(actionPattern, '');
    
    // Remove single-word actions in italics at sentence boundaries
    text = text.replace(/\s[_*]\w+[_*](?=\s|$|[.!?])/g, '');
    
    return text;
}

/**
 * Remove asterisk-wrapped actions and descriptions  
 * Handles patterns like *does something* while preserving emphasis
 * 
 * @param text - Input text to process
 * @returns Text with asterisk actions removed
 */
function removeAsteriskActions(text: string): string {
    // Remove asterisk actions that contain typical action words
    const actionWords = [
        'adjusts', 'leans', 'tilts', 'crosses', 'arms', 'smirks', 'chuckles',
        'gleam', 'eyes', 'plays', 'taps', 'fingers', 'takes', 'head',
        'thoughtfully', 'slightly', 'softly', 'gently', 'knowing', 'curious'
    ];
    
    const actionPattern = new RegExp(
        `\\*[^*]*(?:${actionWords.join('|')})[^*]*\\*`, 'gi'
    );
    
    return text.replace(actionPattern, '');
}

/**
 * Remove excessive whitespace, empty lines, and normalize spacing
 * Cleans up text while preserving intentional paragraph breaks
 * 
 * @param text - Input text to process
 * @returns Text with cleaned whitespace
 */
function removeExcessiveWhitespace(text: string): string {
    // Remove multiple consecutive empty lines (keep single line breaks)
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove lines that are only whitespace
    text = text.replace(/^\s*$/gm, '');
    
    // Remove trailing spaces at end of lines
    text = text.replace(/[ \t]+$/gm, '');
    
    return text;
}

/**
 * Final whitespace normalization and cleanup
 * Ensures consistent spacing throughout the response
 * 
 * @param text - Input text to process
 * @returns Normalized text ready for delivery
 */
function normalizeWhitespace(text: string): string {
    // Trim leading and trailing whitespace
    text = text.trim();
    
    // Normalize multiple spaces to single space
    text = text.replace(/[ \t]+/g, ' ');
    
    // Ensure proper spacing around punctuation
    text = text.replace(/\s+([.!?])/g, '$1');
    text = text.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    return text;
}

/**
 * Get detailed filtering statistics for monitoring
 * Useful for understanding filter effectiveness and tuning
 * 
 * @param text - Text to analyze
 * @param config - Filter configuration to simulate
 * @returns Detailed analysis without modifying the text
 */
export function getFilteringStats(
    text: string, 
    config: Partial<FilterConfig> = {}
): FilterResult {
    const filterConfig = { ...DEFAULT_FILTER_CONFIG, ...config };
    return applyFilterPipeline(text, filterConfig);
}

/**
 * Create custom filter configuration for specific use cases
 * Allows fine-tuning of filtering behavior
 * 
 * @param overrides - Specific configuration overrides
 * @returns Complete filter configuration
 */
export function createFilterConfig(overrides: Partial<FilterConfig> = {}): FilterConfig {
    return { ...DEFAULT_FILTER_CONFIG, ...overrides };
}

// Export types for external use
export type { FilterConfig, FilterResult };