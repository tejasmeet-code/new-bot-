const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const Ticket = require('../schemas/Ticket');

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
                await handleCreateTicket(interaction);
            } else if (interaction.customId === 'close_ticket') {
                await handleCloseTicket(interaction);
            }
        }
    },
};

async function handleCreateTicket(interaction) {
    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config || !config.ticketConfig.categoryId) {
        return interaction.reply({ content: 'The ticket system is not fully configured yet.', ephemeral: true });
    }

    const category = interaction.guild.channels.cache.get(config.ticketConfig.categoryId);
    if (!category) {
        return interaction.reply({ content: 'The configured ticket category does not exist anymore.', ephemeral: true });
    }

    const existingTicket = await Ticket.findOne({ guildId: interaction.guild.id, ownerId: interaction.user.id, status: 'open' });
    if (existingTicket) {
        return interaction.reply({ content: `You already have an open ticket: <#${existingTicket.channelId}>`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

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

    if (config.ticketConfig.staffRoleId) {
        permissionOverwrites.push({
            id: config.ticketConfig.staffRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
    }

    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: permissionOverwrites
    });

    const newTicket = new Ticket({
        guildId: interaction.guild.id,
        channelId: ticketChannel.id,
        ownerId: interaction.user.id
    });
    await newTicket.save();

    const embed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`Welcome ${interaction.user}! A staff member will be with you shortly.`)
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
    const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
    if (!ticket) {
        return interaction.reply({ content: 'This is not a recognized ticket channel.', ephemeral: true });
    }

    await interaction.deferReply();
    
    // For this simple version, we'll just set it to closed and lock the channel for the user
    ticket.status = 'closed';
    await ticket.save();

    await interaction.channel.permissionOverwrites.edit(ticket.ownerId, {
        ViewChannel: false
    });

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setDescription('This ticket has been closed. It will be archived or deleted soon.');

    await interaction.editReply({ embeds: [embed] });
}
