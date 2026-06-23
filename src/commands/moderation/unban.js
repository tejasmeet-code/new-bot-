const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a user from the server.')
        .addStringOption(option => option.setName('userid').setDescription('The ID of the user to unban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the unban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.guild.members.unban(userId, reason);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`Successfully unbanned user with ID **${userId}**.`);

            await interaction.reply({ embeds: [embed] });

            sendLog(interaction.guild, 'moderation', {
                title: 'Member Unbanned',
                description: `**User ID:** ${userId}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
                color: '#00ff00'
            });
        } catch (error) {
            interaction.reply({ content: 'Failed to unban the user. Are you sure the ID is correct and they are banned?', ephemeral: true });
        }
    },
};
