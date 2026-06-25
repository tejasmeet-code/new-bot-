const { Events } = require('discord.js');
const supabase = require('../database/supabase');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        try {
            const { data: noPrefixUsers } = await supabase.from('user_config').select('user_id').eq('no_prefix', true);
            if (noPrefixUsers) {
                for (const user of noPrefixUsers) {
                    client.noPrefixUsers.add(user.user_id);
                }
                console.log(`Loaded ${client.noPrefixUsers.size} no-prefix users into cache.`);
            }

            // Load AFK Users
            const { data: afkUsers } = await supabase.from('afk_users').select('*');
            client.afkUsers = new Map();
            if (afkUsers) {
                for (const user of afkUsers) {
                    client.afkUsers.set(user.user_id, { reason: user.reason, timestamp: user.timestamp });
                }
                console.log(`Loaded ${client.afkUsers.size} AFK users into cache.`);
            }
        } catch (e) {
            console.error('Failed to load user config or AFK data:', e);
        }

        try {
            const { data: responses } = await supabase.from('auto_responses').select('*');
            client.autoResponses = new Map();
            if (responses) {
                for (const ar of responses) {
                    if (!client.autoResponses.has(ar.guild_id)) {
                        client.autoResponses.set(ar.guild_id, []);
                    }
                    client.autoResponses.get(ar.guild_id).push(ar);
                }
                console.log(`Loaded ${responses.length} auto-responses into cache.`);
            }
        } catch (e) {
            console.error('Failed to load auto-responses:', e);
        }
    },
};
