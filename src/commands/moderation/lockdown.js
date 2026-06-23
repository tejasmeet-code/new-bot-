const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Locks all channels in the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply();
        
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
        let count = 0;
        
        for (const [id, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false
                });
                count++;
            } catch (e) {
                // Ignore channels bot can't edit
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription(`🔒 Server lockdown initiated. Locked **${count}** channels.`);

        await interaction.editReply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Server Lockdown Initiated',
            description: `**Moderator:** ${interaction.user}\n**Channels Affected:** ${count}`,
            color: '#ff0000'
        });
    },
};
