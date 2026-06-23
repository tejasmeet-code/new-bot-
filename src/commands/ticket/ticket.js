const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const GuildConfig = require('../../schemas/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configure ticket settings')
                .addChannelOption(option => option.setName('category').setDescription('Category where tickets will be created').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addChannelOption(option => option.setName('transcript_channel').setDescription('Channel where transcripts will be sent').addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addRoleOption(option => option.setName('staff_role').setDescription('Role that can manage tickets').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Send the ticket creation panel')
                .addChannelOption(option => option.setName('channel').setDescription('Where to send the panel').addChannelTypes(ChannelType.GuildText).setRequired(false))
        )
        // Note: The rest of the commands (close, add, remove, claim) can be added as subcommands or handled via buttons/in-ticket commands.
        // For wick-like behavior, they are usually commands run inside the ticket.
        .addSubcommand(subcommand => subcommand.setName('close').setDescription('Close the current ticket'))
        .addSubcommand(subcommand => subcommand.setName('delete').setDescription('Delete the current ticket'))
        .addSubcommand(subcommand => subcommand.setName('reopen').setDescription('Reopen a closed ticket'))
        .addSubcommand(subcommand => subcommand.setName('claim').setDescription('Claim the ticket'))
        .addSubcommand(subcommand => subcommand.setName('unclaim').setDescription('Unclaim the ticket'))
        .addSubcommand(subcommand => subcommand.setName('transcript').setDescription('Generate a transcript for the ticket'))
        .addSubcommand(subcommand => 
            subcommand.setName('add')
            .setDescription('Add a user to the ticket')
            .addUserOption(option => option.setName('user').setDescription('User to add').setRequired(true))
        )
        .addSubcommand(subcommand => 
            subcommand.setName('remove')
            .setDescription('Remove a user from the ticket')
            .addUserOption(option => option.setName('user').setDescription('User to remove').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) config = new GuildConfig({ guildId: interaction.guild.id });

        if (subcommand === 'setup') {
            const category = interaction.options.getChannel('category');
            const transcriptChannel = interaction.options.getChannel('transcript_channel');
            const staffRole = interaction.options.getRole('staff_role');

            config.ticketConfig = {
                categoryId: category.id,
                transcriptChannelId: transcriptChannel.id,
                staffRoleId: staffRole ? staffRole.id : null
            };
            await config.save();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Ticket System Configured')
                .setDescription(`**Category:** ${category}\n**Transcripts:** ${transcriptChannel}\n**Staff Role:** ${staffRole ? staffRole : 'None'}`);
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'panel') {
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            if (!config.ticketConfig.categoryId) {
                return interaction.reply({ content: 'Please run `/ticket setup` first.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('Support Tickets')
                .setDescription('Click the button below to open a ticket.')
                .setColor('#2b2d31');

            const button = new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫');

            const row = new ActionRowBuilder().addComponents(button);

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `Panel sent to ${channel}.`, ephemeral: true });
        } else {
            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            if (!ticket) {
                return interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
            }

            if (subcommand === 'close') {
                ticket.status = 'closed';
                await ticket.save();
                await interaction.channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: false });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('Ticket closed.')] });
            } else if (subcommand === 'reopen') {
                ticket.status = 'open';
                await ticket.save();
                await interaction.channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: true });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription('Ticket reopened.')] });
            } else if (subcommand === 'delete') {
                await interaction.reply('Deleting ticket in 5 seconds...');
                setTimeout(() => interaction.channel.delete(), 5000);
            } else if (subcommand === 'claim') {
                ticket.claimedBy = interaction.user.id;
                await ticket.save();
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffff00').setDescription(`Ticket claimed by ${interaction.user}.`)] });
            } else if (subcommand === 'unclaim') {
                ticket.claimedBy = null;
                await ticket.save();
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffff00').setDescription('Ticket unclaimed.')] });
            } else if (subcommand === 'add') {
                const user = interaction.options.getUser('user');
                await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription(`${user} added to the ticket.`)] });
            } else if (subcommand === 'remove') {
                const user = interaction.options.getUser('user');
                await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription(`${user} removed from the ticket.`)] });
            } else if (subcommand === 'transcript') {
                await interaction.deferReply();
                const discordTranscripts = require('discord-html-transcripts');
                const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                    limit: -1, 
                    returnType: 'attachment',
                    filename: `transcript-${interaction.channel.name}.html`,
                    saveImages: true,
                    poweredBy: false
                });

                if (config.ticketConfig.transcriptChannelId) {
                    const tChannel = interaction.guild.channels.cache.get(config.ticketConfig.transcriptChannelId);
                    if (tChannel) {
                        await tChannel.send({
                            content: `Transcript for ticket \`${interaction.channel.name}\` (Owner: <@${ticket.ownerId}>)`,
                            files: [attachment]
                        });
                    }
                }
                
                await interaction.editReply({ content: 'Transcript generated!', files: [attachment] });
            }
        }
    },
};
