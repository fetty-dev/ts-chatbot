# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready TypeScript Discord bot built with discord.js v14 and Anthropic Claude API integration. The project features a modular service architecture with persistent user memory storage via MongoDB, an "Albedo" chatbot personality system, and an intelligent token optimization system that achieves 50%+ cost reduction while maintaining response quality.

## Development Commands

### Essential Scripts
- `npm run dev` - Start development server with hot reload using tsx
- `npm run build` - Compile TypeScript to JavaScript 
- `npm start` - Run the compiled bot from dist/

### Code Quality
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### TypeScript Commands
- `tsc` - Type check the entire project
- `tsc --watch` - Watch mode for continuous type checking

### Development Validation Workflow
Always run this sequence before committing:
1. `tsc` - Ensure type safety
2. `npm run lint` - Code style compliance  
3. `npm test` - All tests passing
4. `npm run build` - Clean compilation

## Project Architecture

### Application Startup (src/index.ts)
The bot uses a fail-fast startup pattern with comprehensive health checks:
1. **Environment Validation** - Validates all required environment variables
2. **Database Connection** - Establishes MongoDB connection with health monitoring
3. **Claude API Verification** - Tests API connectivity and authentication
4. **Discord Bot Authentication** - Logs into Discord and waits for ready state
5. **Health Monitoring Setup** - Configures ongoing process and service monitoring

### Core Structure
- `src/index.ts` - Main entry point with orchestrated startup sequence and health monitoring
- `src/bot/` - Discord client configuration and event handling with error boundaries
- `src/database/` - MongoDB connection with mongoose models and connection pooling
- `src/services/` - Modular business logic services (see Service Architecture below)
- `src/types/` - Centralized TypeScript interfaces for all data structures
- `src/utils/` - Shared utilities for logging, validation, constants, and token estimation

### Service Architecture
**Single-responsibility services following SOLID principles:**
- `claude.ts` - Claude API client with token optimization and analytics
- `memory.ts` - User memory management with relationship tracking and emotional moments
- `personality.ts` - Albedo personality system with relationship-aware context building
- `tokenOptimizer.ts` - Intelligent token usage optimization with 50%+ cost savings
- `responseFilter.ts` - Claude response cleaning and formatting (removes unwanted actions)
- `channelManager.ts` - Channel-based access control with whitelist and owner bypass
- `commandHandler.ts` - Owner administrative commands for runtime configuration

### Key Dependencies
- **@anthropic-ai/sdk** - Official Anthropic Claude API client
- **discord.js v14** - Discord API wrapper with full typing support
- **mongoose v8** - MongoDB object modeling with schema validation
- **TypeScript v5** - Full type safety with strict mode enabled
- **Jest** - Testing framework with TypeScript support via ts-jest
- **ESLint** - Code linting with TypeScript-specific rules

### Claude API Integration
The bot uses Anthropic's official SDK with intelligent optimization:
- **Model**: claude-sonnet-4-20250514 (latest Sonnet model for best performance)
- **Temperature**: 0.7 for balanced creativity/consistency
- **Token Optimization**: Three-tier system (balanced/efficient/economy) achieving 50%+ cost savings
- **Context Management**: Smart selection of relevant memory and conversation history
- **Response Filtering**: Automatic removal of Claude's italic action text
- **Cost Analytics**: Real-time token tracking and cost estimation

### Token Optimization System
**Achieves 50%+ cost reduction while maintaining response quality:**
- **Balanced Mode** (default): 1500 input / 300 output tokens, 20-30% savings
- **Efficient Mode**: 1000 input / 200 output tokens, 40-50% savings  
- **Economy Mode**: 600 input / 150 output tokens, 60-70% savings

**Smart Context Selection:**
- Relevance scoring for personal details and conversations (70% relevance + 30% recency)
- Strategic memory budget allocation across personality, memory, and context
- Compressed personality prompts (reduced from ~200 to ~50 tokens)

