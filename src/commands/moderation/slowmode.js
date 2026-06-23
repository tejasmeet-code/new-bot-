const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Sets the slowmode for a channel.')
        .addIntegerOption(option => option.setName('seconds').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .addChannelOption(option => option.setName('channel').setDescription('The channel to modify').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const seconds = interaction.options.getInteger('seconds');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        await channel.setRateLimitPerUser(seconds);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`Slowmode for ${channel} has been set to **${seconds}** seconds.`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Slowmode Changed',
            description: `**Channel:** ${channel}\n**Moderator:** ${interaction.user}\n**Duration:** ${seconds} seconds`,
            color: '#ffff00'
        });
    },
};
