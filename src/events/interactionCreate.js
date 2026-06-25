const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const msg = { content: 'There was an error while executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg);
                } else {
                    await interaction.reply(msg);
                }
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'create_ticket') {
                const modal = new ModalBuilder()
                    .setCustomId('ticket_modal')
                    .setTitle('Create a Ticket');

                const subjectInput = new TextInputBuilder()
                    .setCustomId('ticket_subject')
                    .setLabel("Ticket Subject")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel("Reason for Ticket")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000);

                const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
                const secondActionRow = new ActionRowBuilder().addComponents(reasonInput);

                modal.addComponents(firstActionRow, secondActionRow);

                await interaction.showModal(modal);
            } else if (interaction.customId === 'close_ticket') {
                await handleCloseTicket(interaction);
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'ticket_modal') {
                await handleCreateTicket(interaction);
            }
        }
    },
};

async function handleCreateTicket(interaction) {
    const guildId = interaction.guild.id;
    const { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', guildId).single();
    
    if (!config || !config.ticket_category_id) {
        return interaction.reply({ content: 'The ticket system is not fully configured yet.', ephemeral: true });
    }

    const category = interaction.guild.channels.cache.get(config.ticket_category_id);
    if (!category) {
        return interaction.reply({ content: 'The configured ticket category does not exist anymore.', ephemeral: true });
    }

    const { data: existingTicket } = await supabase.from('tickets').select('*').eq('guild_id', guildId).eq('owner_id', interaction.user.id).eq('status', 'open').single();
    if (existingTicket) {
        return interaction.reply({ content: `You already have an open ticket: <#${existingTicket.channel_id}>`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    let subject = 'No Subject';
    let reason = 'No Reason Provided';
    if (interaction.isModalSubmit()) {
        subject = interaction.fields.getTextInputValue('ticket_subject');
        reason = interaction.fields.getTextInputValue('ticket_reason');
    }

    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        }
    ];

    if (config.ticket_staff_role_id) {
        permissionOverwrites.push({
            id: config.ticket_staff_role_id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
    }

    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: permissionOverwrites
    });

    await supabase.from('tickets').insert([{
        guild_id: guildId,
        channel_id: ticketChannel.id,
        owner_id: interaction.user.id
    }]);

    const embed = new EmbedBuilder()
        .setTitle(`Ticket: ${subject}`)
        .setDescription(`Welcome ${interaction.user}! A staff member will be with you shortly.\n\n**Reason:**\n${reason}`)
        .setColor('#2b2d31');

    const closeBtn = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });
}

async function handleCloseTicket(interaction) {
    const { data: ticket } = await supabase.from('tickets').select('*').eq('channel_id', interaction.channel.id).single();
    if (!ticket) {
        return interaction.reply({ content: 'This is not a recognized ticket channel.', ephemeral: true });
    }

    await interaction.deferReply();
    
    await supabase.from('tickets').update({ status: 'closed' }).eq('channel_id', interaction.channel.id);

    await interaction.channel.permissionOverwrites.edit(ticket.owner_id, {
        ViewChannel: false
    });

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setDescription('This ticket has been closed. It will be archived or deleted soon.');

    await interaction.editReply({ embeds: [embed] });
}
