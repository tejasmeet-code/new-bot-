const { Events } = require('discord.js');
const AutoResponse = require('../schemas/AutoResponse');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const content = message.content.toLowerCase();

        // 1. Auto-Responder & Auto-React
        try {
            const responses = await AutoResponse.find({ guildId: message.guild.id });
            for (const ar of responses) {
                let isMatch = false;
                if (ar.matchType === 'exact' && content === ar.trigger) isMatch = true;
                if (ar.matchType === 'includes' && content.includes(ar.trigger)) isMatch = true;

                if (isMatch) {
                    if (ar.reply) {
                        message.channel.send(ar.reply).catch(() => {});
                    }
                    if (ar.react) {
                        message.react(ar.react).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }

        // 2. Prefix & No-Prefix Commands
        const defaultPrefix = '$';
        const isNoPrefixUser = client.noPrefixUsers.has(message.author.id);
        
        let commandName = null;
        let args = [];

        if (message.content.startsWith(defaultPrefix)) {
            const argsArray = message.content.slice(defaultPrefix.length).trim().split(/ +/);
            commandName = argsArray.shift().toLowerCase();
            args = argsArray;
        } else if (isNoPrefixUser) {
            const argsArray = message.content.trim().split(/ +/);
            commandName = argsArray.shift().toLowerCase();
            args = argsArray;
        }

        if (!commandName) return;

        // Try to execute a traditional command if we had a collection for them.
        // For this project, we mainly rely on Slash commands for the core features.
        // If you want prefix commands to work exactly like the slash commands, 
        // you would need to map prefix commands to slash command execution logic.
        // For now, this listens to the prefix and logs it.
        
        // Example simple prefix command response:
        if (commandName === 'ping') {
            return message.reply('Pong!');
        }

    },
};
