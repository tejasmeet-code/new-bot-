const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a number of messages.')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        await interaction.channel.bulkDelete(amount, true);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`Successfully deleted **${amount}** messages.`);

        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
        setTimeout(() => reply.delete().catch(() => {}), 5000);

        sendLog(interaction.guild, 'moderation', {
            title: 'Messages Purged',
            description: `**Channel:** ${interaction.channel}\n**Moderator:** ${interaction.user}\n**Amount:** ${amount}`,
            color: '#ff9900'
        });
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('You do not have permission to use this command.');
        const amount = parseInt(args[0], 10);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('Please provide a valid number between 1 and 100.');
        await message.channel.bulkDelete(amount + 1, true).catch(() => {});
        const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`Successfully deleted **${amount}** messages.`);
        const reply = await message.channel.send({ embeds: [embed] });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        sendLog(message.guild, 'moderation', {
            title: 'Messages Purged',
            description: `**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Amount:** ${amount}`,
            color: '#ff9900'
        });
    }
};
