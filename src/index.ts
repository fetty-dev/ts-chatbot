/**
 * @file Main application entry point with comprehensive startup validation
 * Orchestrates bot initialization: environment → database → Claude → Discord
 * 
 * Startup Sequence:
 * 1. Environment validation (fail-fast on missing config)
 * 2. Database connection establishment  
 * 3. Claude API connectivity verification
 * 4. Discord bot authentication and ready state
 * 5. Health check and status reporting
 * 
 * Error Handling:
 * - Fail-fast pattern for critical dependencies
 * - Detailed error logging for debugging
 * - Graceful degradation where possible
 * - Process exit codes for container orchestration
 */

import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './database/connection';
import { discordBot } from './bot/client';
import { testClaudeConnection } from './services/claude';
import { validateChannelConfig } from './services/channelManager';
import { validateEnvironment } from './utils/validation';
import { logger } from './utils/logger';

/**
 * Service health check results for startup validation
 */
interface ServiceHealth {
    service: string;
    healthy: boolean;
    error?: string;
    duration?: number;
}

/**
 * Startup configuration and timing
 */
interface StartupResult {
    success: boolean;
    startTime: Date;
    totalDuration: number;
    services: ServiceHealth[];
}

/**
 * Main application startup orchestrator
 * Implements fail-fast pattern with comprehensive health checks
 */
async function startBot(): Promise<void> {
    const startTime = Date.now();
    const services: ServiceHealth[] = [];
    
    logger.info('🚀 Starting Discord bot with Claude AI integration');
    logger.info('Bot initialization sequence beginning', {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
    });
    
    try {
        // Step 1: Environment validation (fail-fast)
        await validateEnvironmentHealth(services);
        
        // Step 2: Database connection
        await validateDatabaseHealth(services);
        
        // Step 3: Claude API connectivity
        await validateClaudeHealth(services);
        
        // Step 4: Discord bot startup
        await validateDiscordHealth(services);
        
        // Step 5: Final health report
        const totalDuration = Date.now() - startTime;
        logStartupSuccess(services, totalDuration);
        
        // Setup process monitoring
        setupProcessMonitoring();
        
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        await handleStartupFailure(error as Error, services, totalDuration);
    }
}

/**
 * Validate environment variables and configuration
 */
