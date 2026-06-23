const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noprefix')
        .setDescription('Manage users who do not need the $ prefix.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Allow a user to bypass the prefix')
                .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Require a user to use the prefix')
                .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');

        if (subcommand === 'add') {
            await supabase.from('user_config').upsert({ user_id: user.id, no_prefix: true });
            
            // Update client cache
            interaction.client.noPrefixUsers.add(user.id);

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ ${user} can now use commands without a prefix.`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            await supabase.from('user_config').delete().eq('user_id', user.id);
            
            // Update client cache
            interaction.client.noPrefixUsers.delete(user.id);

            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`✅ ${user} must now use the prefix.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
};
