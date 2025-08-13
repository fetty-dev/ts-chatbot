# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Discord bot built with discord.js v14. The project uses a simple, clean architecture with minimal setup - perfect for rapid bot development and prototyping.

## Development Commands

### Essential Scripts
- `npm run dev` - Start development server with hot reload using tsx
- `npm run build` - Compile TypeScript to JavaScript 
- `npm start` - Run the compiled bot from dist/

### TypeScript Commands
- `tsc` - Type check the entire project
- `tsc --watch` - Watch mode for continuous type checking

## Project Architecture

### Core Structure
- `src/index.ts` - Main entry point with basic Discord client setup
- `tsconfig.json` - TypeScript configuration targeting ES2022 with strict mode
- Environment variables loaded via dotenv for bot token

### Discord.js Setup
The bot is configured with these intents:
- Guilds (server access)
- GuildMessages (message events)
- GuildMembers (member data)
- MessageContent (read message content)
- GuildPresences (user status)

### Environment Configuration
- Bot token expected in `TOKEN` environment variable
- Uses dotenv for automatic .env file loading

## Development Workflow

Based on existing documentation in `docs/claude-instructions.md`, follow this pattern:

1. **Research** - Explore codebase and understand existing patterns
2. **Plan** - Create step-by-step implementation plan before coding
3. **Implement** - Execute with regular checkpoints

For complex features, use the multi-agent strategy to handle different components simultaneously.

## Code Standards

- TypeScript strict mode enabled
- ES2022 target with CommonJS modules
- All code compiled to `dist/` directory
- Environment-based configuration pattern established

## Bot Token Security

The bot expects a Discord token in the `TOKEN` environment variable. Never commit tokens to the repository - use .env files that are properly gitignored.