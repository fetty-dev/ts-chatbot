import type { UserMemory, RecentMessage, EmotionalMoment } from '../types';

/**
 * Factory for creating test UserMemory objects
 */
export function createMockUserMemory(overrides: Partial<UserMemory> = {}): UserMemory {
  const baseMemory: UserMemory = {
    userId: '123456789012345678',
    userName: 'TestUser',
    isOwner: false,
    relationshipLevel: 50,
    personalDetails: ['Loves programming', 'Works in tech'],
    emotionalMoments: [],
    recentMessages: [],
    firstMet: new Date('2024-01-01'),
    lastInteraction: new Date(),
    totalInteractions: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  };
  return { ...baseMemory, ...overrides };
}

/**
 * Factory for creating test RecentMessage objects
 */
export function createMockRecentMessage(overrides: Partial<RecentMessage> = {}): RecentMessage {
  const baseMessage: RecentMessage = {
    timestamp: new Date(),
    userMessage: 'Hello there!',
    botResponse: 'Hello! How can I help you today?',
    tokens: 25
  };
  return { ...baseMessage, ...overrides };
}

/**
 * Factory for creating test EmotionalMoment objects
 */
export function createMockEmotionalMoment(overrides: Partial<EmotionalMoment> = {}): EmotionalMoment {
  const baseMoment: EmotionalMoment = {
    timestamp: new Date(),
    type: 'positive',
    summary: 'Had a great conversation',
    intensity: 7
  };
  return { ...baseMoment, ...overrides };
}

/**
 * Create realistic large user memory for performance testing
 */
export function createLargeUserMemory(): UserMemory {
  const personalDetails = Array.from({ length: 20 }, (_, i) => `Personal detail ${i + 1}`);
  const emotionalMoments = Array.from({ length: 10 }, (_, i) => 
    createMockEmotionalMoment({ 
      summary: `Emotional moment ${i + 1}`,
      intensity: Math.floor(Math.random() * 10) + 1
    })
  );
  const recentMessages = Array.from({ length: 8 }, (_, i) =>
    createMockRecentMessage({
      userMessage: `Test message ${i + 1} with some content`,
      botResponse: `Response ${i + 1} with detailed content for testing`,
      tokens: Math.floor(Math.random() * 100) + 50
    })
  );

  return createMockUserMemory({
    personalDetails,
    emotionalMoments,
    recentMessages,
    relationshipLevel: 85,
    totalInteractions: 150
  });
}