const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'That user is not in the server.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'I cannot kick this user! Do they have a higher role?', ephemeral: true });
        }

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setDescription(`**${user.tag}** has been kicked. | ${reason}`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Member Kicked',
            description: `**User:** ${user} (${user.id})\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
            color: '#ff9900'
        });
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('You do not have permission to use this command.');
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply('Please mention a user or provide their ID to kick.');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (!member) return message.reply('That user is not in the server.');
        if (!member.kickable) return message.reply('I cannot kick this user! Do they have a higher role?');
        await member.kick(reason);
        const embed = new EmbedBuilder().setColor('#ff9900').setDescription(`**${target.tag}** has been kicked. | ${reason}`);
        await message.reply({ embeds: [embed] });
        sendLog(message.guild, 'moderation', {
            title: 'Member Kicked',
            description: `**User:** ${target} (${target.id})\n**Moderator:** ${message.author}\n**Reason:** ${reason}`,
            color: '#ff9900'
        });
    }
};
