// MongoDB Schema definition for user memory
import mongoose, { Schema, Document } from 'mongoose';
import { UserMemory, EmotionalMoment, RecentMessage } from '../../types'

const EmotionalMomentSchema = new Schema<EmotionalMoment>({
    timestamp: { type: Date, required: true },
    type: { type: String, enum: ['positive', 'negative', 'significant'], required: true },
    summary: { type: String, required: true },
    intensity: { type: Number, min: 1, max: 10, required: true }
});

const RecentMessageSchema = new Schema<RecentMessage>({
    timestamp: { type: Date, required: true },
    userMessage: { type: String, required: true },
    botResponse: { type: String, required: true },
    tokens: { type: Number, required: true }
});

const UserMemorySchema = new Schema<UserMemory>({
    userId: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    isOwner: { type: Boolean, default: false },
    relationshipLevel: { type: Number, min: 0, max: 100, default: 0 },
    personalDetails: [{ type: String }],
    emotionalMoments: [EmotionalMomentSchema],
    recentMessages: [RecentMessageSchema],
    firstMet: { type: Date, required: true },
    lastInteraction: { type: Date, required: true },
    totalInteractions: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const UserMemoryModel = mongoose.model<UserMemory>('UserMemory', UserMemorySchema);