const { Events, ChannelType } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return;
        sendLog(channel.guild, 'channels', {
            title: 'Channel Deleted',
            description: `**Channel Name:** ${channel.name} (${channel.id})\n**Type:** ${ChannelType[channel.type]}`,
            color: '#ff0000'
        });
    },
};
