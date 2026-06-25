const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const ROLE_1_ID = '1121825738111336528';
const ROLE_2_ID = '1121825728741244938';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hired')
        .setDescription('Hire a user (grants specific roles).')
        .addUserOption(option => option.setName('user').setDescription('The user to hire').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '<:failure:1517469374594945134> Could not find that user in the server.', ephemeral: true });
        }

        try {
            await targetMember.roles.add([ROLE_1_ID, ROLE_2_ID]);

            const dmEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('<:giveaway:1517478245233201242> Congratulations!')
                .setDescription(`You have been officially hired in **${interaction.guild.name}**!\nWelcome to the team!`);
            await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`<:tick:1517479233784643634> Successfully hired ${targetUser} and granted the roles.`);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to add roles:', error);
            await interaction.reply({ content: '<:failure:1517469374594945134> Failed to add roles. Please check my permissions and role hierarchy.', ephemeral: true });
        }
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('<:failure:1517469374594945134> You do not have permission to use this command.');
        }

        const targetArg = args[0];
        if (!targetArg) {
            return message.reply('<:failure:1517469374594945134> Please specify a user to hire.');
        }

        const targetId = targetArg.replace(/[<@!>]/g, '');
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);

        if (!targetMember) {
            return message.reply('<:failure:1517469374594945134> Could not find that user in the server.');
        }

        try {
            await targetMember.roles.add([ROLE_1_ID, ROLE_2_ID]);

            const dmEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('<:giveaway:1517478245233201242> Congratulations!')
                .setDescription(`You have been officially hired in **${message.guild.name}**!\nWelcome to the team!`);
            await targetMember.user.send({ embeds: [dmEmbed] }).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`<:tick:1517479233784643634> Successfully hired ${targetMember.user} and granted the roles.`);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to add roles:', error);
            await message.reply('<:failure:1517469374594945134> Failed to add roles. Please check my permissions and role hierarchy.');
        }
    }
};
