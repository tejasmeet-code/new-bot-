const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configure the logging system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set a channel for a specific log category')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('The log category')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderation', value: 'log_moderation' },
                            { name: 'Messages', value: 'log_messages' },
                            { name: 'Members', value: 'log_members' },
                            { name: 'Roles', value: 'log_roles' },
                            { name: 'Channels', value: 'log_channels' },
                            { name: 'Voice', value: 'log_voice' },
                            { name: 'Automod', value: 'log_automod' }
                        )
                )
                .addChannelOption(option => option.setName('channel').setDescription('The channel to send logs to').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable logging for a specific category')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('The log category')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderation', value: 'log_moderation' },
                            { name: 'Messages', value: 'log_messages' },
                            { name: 'Members', value: 'log_members' },
                            { name: 'Roles', value: 'log_roles' },
                            { name: 'Channels', value: 'log_channels' },
                            { name: 'Voice', value: 'log_voice' },
                            { name: 'Automod', value: 'log_automod' },
                            { name: 'All', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show current logging configuration')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Ensure config exists
        let { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', guildId).single();
        if (!config) {
            await supabase.from('guild_config').insert([{ guild_id: guildId }]);
            config = { guild_id: guildId };
        }

        if (subcommand === 'setup') {
            const category = interaction.options.getString('category');
            const channel = interaction.options.getChannel('channel');

            await supabase.from('guild_config').update({ [category]: channel.id }).eq('guild_id', guildId);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`✅ Logs will now be sent to ${channel}.`);
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'disable') {
            const category = interaction.options.getString('category');
            
            if (category === 'all') {
                await supabase.from('guild_config').update({
                    log_moderation: null, log_messages: null, log_members: null, 
                    log_roles: null, log_channels: null, log_voice: null, log_automod: null
                }).eq('guild_id', guildId);
            } else {
                await supabase.from('guild_config').update({ [category]: null }).eq('guild_id', guildId);
            }

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`✅ Disabled logging for **${category}**.`);
            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'status') {
            const embed = new EmbedBuilder()
                .setTitle('Logging Configuration')
                .setColor('#2b2d31');

            const categories = ['log_moderation', 'log_messages', 'log_members', 'log_roles', 'log_channels', 'log_voice', 'log_automod'];
            let desc = '';
            categories.forEach(cat => {
                const channelId = config[cat];
                const cleanName = cat.replace('log_', '').charAt(0).toUpperCase() + cat.replace('log_', '').slice(1);
                desc += `**${cleanName}:** ${channelId ? `<#${channelId}>` : 'Disabled'}\n`;
            });
            
            embed.setDescription(desc || 'No logging configured.');
            await interaction.reply({ embeds: [embed] });
        }
    },
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('You do not have permission to use this command.');
        const subcommand = args[0]?.toLowerCase();
        if (!['setup', 'disable', 'status'].includes(subcommand)) return message.reply('Please specify a subcommand: `setup`, `disable`, `status`.');
        
        const guildId = message.guild.id;
        let { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', guildId).single();
        if (!config) {
            await supabase.from('guild_config').insert([{ guild_id: guildId }]);
            config = { guild_id: guildId };
        }

        if (subcommand === 'setup') {
            const category = args[1]?.toLowerCase();
            const validCategories = ['log_moderation', 'log_messages', 'log_members', 'log_roles', 'log_channels', 'log_voice', 'log_automod'];
            if (!validCategories.includes(category)) return message.reply('Invalid category. Valid categories: ' + validCategories.join(', '));
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply('Please mention a channel.');

            await supabase.from('guild_config').update({ [category]: channel.id }).eq('guild_id', guildId);
            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ Logs will now be sent to ${channel}.`);
            await message.reply({ embeds: [embed] });
        } else if (subcommand === 'disable') {
            const category = args[1]?.toLowerCase();
            const validCategories = ['log_moderation', 'log_messages', 'log_members', 'log_roles', 'log_channels', 'log_voice', 'log_automod', 'all'];
            if (!validCategories.includes(category)) return message.reply('Invalid category. Valid categories: ' + validCategories.join(', '));
            
            if (category === 'all') {
                await supabase.from('guild_config').update({
                    log_moderation: null, log_messages: null, log_members: null, 
                    log_roles: null, log_channels: null, log_voice: null, log_automod: null
                }).eq('guild_id', guildId);
            } else {
                await supabase.from('guild_config').update({ [category]: null }).eq('guild_id', guildId);
            }
            const embed = new EmbedBuilder().setColor('#00ff00').setDescription(`✅ Disabled logging for **${category}**.`);
            await message.reply({ embeds: [embed] });
        } else if (subcommand === 'status') {
            const embed = new EmbedBuilder().setTitle('Logging Configuration').setColor('#2b2d31');
            const categories = ['log_moderation', 'log_messages', 'log_members', 'log_roles', 'log_channels', 'log_voice', 'log_automod'];
            let desc = '';
            categories.forEach(cat => {
                const channelId = config[cat];
                const cleanName = cat.replace('log_', '').charAt(0).toUpperCase() + cat.replace('log_', '').slice(1);
                desc += `**${cleanName}:** ${channelId ? `<#${channelId}>` : 'Disabled'}\n`;
            });
            embed.setDescription(desc || 'No logging configured.');
            await message.reply({ embeds: [embed] });
        }
    }
};