async function validateEnvironmentHealth(services: ServiceHealth[]): Promise<void> {
    const startTime = Date.now();
    
    try {
        logger.info('🔍 Validating environment configuration');
        validateEnvironment();
        
        // Also validate channel configuration
        validateChannelConfig();
        
        const duration = Date.now() - startTime;
        services.push({
            service: 'Environment',
            healthy: true,
            duration
        });
        
        logger.info('✅ Environment validation passed', {
            duration,
            operation: 'env_validation'
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        services.push({
            service: 'Environment',
            healthy: false,
            error: (error as Error).message,
            duration
        });
        
        logger.error('❌ Environment validation failed', {
            duration,
            operation: 'env_validation'
        }, error as Error);
        
        throw new Error(`Environment validation failed: ${(error as Error).message}`);
    }
}

/**
 * Establish and validate database connection
 */
async function validateDatabaseHealth(services: ServiceHealth[]): Promise<void> {
    const startTime = Date.now();
    
    try {
        logger.info('🗄️ Connecting to MongoDB database');
        await connectDatabase();
        
        const duration = Date.now() - startTime;
        services.push({
            service: 'Database',
            healthy: true,
            duration
        });
        
        logger.info('✅ Database connection established', {
            duration,
            operation: 'db_connection'
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        services.push({
            service: 'Database',
            healthy: false,
            error: (error as Error).message,
            duration
        });
        
        logger.error('❌ Database connection failed', {
            duration,
            operation: 'db_connection'
        }, error as Error);
        
        throw new Error(`Database connection failed: ${(error as Error).message}`);
    }
}

/**
 * Test Claude API connectivity and authentication
 */
async function validateClaudeHealth(services: ServiceHealth[]): Promise<void> {
    const startTime = Date.now();
    
    try {
        logger.info('🧠 Testing Claude API connectivity');
        const isHealthy = await testClaudeConnection();
        
        if (!isHealthy) {
            throw new Error('Claude API health check failed');
        }
        
        const duration = Date.now() - startTime;
        services.push({
            service: 'Claude API',
            healthy: true,
            duration
        });
        
        logger.info('✅ Claude API connection verified', {
            duration,
            operation: 'claude_health_check'
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        services.push({
            service: 'Claude API',
            healthy: false,
            error: (error as Error).message,
            duration
        });
        
        logger.error('❌ Claude API health check failed', {
            duration,
            operation: 'claude_health_check'
        }, error as Error);
        
        throw new Error(`Claude API validation failed: ${(error as Error).message}`);
    }
}

/**
 * Initialize Discord bot and wait for ready state
 */
async function validateDiscordHealth(services: ServiceHealth[]): Promise<void> {
    const startTime = Date.now();
    
    try {
        logger.info('🤖 Initializing Discord bot');
        
        // Start Discord login process
        await discordBot.login(process.env.TOKEN!);
        
        // Wait for bot to be ready (with timeout)
        await waitForBotReady(30000); // 30 second timeout
        
        const duration = Date.now() - startTime;
        services.push({
            service: 'Discord Bot',
            healthy: true,
            duration
        });
        
        logger.info('✅ Discord bot initialized and ready', {
            duration,
            operation: 'discord_startup'
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        services.push({
            service: 'Discord Bot',
            healthy: false,
            error: (error as Error).message,
            duration
        });
        
        logger.error('❌ Discord bot initialization failed', {
            duration,
            operation: 'discord_startup'
        }, error as Error);
        
        throw new Error(`Discord bot startup failed: ${(error as Error).message}`);
    }
}

/**
 * Wait for Discord bot to reach ready state with timeout
 */
async function waitForBotReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Bot ready timeout exceeded'));
        }, timeoutMs);
        
        const checkReady = () => {
            const status = discordBot.getStatus();
            if (status.isReady) {
                clearTimeout(timeout);
                resolve();
            } else {
                setTimeout(checkReady, 100); // Check every 100ms
            }
        };
        
        checkReady();
    });
}

/**
 * Log successful startup with comprehensive health report
 */
function logStartupSuccess(services: ServiceHealth[], totalDuration: number): void {
    const healthReport = services.map(service => ({
        service: service.service,
        status: service.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY',
        duration: `${service.duration}ms`
    }));
    
    logger.info('🎉 Bot startup completed successfully', {
        totalDuration: `${totalDuration}ms`,
        services: healthReport,
        operation: 'startup_complete'
    });
    
    // Log final status
    const botStatus = discordBot.getStatus();
    logger.info('🤖 Bot is now online and ready for interactions', {
        uptime: Date.now() - (botStatus.startTime?.getTime() || Date.now()),
        operation: 'bot_ready'
    });
}

/**
 * Handle startup failures with cleanup and proper exit codes
 */
async function handleStartupFailure(error: Error, services: ServiceHealth[], totalDuration: number): Promise<void> {
    logger.error('💥 Bot startup failed', {
        totalDuration: `${totalDuration}ms`,
        services: services.map(s => ({
            service: s.service,
            healthy: s.healthy,
            error: s.error
        })),
        operation: 'startup_failed'
    }, error);
    
    // Attempt graceful cleanup
    try {
        logger.info('🧹 Attempting graceful cleanup');
        await disconnectDatabase();
        logger.info('✅ Database disconnected cleanly');
    } catch (cleanupError) {
        logger.error('❌ Cleanup failed', {}, cleanupError as Error);
    }
    
    // Exit with error code for container orchestration
    process.exit(1);
}

/**
 * Setup ongoing process monitoring and health checks
 */
function setupProcessMonitoring(): void {
    // Memory usage monitoring
    setInterval(() => {
        const memUsage = process.memoryUsage();
        logger.debug('Process memory usage', {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            operation: 'memory_monitoring'
        });
    }, 300000); // Every 5 minutes
    
    // Bot health status logging
    setInterval(() => {
        const status = discordBot.getStatus();
        logger.debug('Bot health status', {
            isReady: status.isReady,
            uptime: status.startTime ? Date.now() - status.startTime.getTime() : 0,
            totalErrors: status.totalErrors,
            lastError: status.lastError,
            operation: 'health_monitoring'
        });
    }, 600000); // Every 10 minutes
    
    logger.debug('Process monitoring initialized');
}

/**
 * Global unhandled error handlers for process stability
 */
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
        reason: String(reason),
        operation: 'unhandled_rejection'
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        operation: 'uncaught_exception'
    }, error);
    
    // Graceful shutdown on uncaught exception
    process.exit(1);
});

// Start the bot
startBot().catch((error) => {
    logger.error('Fatal startup error', {}, error);
    process.exit(1);
});