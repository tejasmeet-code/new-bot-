const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../../utils/logger');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes (timeouts) a member in the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 10m, 1h, 1d)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the mute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: '<:failure:1517469374594945134> That user is not in the server.', ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: '<:failure:1517469374594945134> I cannot mute this user! Do they have a higher role?', ephemeral: true });
        }

        const durationMs = ms(durationInput);
        if (!durationMs || durationMs < 10000 || durationMs > 2419200000) { // Discord max timeout is 28 days
            return interaction.reply({ content: '<:failure:1517469374594945134> Invalid duration. Please provide a valid duration between 10 seconds and 28 days (e.g. 10m, 1h, 1d).', ephemeral: true });
        }

        const dmEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('<:automod:1517468917755412634> You have been Muted')
            .setDescription(`You have been muted in **${interaction.guild.name}** for **${ms(durationMs, { long: true })}**.\n**Reason:** ${reason}`);
        await user.send({ embeds: [dmEmbed] }).catch(() => null);

        await member.timeout(durationMs, reason);

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setDescription(`<:tick:1517479233784643634> **${user.tag}** has been muted for **${ms(durationMs, { long: true })}**. | ${reason}`);

        await interaction.reply({ embeds: [embed] });

        sendLog(interaction.guild, 'moderation', {
            title: 'Member Muted',
            description: `**User:** ${user} (${user.id})\n**Moderator:** ${interaction.user}\n**Duration:** ${ms(durationMs, { long: true })}\n**Reason:** ${reason}`,
            color: '#ff9900'
        });
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('<:failure:1517469374594945134> You do not have permission to use this command.');
        }

        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply('<:failure:1517469374594945134> Please mention a user or provide their ID to mute.');

        const durationInput = args[1];
        if (!durationInput) return message.reply('<:failure:1517469374594945134> Please specify a duration (e.g., 10m, 1h, 1d).');

        const reason = args.slice(2).join(' ') || 'No reason provided';
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        
        if (!member) return message.reply('<:failure:1517469374594945134> That user is not in the server.');
        if (!member.moderatable) return message.reply('<:failure:1517469374594945134> I cannot mute this user! Do they have a higher role?');

        const durationMs = ms(durationInput);
        if (!durationMs || durationMs < 10000 || durationMs > 2419200000) {
            return message.reply('<:failure:1517469374594945134> Invalid duration. Please provide a valid duration between 10 seconds and 28 days (e.g. 10m, 1h, 1d).');
        }

        const dmEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('<:automod:1517468917755412634> You have been Muted')
            .setDescription(`You have been muted in **${message.guild.name}** for **${ms(durationMs, { long: true })}**.\n**Reason:** ${reason}`);
        await target.send({ embeds: [dmEmbed] }).catch(() => null);

        await member.timeout(durationMs, reason);

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setDescription(`<:tick:1517479233784643634> **${target.tag}** has been muted for **${ms(durationMs, { long: true })}**. | ${reason}`);
        
        await message.reply({ embeds: [embed] });

        sendLog(message.guild, 'moderation', {
            title: 'Member Muted',
            description: `**User:** ${target} (${target.id})\n**Moderator:** ${message.author}\n**Duration:** ${ms(durationMs, { long: true })}\n**Reason:** ${reason}`,
            color: '#ff9900'
        });
    }
};
