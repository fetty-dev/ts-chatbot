import { createMockUserMemory, createMockRecentMessage, createMockEmotionalMoment } from '../../__tests__/factories';
import { setupTestEnv, cleanupTestEnv } from '../../__tests__/helpers';
import type { UserMemory } from '../../types';
import type { Document } from 'mongoose';

// Create a comprehensive mock for the UserMemory model
const mockUserMemoryModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
  prototype: {
    save: jest.fn()
  }
};

// Setup mock constructor function
const MockUserMemoryConstructor = jest.fn().mockImplementation((data) => ({
  ...data,
  save: jest.fn().mockResolvedValue(data)
}));

// Mock the UserMemory model
jest.mock('../../database/models/userMemory', () => ({
  UserMemoryModel: MockUserMemoryConstructor
}));

// Add static methods to the constructor
Object.assign(MockUserMemoryConstructor, mockUserMemoryModel);

import {
  getOrCreateUserMemory,
  getUserMemory,
  createUserMemory,
  updateUserMemory,
  addRecentMessage,
  addPersonalDetail,
  updateRelationshipLevel,
  addEmotionalMoment
} from '../memory';

describe('MemoryService', () => {
  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
    
    // Reset mock implementations
    MockUserMemoryConstructor.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    MockUserMemoryConstructor.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe('getUserMemory', () => {
    test('retrieves existing user memory by ID', async () => {
      const existingMemory = createMockUserMemory();
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingMemory)
      });

      const result = await getUserMemory('123456789012345678');

      expect(MockUserMemoryConstructor.findOne).toHaveBeenCalledWith({ userId: '123456789012345678' });
      expect(result).toEqual(existingMemory);
    });

    test('returns null when user not found', async () => {
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await getUserMemory('999888777666555444');

      expect(result).toBeNull();
    });

    test('validates user ID format', async () => {
      await expect(getUserMemory('invalid')).rejects.toThrow('Invalid user ID format');
    });
  });

  describe('createUserMemory', () => {
    test('creates new user memory with default values', async () => {
      const newMemory = createMockUserMemory({ userId: '999888777666555444', userName: 'NewUser' });
      MockUserMemoryConstructor.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(newMemory)
      }));

      const result = await createUserMemory('999888777666555444', 'NewUser');

      expect(MockUserMemoryConstructor).toHaveBeenCalledWith(expect.objectContaining({
        userId: '999888777666555444',
        userName: 'NewUser',
        relationshipLevel: 0,
        personalDetails: [],
        emotionalMoments: [],
        recentMessages: [],
        totalInteractions: 1
      }));
    });

    test('validates user ID format', async () => {
      await expect(createUserMemory('invalid', 'TestUser')).rejects.toThrow('Invalid user ID format');
    });

    test('validates username format', async () => {
      await expect(createUserMemory('123456789012345678', '')).rejects.toThrow('Invalid username format');
    });
  });

  describe('updateUserMemory', () => {
    test('updates existing user memory with partial data', async () => {
      const updatedMemory = createMockUserMemory({ relationshipLevel: 75 });
      MockUserMemoryConstructor.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedMemory)
      });

      const result = await updateUserMemory('123456789012345678', { relationshipLevel: 75 });

      expect(MockUserMemoryConstructor.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: '123456789012345678' },
        expect.objectContaining({ relationshipLevel: 75, updatedAt: expect.any(Date) }),
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedMemory);
    });

    test('returns null when user not found', async () => {
      MockUserMemoryConstructor.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await updateUserMemory('999888777666555444', { relationshipLevel: 50 });

      expect(result).toBeNull();
    });

    test('validates user ID format', async () => {
      await expect(updateUserMemory('invalid', { relationshipLevel: 50 })).rejects.toThrow('Invalid user ID format');
    });
  });

  describe('getOrCreateUserMemory', () => {
    test('retrieves existing user memory', async () => {
      const existingMemory = createMockUserMemory();
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingMemory)
      });

      const result = await getOrCreateUserMemory('123456789012345678', 'TestUser');

      expect(result).toEqual(existingMemory);
    });

    test('creates new user memory when user not found', async () => {
      const newMemory = createMockUserMemory({ userId: '999888777666555444' });
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });
      MockUserMemoryConstructor.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(newMemory)
      }));

      const result = await getOrCreateUserMemory('999888777666555444', 'NewUser');

      expect(MockUserMemoryConstructor).toHaveBeenCalledWith(expect.objectContaining({
        userId: '999888777666555444',
        userName: 'NewUser'
      }));
    });

    test('validates user ID format', async () => {
      await expect(getOrCreateUserMemory('invalid', 'TestUser')).rejects.toThrow('Invalid user ID format');
    });
  });

  describe('addRecentMessage', () => {
    test('adds message to recent messages list', async () => {
      const userMemory = createMockUserMemory() as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addRecentMessage('123456789012345678', 'Hello there!', 'Hi! How can I help?', 25);

      expect(userMemory.recentMessages).toHaveLength(1);
      expect(userMemory.recentMessages[0]).toMatchObject({
        userMessage: 'Hello there!',
        botResponse: 'Hi! How can I help?',
        tokens: 25,
        timestamp: expect.any(Date)
      });
      expect(userMemory.save).toHaveBeenCalled();
    });

    test('maintains rolling window of 8 messages', async () => {
      const existingMessages = Array.from({ length: 8 }, (_, i) =>
        createMockRecentMessage({ userMessage: `Message ${i}` })
      );
      const userMemory = createMockUserMemory({ recentMessages: existingMessages }) as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addRecentMessage('123456789012345678', 'New message', 'New response', 50);

      expect(userMemory.recentMessages).toHaveLength(8);
      expect(userMemory.recentMessages[0].userMessage).toBe('New message');
      expect(userMemory.recentMessages[7].userMessage).toBe('Message 0'); // Last one kept after shift
    });

    test('truncates long messages to prevent bloat', async () => {
      const userMemory = createMockUserMemory() as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      const longMessage = 'a'.repeat(3000);
      const longResponse = 'b'.repeat(3000);

      await addRecentMessage('123456789012345678', longMessage, longResponse, 100);

      expect(userMemory.recentMessages[0].userMessage.length).toBeLessThanOrEqual(2000);
      expect(userMemory.recentMessages[0].botResponse.length).toBeLessThanOrEqual(2000);
    });

    test('updates interaction tracking', async () => {
      const userMemory = createMockUserMemory({ totalInteractions: 5 }) as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addRecentMessage('123456789012345678', 'Test', 'Response', 20);

      expect(userMemory.totalInteractions).toBe(6);
      expect(userMemory.lastInteraction).toEqual(expect.any(Date));
    });

    test('throws error when user memory not found', async () => {
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(addRecentMessage('999888777666555444', 'Test', 'Response', 20))
        .rejects.toThrow('User memory not found');
    });
  });

  describe('addPersonalDetail', () => {
    test('adds new personal detail', async () => {
      const userMemory = createMockUserMemory({ personalDetails: ['Existing detail'] }) as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addPersonalDetail('123456789012345678', 'New personal detail');

      expect(userMemory.personalDetails).toContain('New personal detail');
      expect(userMemory.personalDetails).toHaveLength(2);
      expect(userMemory.save).toHaveBeenCalled();
    });

    test('prevents duplicate personal details', async () => {
      const userMemory = createMockUserMemory({ personalDetails: ['Loves programming'] }) as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addPersonalDetail('123456789012345678', 'Loves programming');

      expect(userMemory.personalDetails).toHaveLength(1);
      expect(userMemory.personalDetails[0]).toBe('Loves programming');
      expect(userMemory.save).not.toHaveBeenCalled(); // Should not save duplicates
    });

    test('maintains limit of 20 personal details', async () => {
      const twentyDetails = Array.from({ length: 20 }, (_, i) => `Detail ${i}`);
      const userMemory = createMockUserMemory({ personalDetails: twentyDetails }) as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addPersonalDetail('123456789012345678', 'New detail');

      expect(userMemory.personalDetails).toHaveLength(20);
      expect(userMemory.personalDetails[0]).toBe('New detail');
      expect(userMemory.personalDetails).not.toContain('Detail 19'); // Last one removed after unshift
    });

    test('truncates very long personal details', async () => {
      const userMemory = createMockUserMemory() as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      const longDetail = 'a'.repeat(1000);

      await addPersonalDetail('123456789012345678', longDetail);

      expect(userMemory.personalDetails[0].length).toBeLessThanOrEqual(200); // Should truncate to MAX_PERSONAL_DETAIL_LENGTH
    });

    test('throws error when user memory not found', async () => {
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(addPersonalDetail('999888777666555444', 'Detail'))
        .rejects.toThrow('User memory not found');
    });
  });

  describe('addEmotionalMoment', () => {
    test('adds emotional moment with valid intensity', async () => {
      const userMemory = createMockUserMemory() as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      const moment = { type: 'positive' as const, summary: 'Got a promotion', intensity: 8 };

      await addEmotionalMoment('123456789012345678', moment);

      expect(userMemory.emotionalMoments).toHaveLength(1);
      expect(userMemory.emotionalMoments[0]).toMatchObject({
        type: 'positive',
        summary: 'Got a promotion',
        intensity: 8,
        timestamp: expect.any(Date)
      });
      expect(userMemory.save).toHaveBeenCalled();
    });

    test('maintains chronological order of emotional moments', async () => {
      const userMemory = createMockUserMemory() as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addEmotionalMoment('123456789012345678', { type: 'positive', summary: 'First moment', intensity: 5 });
      await addEmotionalMoment('123456789012345678', { type: 'negative', summary: 'Second moment', intensity: 3 });

      expect(userMemory.emotionalMoments).toHaveLength(2);
      expect(userMemory.emotionalMoments[0].summary).toBe('Second moment'); // Most recent first
      expect(userMemory.emotionalMoments[1].summary).toBe('First moment');
    });

    test('maintains rolling window of emotional moments', async () => {
      const existingMoments = Array.from({ length: 15 }, (_, i) =>
        createMockEmotionalMoment({ summary: `Moment ${i}` })
      );
      const userMemory = createMockUserMemory({ emotionalMoments: existingMoments }) as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      await addEmotionalMoment('123456789012345678', { type: 'positive', summary: 'New moment', intensity: 7 });

      expect(userMemory.emotionalMoments).toHaveLength(15); // BOT_CONFIG.maxEmotionalMoments
      expect(userMemory.emotionalMoments[0].summary).toBe('New moment');
    });

    test('truncates long emotional summaries', async () => {
      const userMemory = createMockUserMemory() as UserMemory & Document;
      userMemory.save = jest.fn().mockResolvedValue(userMemory);
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMemory)
      });

      const longSummary = 'a'.repeat(500);

      await addEmotionalMoment('123456789012345678', { type: 'positive', summary: longSummary, intensity: 5 });

      expect(userMemory.emotionalMoments[0].summary.length).toBeLessThanOrEqual(300); // MAX_EMOTIONAL_SUMMARY_LENGTH
    });

    test('throws error when user memory not found', async () => {
      MockUserMemoryConstructor.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(addEmotionalMoment('999888777666555444', { type: 'positive', summary: 'Test', intensity: 5 }))
        .rejects.toThrow('User memory not found');
    });
  });

  describe('updateRelationshipLevel', () => {
    test('updates relationship level within valid range', async () => {
      MockUserMemoryConstructor.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(createMockUserMemory({ relationshipLevel: 75 }))
      });

      await updateRelationshipLevel('123456789012345678', 75);

      expect(MockUserMemoryConstructor.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: '123456789012345678' },
        expect.objectContaining({ relationshipLevel: 75 }),
        expect.anything()
      );
    });

    test('validates relationship level range', async () => {
      await expect(updateRelationshipLevel('123456789012345678', 150))
        .rejects.toThrow('Relationship level must be between 0 and 100');

      await expect(updateRelationshipLevel('123456789012345678', -10))
        .rejects.toThrow('Relationship level must be between 0 and 100');
    });

    test('handles boundary values correctly', async () => {
      MockUserMemoryConstructor.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(createMockUserMemory())
      });

      await updateRelationshipLevel('123456789012345678', 0);
      await updateRelationshipLevel('123456789012345678', 100);

      expect(MockUserMemoryConstructor.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });
  });
});