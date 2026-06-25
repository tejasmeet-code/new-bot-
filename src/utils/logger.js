const supabase = require('../database/supabase');
const { EmbedBuilder } = require('discord.js');

async function sendLog(guild, type, embedOptions) {
    if (!guild) return;

    try {
        const { data: config } = await supabase.from('guild_config').select('*').eq('guild_id', guild.id).single();
        const columnName = `log_${type}`;

        if (!config || !config[columnName]) return;

        const channelId = config[columnName];
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
