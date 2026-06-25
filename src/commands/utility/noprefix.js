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

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`<:tick:1517479233784643634> ${user} can now use commands without a prefix.`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            await supabase.from('user_config').delete().eq('user_id', user.id);
            
            // Update client cache
            interaction.client.noPrefixUsers.delete(user.id);

            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`<:tick:1517479233784643634> ${user} must now use the prefix.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('You do not have permission to use this command.');
        const subcommand = args[0]?.toLowerCase();
        if (!['add', 'remove'].includes(subcommand)) return message.reply('Please specify a subcommand: `add` or `remove`.');
        
        const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
        if (!user) return message.reply('Please mention a user.');

        if (subcommand === 'add') {
            await supabase.from('user_config').upsert({ user_id: user.id, no_prefix: true });
            message.client.noPrefixUsers.add(user.id);
            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`<:tick:1517479233784643634> ${user} can now use commands without a prefix.`);
            await message.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            await supabase.from('user_config').delete().eq('user_id', user.id);
            message.client.noPrefixUsers.delete(user.id);
            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`<:tick:1517479233784643634> ${user} must now use the prefix.`);
            await message.reply({ embeds: [embed] });
        }
    }
};
