const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlockdown')
        .setDescription('Unlocks all channels in the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply();
        
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
        let count = 0;
        
        for (const [id, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null
                });
                count++;
            } catch (e) {
                // Ignore channels bot can't edit
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`🔓 Server lockdown lifted. Unlocked **${count}** channels.`);

        await interaction.editReply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Server Lockdown Lifted',
            description: `**Moderator:** ${interaction.user}\n**Channels Affected:** ${count}`,
            color: '#00ff00'
        });
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('You do not have permission to use this command.');
        const reply = await message.reply('Lifting server lockdown...');
        const channels = message.guild.channels.cache.filter(c => c.isTextBased());
        let count = 0;
        for (const [id, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
                count++;
            } catch (e) {
                // Ignore
            }
        }
        const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`🔓 Server lockdown lifted. Unlocked **${count}** channels.`);
        await reply.edit({ content: null, embeds: [embed] });
        sendLog(message.guild, 'moderation', {
            title: 'Server Lockdown Lifted',
            description: `**Moderator:** ${message.author}\n**Channels Affected:** ${count}`,
            color: '#00ff00'
        });
    }
};
