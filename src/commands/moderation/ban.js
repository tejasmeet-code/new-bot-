const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member && !member.bannable) {
            return interaction.reply({ content: 'I cannot ban this user! Do they have a higher role?', ephemeral: true });
        }

        await interaction.guild.members.ban(user.id, { reason });

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription(`**${user.tag}** has been banned. | ${reason}`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Member Banned',
            description: `**User:** ${user} (${user.id})\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
            color: '#ff0000'
        });
    },
};
