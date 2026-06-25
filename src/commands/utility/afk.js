const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../../database/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your AFK status')
        .addStringOption(option => 
            option.setName('reason')
            .setDescription('Reason for being AFK')
            .setRequired(false)),
            
    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'AFK';
        await setAfk(interaction.user.id, reason, interaction);
    },

    async executeText(message, args) {
        const reason = args.length > 0 ? args.join(' ') : 'AFK';
        await setAfk(message.author.id, reason, message);
    }
};

async function setAfk(userId, reason, context) {
    const timestamp = new Date().toISOString();
    
    try {
        await supabase.from('afk_users').upsert({ user_id: userId, reason: reason, timestamp: timestamp });
        
        // Update cache
        if (!context.client.afkUsers) context.client.afkUsers = new Map();
        context.client.afkUsers.set(userId, { reason, timestamp });

        // Change nickname
        try {
            const member = context.member || await context.guild.members.fetch(userId);
            if (member && member.manageable) {
                let currentNick = member.displayName;
                if (!currentNick.startsWith('[AFK]')) {
                    const newNick = `[AFK] ${currentNick}`.slice(0, 32);
                    await member.setNickname(newNick);
                }
            }
        } catch (e) {
            console.error('Failed to change nickname:', e);
        }

        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setDescription(`<:tick:1517479233784643634> You are now AFK: **${reason}**`);
            
        await context.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error setting AFK:', error);
        await context.reply('There was an error setting your AFK status. Please ensure the database is setup correctly.').catch(() => {});
    }
}
