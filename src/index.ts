// Main entry point
import 'dotenv/config';
import { Client } from 'discord.js';
import { connectDatabase } from './database/connection';

async function startBot() {
    await connectDatabase();
    const client = new Client({
        intents: [
            'Guilds',
            'GuildMessages',
            'MessageContent',
            'GuildMembers',
            'GuildPresences',
        ],
    });

    client.on('ready', (c) => {
        console.log(`🤖 ${c.user.username} is online! 🎉`);
    });

    await client.login(process.env.TOKEN);
}

startBot().catch(console.error);