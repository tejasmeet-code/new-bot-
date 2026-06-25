const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlocks the current channel.')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to unlock').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: null // Resets to default
        });

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`🔓 ${channel} has been unlocked.`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Channel Unlocked',
            description: `**Channel:** ${channel}\n**Moderator:** ${interaction.user}`,
            color: '#00ff00'
        });
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('You do not have permission to use this command.');
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`🔓 ${channel} has been unlocked.`);
        await message.reply({ embeds: [embed] });
        sendLog(message.guild, 'moderation', {
            title: 'Channel Unlocked',
            description: `**Channel:** ${channel}\n**Moderator:** ${message.author}`,
            color: '#00ff00'
        });
    }
};
