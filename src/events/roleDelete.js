const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        sendLog(role.guild, 'roles', {
            title: 'Role Deleted',
            description: `**Role Name:** ${role.name} (${role.id})`,
            color: '#ff0000'
        });
    },
};
