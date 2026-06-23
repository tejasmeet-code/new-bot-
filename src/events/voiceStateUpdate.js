const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        if (!oldState.guild) return;
        
        const member = newState.member;
        
        if (!oldState.channelId && newState.channelId) {
            // Joined
            sendLog(newState.guild, 'voice', {
                title: 'Joined Voice Channel',
                description: `**User:** ${member.user}\n**Channel:** ${newState.channel}`,
                color: '#00ff00'
            });
        } else if (oldState.channelId && !newState.channelId) {
            // Left
            sendLog(oldState.guild, 'voice', {
                title: 'Left Voice Channel',
                description: `**User:** ${member.user}\n**Channel:** ${oldState.channel}`,
                color: '#ff0000'
            });
        } else if (oldState.channelId !== newState.channelId) {
            // Switched
            sendLog(newState.guild, 'voice', {
                title: 'Switched Voice Channels',
                description: `**User:** ${member.user}\n**From:** ${oldState.channel}\n**To:** ${newState.channel}`,
                color: '#ffff00'
            });
        }
    },
};
