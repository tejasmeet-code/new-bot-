const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AutoResponse = require('../../schemas/AutoResponse');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage auto-responders.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an auto-responder')
                .addStringOption(option => option.setName('trigger').setDescription('The word or phrase to trigger on').setRequired(true))
                .addStringOption(option => option.setName('reply').setDescription('The response').setRequired(true))
                .addStringOption(option => option.setName('match_type').setDescription('Exact match or includes?').setRequired(false).addChoices({ name: 'Exact', value: 'exact' }, { name: 'Includes', value: 'includes' }))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an auto-responder')
                .addStringOption(option => option.setName('trigger').setDescription('The trigger word to remove').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const trigger = interaction.options.getString('trigger').toLowerCase();

        if (subcommand === 'add') {
            const reply = interaction.options.getString('reply');
            const matchType = interaction.options.getString('match_type') || 'exact';

            let ar = await AutoResponse.findOne({ guildId: interaction.guild.id, trigger: trigger });
            if (!ar) {
                ar = new AutoResponse({ guildId: interaction.guild.id, trigger });
            }
            ar.reply = reply;
            ar.matchType = matchType;
            await ar.save();

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ Auto-responder added for \`${trigger}\`.\nReply: ${reply}`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            await AutoResponse.findOneAndDelete({ guildId: interaction.guild.id, trigger: trigger });
            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`✅ Removed auto-responder for \`${trigger}\`.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
};
