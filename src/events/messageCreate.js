const { Events, PermissionFlagsBits } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        if (!message.guild) {
            await handleDMApplication(message, client);
            return;
        }

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

        // 2. Prefix & No-Prefix Commands
        const defaultPrefix = '$';
        const isNoPrefixUser = client.noPrefixUsers && client.noPrefixUsers.has(message.author.id);
        const isAdmin = message.member && message.member.permissions.has(PermissionFlagsBits.Administrator);
        const canUseNoPrefix = isNoPrefixUser || isAdmin;
        
        let commandName = null;
        let args = [];

        if (message.content.startsWith(defaultPrefix)) {
            const argsArray = message.content.slice(defaultPrefix.length).trim().split(/ +/);
            commandName = argsArray.shift().toLowerCase();
            args = argsArray;
        } else if (canUseNoPrefix) {
            const argsArray = message.content.trim().split(/ +/);
            commandName = argsArray.shift().toLowerCase();
            args = argsArray;
        }

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
                            let emojiToReact = ar.react;
                            const customEmojiMatch = emojiToReact.match(/<a?:[a-zA-Z0-9_]+:(\d+)>/);
                            if (customEmojiMatch) {
                                emojiToReact = customEmojiMatch[1];
                            }
                            message.react(emojiToReact).catch((err) => { console.error('Reaction Error:', err); });
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    },
};

async function handleDMApplication(message, client) {
    if (!client.appSessions || !client.appSessions.has(message.author.id)) return;

    const session = client.appSessions.get(message.author.id);
    const applicationQuestions = require('../utils/applicationQuestions');

    // Save answer
    session.answers.push(message.content);
    session.step++;

    if (session.step < applicationQuestions.length) {
        // Ask next question
        await message.author.send(`**Question ${session.step + 1}:**\n${applicationQuestions[session.step]}`);
    } else {
        // Finish application
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        await message.author.send('Thank you for your application! Our staff team will review it shortly. Good luck! 🚀');
        
        client.appSessions.delete(message.author.id);

        try {
            const { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', session.guildId).single();
            if (!config || !config.staff_app_channel_id) return;

            const guild = client.guilds.cache.get(session.guildId) || await client.guilds.fetch(session.guildId).catch(() => null);
            if (!guild) return;

            const approvalChannel = guild.channels.cache.get(config.staff_app_channel_id) || await guild.channels.fetch(config.staff_app_channel_id).catch(() => null);
            if (!approvalChannel) return;

            const embed = new EmbedBuilder()
                .setTitle(`Staff Application - ${message.author.tag}`)
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setColor('#ffa500')
                .setFooter({ text: `User ID: ${message.author.id}` })
                .setTimestamp();

            for (let i = 0; i < applicationQuestions.length; i++) {
                let answer = session.answers[i];
                if (answer.length > 1024) answer = answer.substring(0, 1020) + '...';
                embed.addFields({ name: `Q${i+1}: ${applicationQuestions[i]}`, value: answer });
            }

            const approveBtn = new ButtonBuilder()
                .setCustomId(`approve_app_${message.author.id}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success);

            const rejectBtn = new ButtonBuilder()
                .setCustomId(`reject_app_${message.author.id}`)
                .setLabel('Reject')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

            await approvalChannel.send({ embeds: [embed], components: [row] });
        } catch (e) {
            console.error('Error processing finished application:', e);
        }
    }
}
