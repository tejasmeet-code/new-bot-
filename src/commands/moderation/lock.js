const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Locks the current channel.')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to lock').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false
        });

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription(`🔒 ${channel} has been locked.`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Channel Locked',
            description: `**Channel:** ${channel}\n**Moderator:** ${interaction.user}`,
            color: '#ff0000'
        });
    },
};
