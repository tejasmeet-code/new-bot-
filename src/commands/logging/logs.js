const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../schemas/GuildConfig');

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
                            { name: 'Moderation', value: 'moderation' },
                            { name: 'Messages', value: 'messages' },
                            { name: 'Members', value: 'members' },
                            { name: 'Roles', value: 'roles' },
                            { name: 'Channels', value: 'channels' },
                            { name: 'Voice', value: 'voice' },
                            { name: 'Automod', value: 'automod' }
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
                            { name: 'Moderation', value: 'moderation' },
                            { name: 'Messages', value: 'messages' },
                            { name: 'Members', value: 'members' },
                            { name: 'Roles', value: 'roles' },
                            { name: 'Channels', value: 'channels' },
                            { name: 'Voice', value: 'voice' },
                            { name: 'Automod', value: 'automod' },
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
        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) config = new GuildConfig({ guildId: interaction.guild.id });

        if (subcommand === 'setup') {
            const category = interaction.options.getString('category');
            const channel = interaction.options.getChannel('channel');

            config.logChannels[category] = channel.id;
            await config.save();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`✅ **${category}** logs will now be sent to ${channel}.`);
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'disable') {
            const category = interaction.options.getString('category');
            
            if (category === 'all') {
                config.logChannels = {
                    moderation: null, messages: null, members: null, 
                    roles: null, channels: null, voice: null, automod: null
                };
            } else {
                config.logChannels[category] = null;
            }
            await config.save();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`✅ Disabled logging for **${category}**.`);
            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'status') {
            const embed = new EmbedBuilder()
                .setTitle('Logging Configuration')
                .setColor('#2b2d31');

            const categories = ['moderation', 'messages', 'members', 'roles', 'channels', 'voice', 'automod'];
            let desc = '';
            categories.forEach(cat => {
                const channelId = config.logChannels[cat];
                desc += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}:** ${channelId ? `<#${channelId}>` : 'Disabled'}\n`;
            });
            
            embed.setDescription(desc || 'No logging configured.');
            await interaction.reply({ embeds: [embed] });
        }
    },
};
