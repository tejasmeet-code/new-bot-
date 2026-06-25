const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../../database/supabase');

function updateCache(client, guildId, newResponses) {
    if (!client.autoResponses) client.autoResponses = new Map();
    client.autoResponses.set(guildId, newResponses);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreact')
        .setDescription('Manage auto-reactions.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add_text')
                .setDescription('React to a word/phrase')
                .addStringOption(option => option.setName('trigger').setDescription('The word or phrase').setRequired(true))
                .addStringOption(option => option.setName('emoji').setDescription('The emoji').setRequired(true))
                .addStringOption(option => option.setName('match_type').setDescription('Exact or includes?').setRequired(false).addChoices({ name: 'Exact', value: 'exact' }, { name: 'Includes', value: 'includes' }))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add_user')
                .setDescription('React to a user')
                .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
                .addStringOption(option => option.setName('emoji').setDescription('The emoji').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add_channel')
                .setDescription('React to a channel')
                .addChannelOption(option => option.setName('channel').setDescription('The channel').setRequired(true))
                .addStringOption(option => option.setName('emoji').setDescription('The emoji').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an auto-reaction')
                .addStringOption(option => option.setName('trigger_or_id').setDescription('The trigger word, user ID, or channel ID').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand.startsWith('add_')) {
            let trigger, matchType, displayTrigger;
            const emoji = interaction.options.getString('emoji');

            if (subcommand === 'add_text') {
                trigger = interaction.options.getString('trigger').toLowerCase();
                matchType = interaction.options.getString('match_type') || 'exact';
                displayTrigger = `\`${trigger}\``;
            } else if (subcommand === 'add_user') {
                const user = interaction.options.getUser('user');
                trigger = user.id;
                matchType = 'user';
                displayTrigger = `${user}`;
            } else if (subcommand === 'add_channel') {
                const channel = interaction.options.getChannel('channel');
                trigger = channel.id;
                matchType = 'channel';
                displayTrigger = `${channel}`;
            }

            const { data: ar } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger).eq('match_type', matchType).single();
            
            if (!ar) {
                await supabase.from('auto_responses').insert([{ guild_id: guildId, trigger, react: emoji, match_type: matchType }]);
            } else {
                await supabase.from('auto_responses').update({ react: emoji }).eq('id', ar.id);
            }

            const { data: allResponses } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId);
            updateCache(interaction.client, guildId, allResponses || []);

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`<:tick:1517479233784643634> Auto-reaction added for ${displayTrigger} with ${emoji}.`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            const trigger = interaction.options.getString('trigger_or_id').toLowerCase();
            const { data: arList } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger);
            
            if (arList && arList.length > 0) {
                for (const ar of arList) {
                    if (!ar.reply) {
                        await supabase.from('auto_responses').delete().eq('id', ar.id);
                    } else {
                        await supabase.from('auto_responses').update({ react: null }).eq('id', ar.id);
                    }
                }
            }

            const { data: allResponses } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId);
            updateCache(interaction.client, guildId, allResponses || []);

            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`<:tick:1517479233784643634> Removed auto-reaction for \`${trigger}\`.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('You do not have permission to use this command.');
        const subcommand = args[0]?.toLowerCase();
        if (!['user', 'channel', 'text', 'remove'].includes(subcommand)) return message.reply('Please specify a subcommand: `user`, `channel`, `text`, or `remove`.');

        const guildId = message.guild.id;

        if (['user', 'channel', 'text'].includes(subcommand)) {
            let target, emoji, trigger, matchType, displayTrigger;

            if (subcommand === 'text') {
                if (args.length < 3) return message.reply('Usage: `autoreact text <phrase> <emoji>`');
                emoji = args[args.length - 1];
                target = args.slice(1, -1).join(' ').toLowerCase();
                
                // Remove surrounding quotes if present
                trigger = target.replace(/^["']|["']$/g, '');
                matchType = 'exact';
                displayTrigger = `\`${trigger}\``;
            } else {
                target = args[1]?.toLowerCase();
                emoji = args[2];
                if (!target) return message.reply('Please specify the target (user mention/ID or channel mention/ID).');
                if (!emoji) return message.reply('Please specify an emoji.');

                if (subcommand === 'user') {
                    const user = message.mentions.users.first() || message.client.users.cache.get(target);
                    if (!user) return message.reply('Invalid user specified.');
                    trigger = user.id;
                    matchType = 'user';
                    displayTrigger = `${user}`;
                } else if (subcommand === 'channel') {
                    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(target);
                    if (!channel) return message.reply('Invalid channel specified.');
                    trigger = channel.id;
                    matchType = 'channel';
                    displayTrigger = `${channel}`;
                }
            }

            const { data: ar } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).eq('trigger', trigger).eq('match_type', matchType).single();
            if (!ar) {
                await supabase.from('auto_responses').insert([{ guild_id: guildId, trigger, react: emoji, match_type: matchType }]);
            } else {
                await supabase.from('auto_responses').update({ react: emoji }).eq('id', ar.id);
            }

            const { data: allResponses } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId);
            updateCache(message.client, guildId, allResponses || []);

            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`<:tick:1517479233784643634> Auto-reaction added for ${displayTrigger} with ${emoji}.`);
            await message.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            const trigger = args[1]?.toLowerCase();
            if (!trigger) return message.reply('Please specify the trigger or ID to remove.');

            const cleanTrigger = trigger.replace(/[<@#!>]/g, '');

            const { data: arList } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId).or(`trigger.eq.${trigger},trigger.eq.${cleanTrigger}`);
            
            if (arList && arList.length > 0) {
                for (const ar of arList) {
                    if (!ar.reply) {
                        await supabase.from('auto_responses').delete().eq('id', ar.id);
                    } else {
                        await supabase.from('auto_responses').update({ react: null }).eq('id', ar.id);
                    }
                }
            }

            const { data: allResponses } = await supabase.from('auto_responses').select('*').eq('guild_id', guildId);
            updateCache(message.client, guildId, allResponses || []);

            const embed = new EmbedBuilder().setColor('#ff0000').setDescription(`<:tick:1517479233784643634> Removed auto-reaction for \`${trigger}\`.`);
            await message.reply({ embeds: [embed] });
        }
    }
};
