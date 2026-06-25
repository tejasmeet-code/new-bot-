const { Events } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const content = message.content.toLowerCase();
        const guildId = message.guild.id;

        // 1. Auto-Responder & Auto-React
        try {
            const { data: responses } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId);
            if (responses) {
                for (const ar of responses) {
                    let isMatch = false;
                    if (ar.match_type === 'exact' && content === ar.trigger) isMatch = true;
                    if (ar.match_type === 'includes' && content.includes(ar.trigger)) isMatch = true;

                    if (isMatch) {
                        if (ar.reply) {
                            message.channel.send(ar.reply).catch(() => {});
                        }
                        if (ar.react) {
                            message.react(ar.react).catch(() => {});
                        }
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
        
        if (commandName === 'ping') {
            return message.reply('Pong!');
        }

        const command = client.commands.get(commandName);
        if (!command) return;

        // Check if the command supports text execution
        if (typeof command.executeText === 'function') {
            try {
                await command.executeText(message, args);
            } catch (error) {
                console.error(`Error executing ${commandName} via text:`, error);
                message.reply('There was an error trying to execute that command.').catch(() => {});
            }
        }
    },
};
