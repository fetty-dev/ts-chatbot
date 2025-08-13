// TypeScript type definitions for this project
export interface UserMemory {
    userId: string;
    userName: string;
    isOwner: boolean;
    relationshipLevel: number; // 0-100
    personalDetails: string[];
    emotionalMoments: EmotionalMoment[];
    recentMessages: RecentMessage[];
    firstMet: Date;
    lastInteraction: Date;
    totalInteractions: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmotionalMoment {
    timestamp: Date;
    type: 'positive' | 'negative' | 'significant';
    summary: string;
    intesity: number; // 1-10
}
export interface RecentMessage {
    timestamp: Date;
    userMessage: string;
    botResponse: string;
    tokens: number;
}
export interface DatabaseConfig {
    uri: string;
    options: {
        maxPoolSize: number;
        minPoolSize: number;
        maxIdleTimeMS: number;
        serverSelectionTimeoutMS: number;
        socketTimeoutMS: number;
        retryWrites: boolean;
        w: 'majority';
    };
}
export interface BotConfig {
    ownerId: string;
    maxRecentMessages: number;
    maxEmotionalMoments: number;
    maxPersonalDetails: number;
    dailyTokenLimit: number;
    ownerTokenMultiplier: number;
}