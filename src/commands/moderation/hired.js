const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

async function handleHired(guild, member) {
    const role1 = '1121825738111336528';
    const role2 = '1121825728741244938';

    try {
        await member.roles.add([role1, role2]);
        
        const dmEmbed = new EmbedBuilder()
            .setTitle('Congratulations! 🎉')
            .setDescription(`You have been hired as Staff in **${guild.name}**!\nPlease read the staff guidelines and enjoy your new position!`)
            .setColor('#00ff00')
            .setFooter({ text: 'Welcome to the team!' });
            
        await member.send({ embeds: [dmEmbed] }).catch(() => {});
        return true;
    } catch (error) {
        console.error('Error hiring user:', error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hired')
        .setDescription('Hire a user as staff')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to hire')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: '<:failure:1517469374594945134> User not found in this server.', ephemeral: true });
        }

        await interaction.deferReply();
        const success = await handleHired(interaction.guild, member);
        
        if (success) {
            await interaction.editReply({ content: `<:tick:1517479233784643634> Successfully hired ${targetUser} and assigned staff roles!` });
        } else {
            await interaction.editReply({ content: `<:failure:1517469374594945134> Failed to assign roles. Check my permissions and role hierarchy.` });
        }
    },

    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<:failure:1517469374594945134> You do not have permission to use this command.');
        }

        const targetArg = args[0];
        if (!targetArg) {
            return message.reply('Usage: `$hired <@user|userID>`');
        }

        const targetId = targetArg.replace(/[<@!>]/g, '');
        const member = await message.guild.members.fetch(targetId).catch(() => null);

        if (!member) {
            return message.reply('<:failure:1517469374594945134> User not found in this server.');
        }

        const success = await handleHired(message.guild, member);
        
        if (success) {
            await message.reply(`<:tick:1517479233784643634> Successfully hired ${member.user} and assigned staff roles!`);
        } else {
            await message.reply(`<:failure:1517469374594945134> Failed to assign roles. Check my permissions and role hierarchy.`);
        }
    },

    handleHired
};
