### Project Structure Skeleton
```
└── 📁ts-bot
    └── 📁.github
    └── 📁docs
        ├── claude-instructions.md
    └── 📁src
        └── 📁bot
            └── 📁events
                ├── messageCreate.ts
            ├── client.ts
        └── 📁database
            └── 📁models
                ├── userMemory.ts
            ├── connection.ts
        └── 📁services
            ├── claude.ts
            ├── memory.ts
            ├── personality.ts
        └── 📁types
            ├── index.ts
        └── 📁utils
            ├── constants.ts
            ├── logger.ts
            ├── validation.ts
        ├── index.ts
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── CLAUDE.md
    ├── package-lock.json
    ├── package.json
    ├── README.md
    └── tsconfig.json
```