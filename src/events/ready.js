const { Events } = require('discord.js');
const UserConfig = require('../schemas/UserConfig');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        try {
            const noPrefixUsers = await UserConfig.find({ noPrefix: true });
            for (const user of noPrefixUsers) {
                client.noPrefixUsers.add(user.userId);
            }
            console.log(`Loaded ${client.noPrefixUsers.size} no-prefix users into cache.`);
        } catch (e) {
            console.error('Failed to load no-prefix users:', e);
        }
    },
};
