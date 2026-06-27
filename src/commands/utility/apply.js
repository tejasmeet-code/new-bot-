const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const supabase = require('../../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Manage the staff applications system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the application panel')
                .addChannelOption(option =>
                    option.setName('panel_channel')
                        .setDescription('The channel to send the application panel to')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
                .addChannelOption(option =>
                    option.setName('approval_channel')
                        .setDescription('The channel where completed applications will be sent for review')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'setup') {
            const panelChannel = interaction.options.getChannel('panel_channel');
            const approvalChannel = interaction.options.getChannel('approval_channel');
            
            await this.handleSetup(interaction, panelChannel, approvalChannel);
        }
    },

    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'setup') {
            const panelChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]?.replace(/[<#>]/g, ''));
            const approvalChannel = message.mentions.channels.at(1) || message.guild.channels.cache.get(args[2]?.replace(/[<#>]/g, ''));

            if (!panelChannel || !approvalChannel) {
                return message.reply('Usage: `$apply setup <#panel_channel> <#approval_channel>`');
            }

            // We need a dummy interaction-like object to use handleSetup
            const context = {
                guild: message.guild,
                reply: async (data) => message.reply(data)
            };
            await this.handleSetup(context, panelChannel, approvalChannel);
        } else {
            return message.reply('Usage: `$apply setup <#panel_channel> <#approval_channel>`');
        }
    },

    async handleSetup(context, panelChannel, approvalChannel) {
        const guildId = context.guild.id;

        // Save approval channel to db
        const { data: existingConfig } = await supabase.from('guild_config').select('*').eq('guild_id', guildId).single();
        if (existingConfig) {
            await supabase.from('guild_config').update({ staff_app_channel_id: approvalChannel.id }).eq('guild_id', guildId);
        } else {
            await supabase.from('guild_config').insert([{ guild_id: guildId, staff_app_channel_id: approvalChannel.id }]);
        }

        // Send panel to panelChannel
        const embed = new EmbedBuilder()
            .setTitle('Staff Application')
            .setColor('#2b2d31')
            .setDescription(`Hello everyone! 👋\n\nWe are looking for active and responsible members to join the Staff Team as Moderators.\n\n🔹 **Requirements:**\n• Must be active in the server\n• Be respectful and mature\n• Good communication with members\n• Basic knowledge of Discord moderation\n\n📝 **How to Apply:**\nFill out the Moderator Application form and answer all questions honestly.\n\n⚠️ **Note:**\nApplying does not guarantee selection. Staff will review all applications carefully.\n\nGood luck to everyone applying! 🚀`);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_application')
                    .setLabel('Start Application')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Primary)
            );

        await panelChannel.send({ embeds: [embed], components: [row] });

        if (context.reply) {
            await context.reply({ content: `✅ Application panel sent to ${panelChannel} and approval channel set to ${approvalChannel}.`, ephemeral: true });
        }
    }
};
