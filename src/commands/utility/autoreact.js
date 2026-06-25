const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../../database/supabase');

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
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const emoji = interaction.options.getString('emoji');
            const matchType = interaction.options.getString('match_type') || 'exact';

            const { data: ar } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger).single();
            
            if (!ar) {
                await supabase.from('auto_responses').insert([{ guild_id: guildId, trigger, react: emoji, match_type: matchType }]);
            } else {
                await supabase.from('auto_responses').update({ react: emoji, match_type: matchType }).eq('id', ar.id);
            }

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ Auto-reaction added for \`${trigger}\` with ${emoji}.`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            const { data: ar } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger).single();
            if (ar) {
                if (!ar.reply) {
                    await supabase.from('auto_responses').delete().eq('id', ar.id);
                } else {
                    await supabase.from('auto_responses').update({ react: null }).eq('id', ar.id);
                }
            }
            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`✅ Removed auto-reaction for \`${trigger}\`.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('You do not have permission to use this command.');
        const subcommand = args[0]?.toLowerCase();
        if (!['add', 'remove'].includes(subcommand)) return message.reply('Please specify a subcommand: `add` or `remove`.');

        const trigger = args[1]?.toLowerCase();
        if (!trigger) return message.reply('Please specify a trigger word.');
        const guildId = message.guild.id;

        if (subcommand === 'add') {
            const emoji = args[2];
            if (!emoji) return message.reply('Please specify an emoji.');
            const matchType = args[3]?.toLowerCase() === 'includes' ? 'includes' : 'exact';

            const { data: ar } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger).single();
            if (!ar) {
                await supabase.from('auto_responses').insert([{ guild_id: guildId, trigger, react: emoji, match_type: matchType }]);
            } else {
                await supabase.from('auto_responses').update({ react: emoji, match_type: matchType }).eq('id', ar.id);
            }
            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ Auto-reaction added for \`${trigger}\` with ${emoji}.`);
            await message.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            const { data: ar } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger).single();
            if (ar) {
                if (!ar.reply) {
                    await supabase.from('auto_responses').delete().eq('id', ar.id);
                } else {
                    await supabase.from('auto_responses').update({ react: null }).eq('id', ar.id);
                }
            }
            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`✅ Removed auto-reaction for \`${trigger}\`.`);
            await message.reply({ embeds: [embed] });
        }
    }
};
