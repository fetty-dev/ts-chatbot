# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Discord bot built with discord.js v14. The project uses a simple, clean architecture with minimal setup - perfect for rapid bot development and prototyping.

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

## Project Architecture

### Core Structure
- `src/index.ts` - Main entry point with basic Discord client setup
- `src/bot/` - Discord client configuration and event handling
- `src/database/` - MongoDB connection and Mongoose models
- `src/services/` - Business logic for Claude integration, memory, and personality
- `src/types/` - TypeScript interfaces for user memory, messages, and configuration
- `src/utils/` - Utilities for logging, validation, and constants

### Key Dependencies
- **discord.js v14** - Discord API wrapper with full typing support
- **mongoose v8** - MongoDB object modeling with schema validation
- **TypeScript v5** - Full type safety with strict mode enabled
- **Jest** - Testing framework with TypeScript support via ts-jest
- **ESLint** - Code linting with TypeScript-specific rules

### Discord.js Setup
The bot is configured with these intents:
- Guilds (server access)
- GuildMessages (message events)
- GuildMembers (member data)
- MessageContent (read message content)
- GuildPresences (user status)

### Database Architecture
Uses MongoDB with Mongoose for user memory persistence:
- `UserMemory` model tracks relationship levels, personal details, and interaction history
- `EmotionalMoment` interface for significant emotional events
- `RecentMessage` interface for conversational context

### Environment Configuration
- Bot token expected in `TOKEN` environment variable
- Uses dotenv for automatic .env file loading
- Database connection string for MongoDB

## Development Workflow

Based on existing documentation in `docs/claude-instructions.md`, follow this pattern:

1. **Research** - Explore codebase and understand existing patterns
2. **Plan** - Create step-by-step implementation plan before coding  
3. **Implement** - Execute with regular checkpoints and validation

For complex features, use the multi-agent strategy to handle different components simultaneously.

### Code Quality Standards
- All tests must pass (`npm test`)
- Code must pass linting without errors (`npm run lint`)
- TypeScript compilation must succeed (`tsc`)
- Clean up unused code and maintain clear structure

## Code Standards

- TypeScript strict mode enabled
- ES2022 target with CommonJS modules
- All code compiled to `dist/` directory
- Environment-based configuration pattern established

## Bot Token Security

The bot expects a Discord token in the `TOKEN` environment variable. Never commit tokens to the repository - use .env files that are properly gitignored.