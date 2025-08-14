// MongoDB connection setup
import mongoose from 'mongoose';
import { DATABASE_CONFIG } from '../utils/constants';

export async function connectDatabase(): Promise<void> {
    try {
        await mongoose.connect(DATABASE_CONFIG.uri, DATABASE_CONFIG.options);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

export async function disconnectDatabase(): Promise<void> {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
}