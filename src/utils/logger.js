const GuildConfig = require('../schemas/GuildConfig');
const { EmbedBuilder } = require('discord.js');

async function sendLog(guild, type, embedOptions) {
    if (!guild) return;

    try {
        const config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config || !config.logChannels || !config.logChannels[type]) return;

        const channelId = config.logChannels[type];
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(embedOptions.color || '#2b2d31')
            .setTimestamp();

        if (embedOptions.title) embed.setTitle(embedOptions.title);
        if (embedOptions.description) embed.setDescription(embedOptions.description);
        if (embedOptions.fields) embed.addFields(embedOptions.fields);
        if (embedOptions.author) embed.setAuthor(embedOptions.author);
        if (embedOptions.thumbnail) embed.setThumbnail(embedOptions.thumbnail);

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send log for ${type}:`, error);
    }
}

module.exports = { sendLog };
