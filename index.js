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

async function init() {
    await loadEvents(client);
    await loadCommands(client);
    
    client.login(process.env.DISCORD_TOKEN);
}

init();
