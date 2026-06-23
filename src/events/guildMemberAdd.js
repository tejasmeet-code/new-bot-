const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        sendLog(member.guild, 'members', {
            title: 'Member Joined',
            description: `**User:** ${member.user} (${member.user.id})\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            color: '#00ff00',
            thumbnail: member.user.displayAvatarURL()
        });
    },
};
