const { Events } = require('discord.js');
const supabase = require('../../database/supabase');

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
        } catch (e) {
            console.error('Failed to load no-prefix users:', e);
        }
    },
};
