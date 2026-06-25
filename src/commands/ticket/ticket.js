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
                .addStringOption(option => option.setName('title').setDescription('Panel title').setRequired(false))
                .addStringOption(option => option.setName('description').setDescription('Panel description').setRequired(false))
                .addStringOption(option => option.setName('button_label').setDescription('Button label').setRequired(false))
                .addStringOption(option => option.setName('button_emoji').setDescription('Button emoji').setRequired(false))
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

            await supabase.from('guild_config').upsert({
                guild_id: guildId,
                ticket_category_id: category.id,
                ticket_transcript_channel_id: transcriptChannel.id,
                ticket_staff_role_id: staffRole ? staffRole.id : null
            });

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

            const title = interaction.options.getString('title') || 'Support Tickets';
            const description = interaction.options.getString('description') || 'Click the button below to open a ticket.';
            const buttonLabel = interaction.options.getString('button_label') || 'Create Ticket';
            const buttonEmoji = interaction.options.getString('button_emoji') || '🎫';

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description.replace(/\\n/g, '\n'))
                .setColor('#2b2d31');

            const button = new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel(buttonLabel)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(buttonEmoji);

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
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('You do not have permission to use this command.');
        const subcommand = args[0]?.toLowerCase();
        const validCommands = ['setup', 'panel', 'close', 'delete', 'reopen', 'claim', 'unclaim', 'transcript', 'add', 'remove'];
        if (!validCommands.includes(subcommand)) return message.reply(`Valid subcommands: ${validCommands.join(', ')}`);

        const guildId = message.guild.id;
        let { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', guildId).single();
        if (!config) {
            await supabase.from('guild_config').insert([{ guild_id: guildId }]);
            config = { guild_id: guildId };
        }

        if (subcommand === 'setup') {
            const categoryId = args[1]; 
            const transcriptChannel = message.mentions.channels.first();
            const staffRole = message.mentions.roles.first();
            if (!categoryId || !transcriptChannel) return message.reply('Usage: `$ticket setup <category_id> <#transcript_channel> [@staff_role]`');

            await supabase.from('guild_config').upsert({
                guild_id: guildId,
                ticket_category_id: categoryId,
                ticket_transcript_channel_id: transcriptChannel.id,
                ticket_staff_role_id: staffRole ? staffRole.id : null
            });

            const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Ticket System Configured').setDescription(`**Category:** ${categoryId}\n**Transcripts:** ${transcriptChannel}\n**Staff Role:** ${staffRole ? staffRole : 'None'}`);
            await message.reply({ embeds: [embed] });
        } else if (subcommand === 'panel') {
            const channel = message.mentions.channels.first() || message.channel;
            if (!config.ticket_category_id) return message.reply('Please run setup first.');

            const matches = message.content.match(/"([^"]+)"/g);
            let title = 'Support Tickets';
            let description = 'Click the button below to open a ticket.';
            let buttonLabel = 'Create Ticket';
            let buttonEmoji = '🎫';

            if (matches && matches.length >= 1) title = matches[0].replace(/"/g, '');
            if (matches && matches.length >= 2) description = matches[1].replace(/"/g, '');
            if (matches && matches.length >= 3) buttonLabel = matches[2].replace(/"/g, '');
            if (matches && matches.length >= 4) buttonEmoji = matches[3].replace(/"/g, '');

            const embed = new EmbedBuilder().setTitle(title).setDescription(description.replace(/\\n/g, '\n')).setColor('#2b2d31');
            let button;
            try {
                button = new ButtonBuilder().setCustomId('create_ticket').setLabel(buttonLabel).setStyle(ButtonStyle.Primary).setEmoji(buttonEmoji);
            } catch (e) {
                // Fallback if emoji is invalid
                button = new ButtonBuilder().setCustomId('create_ticket').setLabel(buttonLabel).setStyle(ButtonStyle.Primary).setEmoji('🎫');
            }
            const row = new ActionRowBuilder().addComponents(button);
            await channel.send({ embeds: [embed], components: [row] });
            await message.reply('Panel sent.');
        } else {
            const { data: ticket } = await supabase.from('tickets').select('*').eq('channel_id', message.channel.id).single();
            if (!ticket) return message.reply('This command can only be used inside a ticket channel.');

            if (subcommand === 'close') {
                await supabase.from('tickets').update({ status: 'closed' }).eq('channel_id', message.channel.id);
                await message.channel.permissionOverwrites.edit(ticket.owner_id, { ViewChannel: false });
                await message.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('Ticket closed.')] });
            } else if (subcommand === 'reopen') {
                await supabase.from('tickets').update({ status: 'open' }).eq('channel_id', message.channel.id);
                await message.channel.permissionOverwrites.edit(ticket.owner_id, { ViewChannel: true });
                await message.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription('Ticket reopened.')] });
            } else if (subcommand === 'delete') {
                await supabase.from('tickets').delete().eq('channel_id', message.channel.id);
                await message.reply('Deleting ticket in 5 seconds...');
                setTimeout(() => message.channel.delete(), 5000);
            } else if (subcommand === 'claim') {
                await supabase.from('tickets').update({ claimed_by: message.author.id }).eq('channel_id', message.channel.id);
                await message.reply({ embeds: [new EmbedBuilder().setColor('#ffff00').setDescription(`Ticket claimed by ${message.author}.`)] });
            } else if (subcommand === 'unclaim') {
                await supabase.from('tickets').update({ claimed_by: null }).eq('channel_id', message.channel.id);
                await message.reply({ embeds: [new EmbedBuilder().setColor('#ffff00').setDescription('Ticket unclaimed.')] });
            } else if (subcommand === 'add') {
                const targetId = args[1] ? args[1].replace(/[<@!>]/g, '') : null;
                const user = message.mentions.users.first() || (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);
                if (!user) return message.reply('<:failure:1517469374594945134> Please mention a user or provide their ID.');
                await message.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await message.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription(`${user} added to the ticket.`)] });
            } else if (subcommand === 'remove') {
                const targetId = args[1] ? args[1].replace(/[<@!>]/g, '') : null;
                const user = message.mentions.users.first() || (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);
                if (!user) return message.reply('<:failure:1517469374594945134> Please mention a user or provide their ID.');
                await message.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
                await message.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription(`${user} removed from the ticket.`)] });
            } else if (subcommand === 'transcript') {
                const reply = await message.reply('Generating transcript...');
                const discordTranscripts = require('discord-html-transcripts');
                const attachment = await discordTranscripts.createTranscript(message.channel, {
                    limit: -1, 
                    returnType: 'attachment',
                    filename: `transcript-${message.channel.name}.html`,
                    saveImages: true,
                    poweredBy: false
                });

                if (config.ticket_transcript_channel_id) {
                    const tChannel = message.guild.channels.cache.get(config.ticket_transcript_channel_id);
                    if (tChannel) {
                        await tChannel.send({
                            content: `Transcript for ticket \`${message.channel.name}\` (Owner: <@${ticket.owner_id}>)`,
                            files: [attachment]
                        });
                    }
                }
                await reply.edit({ content: 'Transcript generated!', files: [attachment] });
            }
        }
    }
};
