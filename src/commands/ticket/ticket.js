const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const supabase = require('../../database/supabase');

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
        const guildId = interaction.guild.id;

        let { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', guildId).single();
        if (!config) {
            await supabase.from('guild_config').insert([{ guild_id: guildId }]);
            config = { guild_id: guildId };
        }

        if (subcommand === 'setup') {
            const category = interaction.options.getChannel('category');
            const transcriptChannel = interaction.options.getChannel('transcript_channel');
            const staffRole = interaction.options.getRole('staff_role');

            await supabase.from('guild_config').update({
                ticket_category_id: category.id,
                ticket_transcript_channel_id: transcriptChannel.id,
                ticket_staff_role_id: staffRole ? staffRole.id : null
            }).eq('guild_id', guildId);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Ticket System Configured')
                .setDescription(`**Category:** ${category}\n**Transcripts:** ${transcriptChannel}\n**Staff Role:** ${staffRole ? staffRole : 'None'}`);
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'panel') {
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            if (!config.ticket_category_id) {
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
            const { data: ticket } = await supabase.from('tickets').select('*').eq('channel_id', interaction.channel.id).single();
            if (!ticket) {
                return interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
            }

            if (subcommand === 'close') {
                await supabase.from('tickets').update({ status: 'closed' }).eq('channel_id', interaction.channel.id);
                await interaction.channel.permissionOverwrites.edit(ticket.owner_id, { ViewChannel: false });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('Ticket closed.')] });
            } else if (subcommand === 'reopen') {
                await supabase.from('tickets').update({ status: 'open' }).eq('channel_id', interaction.channel.id);
                await interaction.channel.permissionOverwrites.edit(ticket.owner_id, { ViewChannel: true });
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription('Ticket reopened.')] });
            } else if (subcommand === 'delete') {
                await supabase.from('tickets').delete().eq('channel_id', interaction.channel.id);
                await interaction.reply('Deleting ticket in 5 seconds...');
                setTimeout(() => interaction.channel.delete(), 5000);
            } else if (subcommand === 'claim') {
                await supabase.from('tickets').update({ claimed_by: interaction.user.id }).eq('channel_id', interaction.channel.id);
                await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffff00').setDescription(`Ticket claimed by ${interaction.user}.`)] });
            } else if (subcommand === 'unclaim') {
                await supabase.from('tickets').update({ claimed_by: null }).eq('channel_id', interaction.channel.id);
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

                if (config.ticket_transcript_channel_id) {
                    const tChannel = interaction.guild.channels.cache.get(config.ticket_transcript_channel_id);
                    if (tChannel) {
                        await tChannel.send({
                            content: `Transcript for ticket \`${interaction.channel.name}\` (Owner: <@${ticket.owner_id}>)`,
                            files: [attachment]
                        });
                    }
                }
                
                await interaction.editReply({ content: 'Transcript generated!', files: [attachment] });
            }
        }
    },
};
