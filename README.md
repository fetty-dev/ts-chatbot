# TS-Bot: TypeScript Discord Bot with Claude AI Integration

A Discord bot built with TypeScript, featuring Anthropic Claude API integration for intelligent conversations and persistent user memory storage.

## Features

### ✅ Implemented
- **Claude AI Integration**: Full Anthropic Claude API client with modular architecture
- **Database Layer**: MongoDB integration with Mongoose for user memory persistence
- **User Memory System**: Tracks relationships, personal details, and emotional moments
- **Personality System**: "Albedo" chatbot personality with relationship-aware responses
- **Type Safety**: Complete TypeScript interfaces and strict type checking
- **Input Validation**: Environment checks and user input sanitization
- **Token Management**: Usage estimation and daily limits with owner privileges

### 🚧 In Development
- Discord message handling and event processing
- Memory service implementation
- Logging system
- Comprehensive testing suite

## Architecture

```
src/
├── bot/           # Discord client and event handlers (stubs)
├── database/      # MongoDB connection and UserMemory model
├── services/      # Claude API, memory management, personality
├── types/         # TypeScript interfaces for all data structures
└── utils/         # Validation, constants, and utilities
```

## Technology Stack

- **Discord.js v14** - Discord API wrapper with full typing
- **Anthropic Claude API** - AI conversation engine
- **MongoDB + Mongoose** - User data persistence
- **TypeScript 5** - Type-safe development
- **Jest** - Testing framework (configured)

## Configuration

Required environment variables:
- `TOKEN` - Discord bot token
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `MONGODB_URI` - MongoDB connection string
- `OWNER_ID` - Discord ID of bot owner

## Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Database Schema

**UserMemory Model:**
- User identification and relationship tracking (0-100 scale)
- Personal details storage (max 20 items)
- Emotional moments with intensity scoring (1-10)
- Recent message history (max 8 conversations)
- Interaction statistics and timestamps

## Current Status

**Branch: feature/claude-api-integration**
- Claude API client fully implemented and tested
- Modular architecture with separated concerns
- TypeScript compilation clean
- Ready for Discord message handler integration

---

*Built with Claude Code assistance for rapid development and clean architecture*