### Discord.js Setup
The bot is configured with these intents:
- Guilds (server access)
- GuildMessages (message events)
- GuildMembers (member data)
- MessageContent (read message content)
- GuildPresences (user status)

### Database Architecture
Uses MongoDB with Mongoose for user memory persistence:
- `UserMemory` model tracks relationship levels (0-100), personal details, and interaction history
- `EmotionalMoment` interface for significant emotional events with intensity (1-10)
- `RecentMessage` interface for conversational context with token tracking
- Configurable limits for memory retention (max 20 personal details, 8 recent messages)

### Environment Configuration
Required environment variables:
- `TOKEN` - Discord bot token
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `MONGODB_URI` - MongoDB connection string
- `OWNER_ID` - Discord ID of bot owner (for enhanced privileges and bypass capabilities)
- `CHANNEL_ID` - Discord channel ID where bot operates (whitelist-based access)

### Owner Commands (Discord)
Available to the bot owner for runtime configuration:
- `!bot optimize <level>` - Change optimization level (balanced/efficient/economy)
- `!bot status` - View bot health, uptime, and performance metrics
- `!bot help` - Display available administrative commands

## Development Workflow

Based on `docs/claude-instructions.md`, always follow this critical pattern:

1. **Research** - Explore codebase and understand existing patterns (NEVER jump straight to coding)
2. **Plan** - Create step-by-step implementation plan and verify before starting
3. **Implement** - Execute with regular validation checkpoints

For complex features, use the multi-agent strategy to handle different components simultaneously.

### Code Quality Standards
- All tests must pass (`npm test`)
- Code must pass linting without errors (`npm run lint`)
- TypeScript compilation must succeed (`tsc`)
- Clean up unused code and maintain clear structure
- Follow fail-fast pattern for error handling
- Use single-responsibility principle for services

### Development Patterns
**Service Creation:**
- Each service handles one specific domain (memory, tokens, personality, etc.)
- Export clear interfaces with error handling
- Include comprehensive logging for debugging
- Add health check capabilities where applicable

**Error Handling:**
- Use fail-fast pattern in startup sequence (src/index.ts:51)
- Implement comprehensive error boundaries in Discord event handlers
- Log errors with structured data for debugging
- Provide graceful degradation where possible

## Code Standards

- **TypeScript Configuration**: Strict mode enabled, ES2022 target, CommonJS modules
- **Compilation**: All code compiled to `dist/` directory via `tsc`
- **Type Safety**: Comprehensive interfaces in `src/types/index.ts` with strict null checks
- **Service Architecture**: Modular single-responsibility services with clear separation of concerns
- **Environment Configuration**: All config via environment variables with validation
- **Logging**: Structured logging with operation context for debugging and monitoring

### Architecture Principles
- **Fail-Fast**: Critical dependencies validated at startup with immediate failure
- **Health Monitoring**: Ongoing service health checks and performance monitoring  
- **Cost Efficiency**: Token optimization prioritized without sacrificing response quality
- **Owner Privileges**: Administrative commands and bypass capabilities for bot owner
- **Channel Control**: Whitelist-based access control with configurable restrictions

## Important Implementation Notes

### Token Optimization
The `tokenOptimizer.ts` service is central to cost efficiency. When adding features:
- Consider token impact of new context or memory additions
- Use relevance scoring for context selection (70% relevance + 30% recency weighting)
- Test across all optimization levels (balanced/efficient/economy)
- Monitor cost analytics to ensure savings targets are maintained

### Memory Management  
User memory in `memory.ts` has hard limits to prevent unbounded growth:
- Max 20 personal details per user
- Max 8 recent messages for context
- Max configurable emotional moments
- Automatic cleanup of oldest entries when limits exceeded

### Bot Token Security

The bot expects Discord and Anthropic tokens in environment variables. Never commit tokens to the repository - use .env files that are properly gitignored.