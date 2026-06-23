const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    logChannels: {
        moderation: { type: String, default: null },
        messages: { type: String, default: null },
        members: { type: String, default: null },
        roles: { type: String, default: null },
        channels: { type: String, default: null },
        voice: { type: String, default: null },
        automod: { type: String, default: null },
    },
    ticketConfig: {
        categoryId: { type: String, default: null },
        transcriptChannelId: { type: String, default: null },
        staffRoleId: { type: String, default: null }
    }
});

module.exports = model('GuildConfig', guildConfigSchema);
