const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        sendLog(oldMessage.guild, 'messages', {
            title: 'Message Edited',
            description: `**Author:** ${oldMessage.author}\n**Channel:** ${oldMessage.channel}\n**Before:** ${oldMessage.content || '[No Content]'}\n**After:** ${newMessage.content || '[No Content]'}`,
            color: '#ffff00'
        });
    },
};
