require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadEvents } = require('./src/handlers/eventHandler');
const { loadCommands } = require('./src/handlers/commandHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();
client.aliases = new Collection(); // For prefix commands if needed
client.noPrefixUsers = new Set(); // Cache for no-prefix users

const http = require('http');

async function init() {
    await loadEvents(client);
    await loadCommands(client);
    
    client.login(process.env.DISCORD_TOKEN);
}

// Dummy HTTP server for Render's port binding requirement
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
}).listen(port, () => {
    console.log(`Dummy server listening on port ${port} for Render.`);
});

init();
