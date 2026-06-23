const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;

        sendLog(message.guild, 'messages', {
            title: 'Message Deleted',
            description: `**Author:** ${message.author}\n**Channel:** ${message.channel}\n**Content:** ${message.content || '[No Content/Embed]'}`,
            color: '#ff0000'
        });
    },
};
