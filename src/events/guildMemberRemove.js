const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        sendLog(member.guild, 'members', {
            title: 'Member Left',
            description: `**User:** ${member.user} (${member.user.id})`,
            color: '#ff0000',
            thumbnail: member.user.displayAvatarURL()
        });
    },
};
