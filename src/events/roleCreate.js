const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        sendLog(role.guild, 'roles', {
            title: 'Role Created',
            description: `**Role:** ${role} (${role.id})`,
            color: '#00ff00'
        });
    },
};
