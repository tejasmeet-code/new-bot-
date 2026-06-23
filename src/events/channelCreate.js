const { Events, ChannelType } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return;
        sendLog(channel.guild, 'channels', {
            title: 'Channel Created',
            description: `**Channel:** ${channel} (${channel.id})\n**Type:** ${ChannelType[channel.type]}`,
            color: '#00ff00'
        });
    },
};
