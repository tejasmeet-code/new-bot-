const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AutoResponse = require('../../schemas/AutoResponse');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreact')
        .setDescription('Manage auto-reactions.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an auto-reaction')
                .addStringOption(option => option.setName('trigger').setDescription('The word or phrase to trigger on').setRequired(true))
                .addStringOption(option => option.setName('emoji').setDescription('The emoji to react with').setRequired(true))
                .addStringOption(option => option.setName('match_type').setDescription('Exact match or includes?').setRequired(false).addChoices({ name: 'Exact', value: 'exact' }, { name: 'Includes', value: 'includes' }))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an auto-reaction')
                .addStringOption(option => option.setName('trigger').setDescription('The trigger word to remove').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const trigger = interaction.options.getString('trigger').toLowerCase();

        if (subcommand === 'add') {
            const emoji = interaction.options.getString('emoji');
            const matchType = interaction.options.getString('match_type') || 'exact';

            let ar = await AutoResponse.findOne({ guildId: interaction.guild.id, trigger: trigger });
            if (!ar) {
                ar = new AutoResponse({ guildId: interaction.guild.id, trigger });
            }
            ar.react = emoji;
            ar.matchType = matchType;
            await ar.save();

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ Auto-reaction added for \`${trigger}\` with ${emoji}.`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            const ar = await AutoResponse.findOne({ guildId: interaction.guild.id, trigger: trigger });
            if (ar) {
                ar.react = null;
                if (!ar.reply) {
                    await AutoResponse.deleteOne({ _id: ar._id });
                } else {
                    await ar.save();
                }
            }
            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`✅ Removed auto-reaction for \`${trigger}\`.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
};
