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

        const dmEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:ban:1517488765810114560> You have been Banned')
            .setDescription(`You have been banned from **${interaction.guild.name}**.\n**Reason:** ${reason}`);
        await user.send({ embeds: [dmEmbed] }).catch(() => null);

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
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('You do not have permission to use this command.');
        const targetId = args[0] ? args[0].replace(/[<@!>]/g, '') : null;
        const target = message.mentions.users.first() || (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);
        if (!target) return message.reply('Please mention a user or provide their ID to ban.');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (member && !member.bannable) return message.reply('I cannot ban this user! Do they have a higher role?');
        const dmEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:ban:1517488765810114560> You have been Banned')
            .setDescription(`You have been banned from **${message.guild.name}**.\n**Reason:** ${reason}`);
        await target.send({ embeds: [dmEmbed] }).catch(() => null);

        await message.guild.members.ban(target.id, { reason });
        const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`**${target.tag}** has been banned. | ${reason}`);
        await message.reply({ embeds: [embed] });
        sendLog(message.guild, 'moderation', {
            title: 'Member Banned',
            description: `**User:** ${target} (${target.id})\n**Moderator:** ${message.author}\n**Reason:** ${reason}`,
            color: '#ff0000'
        });
    }
};
