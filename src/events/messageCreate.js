const { Events } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const content = message.content.toLowerCase();
        const guildId = message.guild.id;

        // 1. AFK Checks
        if (!client.afkUsers) client.afkUsers = new Map();

        // Check if author was AFK
        if (client.afkUsers.has(message.author.id)) {
            client.afkUsers.delete(message.author.id);
            await supabase.from('afk_users').delete().eq('user_id', message.author.id);
            message.reply(`Welcome back ${message.author}! I've removed your AFK status.`).catch(() => {});

            try {
                if (message.member && message.member.manageable && message.member.displayName.startsWith('[AFK]')) {
                    await message.member.setNickname(message.member.displayName.replace('[AFK]', ''));
                }
            } catch (e) {
                console.error('Failed to restore nickname:', e);
            }
        }

        // Check if mentioned users are AFK
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                if (client.afkUsers.has(user.id)) {
                    const afkData = client.afkUsers.get(user.id);
                    message.reply(`**${user.username}** is currently AFK: ${afkData.reason}`).catch(() => {});
                }
            });
        }

        // 2. Prefix-less Commands
        const defaultPrefix = '$';
        let messageContent = message.content.trim();
        if (messageContent.startsWith(defaultPrefix)) {
            messageContent = messageContent.slice(defaultPrefix.length).trim();
        }

        const argsArray = messageContent.split(/ +/);
        const commandName = argsArray.shift().toLowerCase();
        const args = argsArray;

        if (commandName) {
            if (commandName === 'ping') {
                return message.reply('Pong!');
            }

            const command = client.commands.get(commandName);
            if (command && typeof command.executeText === 'function') {
                try {
                    await command.executeText(message, args);
                } catch (error) {
                    console.error(`Error executing ${commandName} via text:`, error);
                    message.reply('There was an error trying to execute that command.').catch(() => {});
                }
                return; // Stop processing further if it was a command
            }
        }

        // 3. Auto-Responder & Auto-React
        try {
            const responses = client.autoResponses?.get(guildId) || [];
            if (responses.length > 0) {
                for (const ar of responses) {
                    let isMatch = false;
                    if (ar.match_type === 'exact' && content === ar.trigger) isMatch = true;
                    if (ar.match_type === 'includes' && content.includes(ar.trigger)) isMatch = true;
                    if (ar.match_type === 'user' && message.author.id === ar.trigger) isMatch = true;
                    if (ar.match_type === 'channel' && message.channel.id === ar.trigger) isMatch = true;

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
    },
};
