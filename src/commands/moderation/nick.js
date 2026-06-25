const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Changes the nickname of a user.')
        .addUserOption(option => option.setName('user').setDescription('The user to nickname').setRequired(true))
        .addStringOption(option => option.setName('nickname').setDescription('The new nickname (leave blank to reset)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .setDMPermission(false),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname') || '';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'That user is not in the server.', ephemeral: true });
        if (!member.manageable) return interaction.reply({ content: 'I cannot change this user\'s nickname!', ephemeral: true });

        const oldNick = member.nickname || user.username;
        await member.setNickname(nickname);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`Successfully changed **${user.tag}**'s nickname to **${nickname || user.username}**.`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Nickname Changed',
            description: `**User:** ${user}\n**Moderator:** ${interaction.user}\n**Old:** ${oldNick}\n**New:** ${nickname || user.username}`,
            color: '#00ff00'
        });
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return message.reply('You do not have permission to use this command.');
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply('Please mention a user or provide their ID.');
        const nickname = args.slice(1).join(' ') || '';
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (!member) return message.reply('That user is not in the server.');
        if (!member.manageable) return message.reply('I cannot change this user\'s nickname!');
        const oldNick = member.nickname || target.username;
        await member.setNickname(nickname);
        const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`Successfully changed **${target.tag}**'s nickname to **${nickname || target.username}**.`);
        await message.reply({ embeds: [embed] });
        sendLog(message.guild, 'moderation', {
            title: 'Nickname Changed',
            description: `**User:** ${target}\n**Moderator:** ${message.author}\n**Old:** ${oldNick}\n**New:** ${nickname || target.username}`,
            color: '#00ff00'
        });
    }
};
